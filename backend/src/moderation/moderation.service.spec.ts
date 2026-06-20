import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContentType,
  ModerationActionType,
  ModerationStatus,
  ReportStatus,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiModerationClient } from './ai-moderation-client.service';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  let moderationService: ModerationService;
  let aiClient: { score: jest.Mock };
  let prisma: {
    post: { findUnique: jest.Mock; update: jest.Mock };
    report: { findUnique: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
    moderationAction: { create: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    aiClient = { score: jest.fn() };
    prisma = {
      post: { findUnique: jest.fn(), update: jest.fn() },
      report: {
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      moderationAction: { create: jest.fn() },
      user: { findUnique: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AiModerationClient, useValue: aiClient },
      ],
    }).compile();

    moderationService = module.get(ModerationService);
  });

  describe('scoreContent — defense in depth', () => {
    it('flags content the profanity filter catches even if the AI model disagrees', async () => {
      aiClient.score.mockResolvedValue({ toxicityScore: 0.1, flagged: false });

      const result = await moderationService.scoreContent(
        'You are a fucking idiot.',
      );

      expect(result.moderationStatus).toBe(ModerationStatus.PENDING);
    });

    it('flags content the AI model catches even if the profanity filter misses it', async () => {
      aiClient.score.mockResolvedValue({ toxicityScore: 0.95, flagged: true });

      const result = await moderationService.scoreContent(
        'A perfectly polite-sounding sentence.',
      );

      expect(result.moderationStatus).toBe(ModerationStatus.PENDING);
      expect(result.toxicityScore).toBe(0.95);
    });

    it('approves clean content that neither layer flags', async () => {
      aiClient.score.mockResolvedValue({ toxicityScore: 0.02, flagged: false });

      const result = await moderationService.scoreContent(
        'Great meeting today!',
      );

      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
    });
  });

  describe('report', () => {
    it('rejects a duplicate report from the same user on the same content', async () => {
      prisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        body: 'x',
        authorId: 'author-1',
        createdAt: new Date(),
        moderationStatus: ModerationStatus.APPROVED,
        toxicityScore: 0,
      });
      prisma.report.findUnique.mockResolvedValue({ id: 'existing-report' });

      await expect(
        moderationService.report('reporter-1', {
          contentType: ContentType.POST,
          contentId: 'post-1',
          reason: 'spam',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.report.create).not.toHaveBeenCalled();
    });

    it('rejects reporting content that does not exist', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      await expect(
        moderationService.report('reporter-1', {
          contentType: ContentType.POST,
          contentId: 'missing-post',
          reason: 'spam',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('approveContent / removeContent', () => {
    const existingPost = {
      id: 'post-1',
      body: 'x',
      authorId: 'author-1',
      createdAt: new Date(),
      moderationStatus: ModerationStatus.PENDING,
      toxicityScore: 0.8,
    };

    it('clears a flagged post and logs an APPROVE audit entry', async () => {
      prisma.post.findUnique.mockResolvedValue(existingPost);
      prisma.moderationAction.create.mockResolvedValue({ id: 'action-1' });

      await moderationService.approveContent(
        ContentType.POST,
        'post-1',
        'mod-1',
        'looks fine',
      );

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { moderationStatus: ModerationStatus.APPROVED },
      });
      expect(prisma.report.updateMany).toHaveBeenCalledWith({
        where: {
          contentType: ContentType.POST,
          contentId: 'post-1',
          status: ReportStatus.PENDING,
        },
        data: { status: ReportStatus.REVIEWED },
      });
      expect(prisma.moderationAction.create).toHaveBeenCalledWith({
        data: {
          moderatorId: 'mod-1',
          action: ModerationActionType.APPROVE,
          contentType: ContentType.POST,
          contentId: 'post-1',
          reason: 'looks fine',
        },
      });
    });

    it('removes a flagged post and logs a REMOVE audit entry', async () => {
      prisma.post.findUnique.mockResolvedValue(existingPost);

      await moderationService.removeContent(
        ContentType.POST,
        'post-1',
        'mod-1',
        'violates rules',
      );

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { moderationStatus: ModerationStatus.REMOVED },
      });
    });

    it('throws when the content does not exist', async () => {
      prisma.post.findUnique.mockResolvedValue(null);

      await expect(
        moderationService.approveContent(ContentType.POST, 'missing', 'mod-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('suspendUser', () => {
    it('suspends a student account and logs the action', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: Role.STUDENT,
      });

      await moderationService.suspendUser(
        'user-1',
        'mod-1',
        'repeated harassment',
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { isSuspended: true },
      });
      expect(prisma.moderationAction.create).toHaveBeenCalledWith({
        data: {
          moderatorId: 'mod-1',
          action: ModerationActionType.SUSPEND,
          targetUserId: 'user-1',
          reason: 'repeated harassment',
        },
      });
    });

    it('refuses to suspend a non-student account through this action', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'mod-2',
        role: Role.MODERATOR,
      });

      await expect(
        moderationService.suspendUser('mod-2', 'mod-1', 'no reason'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
