import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Community } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommunityDto } from './dto/create-community.dto';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(creatorId: string, dto: CreateCommunityDto): Promise<Community> {
    const slug = slugify(dto.name);
    if (!slug) {
      throw new ConflictException(
        'Community name must contain at least one letter or number.',
      );
    }

    const existing = await this.prisma.community.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) {
      throw new ConflictException('A community with that name already exists.');
    }

    const community = await this.prisma.community.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        createdById: creatorId,
        memberships: { create: { userId: creatorId } },
        chatRooms: { create: { name: 'general' } },
      },
    });

    return community;
  }

  findAll(): Promise<Community[]> {
    return this.prisma.community.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findByIdOrThrow(communityId: string): Promise<Community> {
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
    });
    if (!community) {
      throw new NotFoundException('Community not found.');
    }
    return community;
  }

  async isMember(userId: string, communityId: string): Promise<boolean> {
    const membership = await this.prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });
    return membership !== null;
  }

  async assertMember(userId: string, communityId: string): Promise<void> {
    if (!(await this.isMember(userId, communityId))) {
      throw new ForbiddenException('You must join this community to do that.');
    }
  }

  async join(userId: string, communityId: string): Promise<void> {
    await this.findByIdOrThrow(communityId);
    await this.prisma.communityMembership.upsert({
      where: { userId_communityId: { userId, communityId } },
      create: { userId, communityId },
      update: {},
    });
  }

  async leave(userId: string, communityId: string): Promise<void> {
    await this.prisma.communityMembership.deleteMany({
      where: { userId, communityId },
    });
  }
}
