import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ModerationStatus } from '@prisma/client';
import { CommunitiesService } from '../communities/communities.service';
import { ModerationService } from '../moderation/moderation.service';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from './posts.service';

describe('PostsService — community membership gating', () => {
  let postsService: PostsService;
  let communitiesService: {
    findByIdOrThrow: jest.Mock;
    assertMember: jest.Mock;
    isMember: jest.Mock;
  };
  let prisma: {
    post: { create: jest.Mock; findUnique: jest.Mock };
    postVote: { upsert: jest.Mock };
  };

  beforeEach(async () => {
    communitiesService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: 'community-1' }),
      assertMember: jest.fn(),
      isMember: jest.fn(),
    };
    prisma = {
      post: {
        create: jest.fn().mockResolvedValue({ id: 'post-1' }),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'post-1', communityId: 'community-1' }),
      },
      postVote: { upsert: jest.fn() },
    };
    const moderationService = {
      scoreContent: jest.fn().mockResolvedValue({
        toxicityScore: 0,
        moderationStatus: ModerationStatus.APPROVED,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CommunitiesService, useValue: communitiesService },
        { provide: ModerationService, useValue: moderationService },
      ],
    }).compile();

    postsService = module.get(PostsService);
  });

  it('blocks a non-member from posting in a community', async () => {
    communitiesService.assertMember.mockRejectedValue(
      new ForbiddenException('You must join this community to do that.'),
    );

    await expect(
      postsService.create('community-1', 'user-1', { body: 'hello' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  it('allows a member to post in a community', async () => {
    communitiesService.assertMember.mockResolvedValue(undefined);

    await postsService.create('community-1', 'user-1', { body: 'hello' });

    expect(prisma.post.create).toHaveBeenCalled();
  });

  it('blocks voting from a user who is not a member of the post community', async () => {
    communitiesService.isMember.mockResolvedValue(false);

    await expect(
      postsService.vote('post-1', 'user-1', 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.postVote.upsert).not.toHaveBeenCalled();
  });
});
