import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModerationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommunitiesService } from '../communities/communities.service';
import { ModerationService } from '../moderation/moderation.service';
import { CreatePostDto } from './dto/create-post.dto';

export interface PostWithScore {
  id: string;
  communityId: string;
  authorId: string;
  authorUsername: string;
  body: string;
  imageUrl: string | null;
  createdAt: Date;
  score: number;
  myVote: number;
  moderationStatus: ModerationStatus;
}

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communitiesService: CommunitiesService,
    private readonly moderationService: ModerationService,
  ) {}

  async create(communityId: string, authorId: string, dto: CreatePostDto) {
    await this.communitiesService.findByIdOrThrow(communityId);
    await this.communitiesService.assertMember(authorId, communityId);

    const { toxicityScore, moderationStatus } =
      await this.moderationService.scoreContent(dto.body);

    return this.prisma.post.create({
      data: {
        communityId,
        authorId,
        body: dto.body,
        imageUrl: dto.imageUrl,
        toxicityScore,
        moderationStatus,
      },
    });
  }

  async findAllForCommunity(
    communityId: string,
    requesterId: string,
  ): Promise<PostWithScore[]> {
    await this.communitiesService.findByIdOrThrow(communityId);
    await this.communitiesService.assertMember(requesterId, communityId);

    const posts = await this.prisma.post.findMany({
      where: {
        communityId,
        OR: [
          { moderationStatus: ModerationStatus.APPROVED },
          { authorId: requesterId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { username: true } }, votes: true },
    });

    return posts.map((post) => ({
      id: post.id,
      communityId: post.communityId,
      authorId: post.authorId,
      authorUsername: post.author.username,
      body: post.body,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      score: post.votes.reduce((sum, vote) => sum + vote.value, 0),
      myVote:
        post.votes.find((vote) => vote.userId === requesterId)?.value ?? 0,
      moderationStatus: post.moderationStatus,
    }));
  }

  private async getPostOrThrow(postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException('Post not found.');
    }
    return post;
  }

  async vote(postId: string, userId: string, value: 1 | -1): Promise<void> {
    const post = await this.getPostOrThrow(postId);
    const isMember = await this.communitiesService.isMember(
      userId,
      post.communityId,
    );
    if (!isMember) {
      throw new ForbiddenException(
        'You must join this community to vote on its posts.',
      );
    }

    await this.prisma.postVote.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, value },
      update: { value },
    });
  }

  async removeVote(postId: string, userId: string): Promise<void> {
    await this.getPostOrThrow(postId);
    await this.prisma.postVote.deleteMany({ where: { postId, userId } });
  }
}
