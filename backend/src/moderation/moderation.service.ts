import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContentType,
  ModerationActionType,
  ModerationStatus,
  Prisma,
  Report,
  ReportStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiModerationClient } from './ai-moderation-client.service';
import { containsProfanity } from './profanity-filter';
import { ReportContentDto } from './dto/report-content.dto';

export interface ContentScore {
  toxicityScore: number;
  moderationStatus: ModerationStatus;
}

export interface ContentRecord {
  id: string;
  body: string;
  authorId: string;
  createdAt: Date;
  moderationStatus: ModerationStatus;
  toxicityScore: number;
}

export interface QueueItem extends ContentRecord {
  contentType: ContentType;
  reportCount: number;
  reportReasons: string[];
}

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiClient: AiModerationClient,
  ) {}

  // The actual moderation pipeline: fast deterministic filter first, then the
  // ML model. Either layer can flag content for human review.
  async scoreContent(body: string): Promise<ContentScore> {
    const profanityHit = containsProfanity(body);
    const aiResult = await this.aiClient.score(body);

    const flagged = profanityHit || aiResult.flagged;
    return {
      toxicityScore: aiResult.toxicityScore,
      moderationStatus: flagged
        ? ModerationStatus.PENDING
        : ModerationStatus.APPROVED,
    };
  }

  private contentDelegate(contentType: ContentType) {
    switch (contentType) {
      case ContentType.POST:
        return this.prisma.post;
      case ContentType.CHAT_MESSAGE:
        return this.prisma.chatMessage;
      case ContentType.DIRECT_MESSAGE:
        return this.prisma.directMessage;
    }
  }

  private async getContentOrThrow(
    contentType: ContentType,
    contentId: string,
  ): Promise<ContentRecord> {
    const delegate = this.contentDelegate(contentType) as unknown as {
      findUnique: (args: {
        where: { id: string };
      }) => Promise<Prisma.PostGetPayload<object> | null>;
    };
    const record = await delegate.findUnique({ where: { id: contentId } });
    if (!record) {
      throw new NotFoundException('Content not found.');
    }
    const authorId =
      'authorId' in record
        ? record.authorId
        : (record as { senderId: string }).senderId;
    return {
      id: record.id,
      body: record.body,
      authorId,
      createdAt: record.createdAt,
      moderationStatus: record.moderationStatus,
      toxicityScore: record.toxicityScore,
    };
  }

  private async setModerationStatus(
    contentType: ContentType,
    contentId: string,
    status: ModerationStatus,
  ): Promise<void> {
    const delegate = this.contentDelegate(contentType) as unknown as {
      update: (args: {
        where: { id: string };
        data: { moderationStatus: ModerationStatus };
      }) => Promise<unknown>;
    };
    await delegate.update({
      where: { id: contentId },
      data: { moderationStatus: status },
    });
  }

  async report(reporterId: string, dto: ReportContentDto): Promise<Report> {
    await this.getContentOrThrow(dto.contentType, dto.contentId);

    const existing = await this.prisma.report.findUnique({
      where: {
        reporterId_contentType_contentId: {
          reporterId,
          contentType: dto.contentType,
          contentId: dto.contentId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('You have already reported this content.');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        contentType: dto.contentType,
        contentId: dto.contentId,
        reason: dto.reason,
      },
    });
  }

  async getQueue(): Promise<QueueItem[]> {
    const [
      pendingPosts,
      pendingChatMessages,
      pendingDirectMessages,
      pendingReports,
    ] = await Promise.all([
      this.prisma.post.findMany({
        where: { moderationStatus: ModerationStatus.PENDING },
      }),
      this.prisma.chatMessage.findMany({
        where: { moderationStatus: ModerationStatus.PENDING },
      }),
      this.prisma.directMessage.findMany({
        where: { moderationStatus: ModerationStatus.PENDING },
      }),
      this.prisma.report.findMany({ where: { status: ReportStatus.PENDING } }),
    ]);

    const queueByKey = new Map<string, QueueItem>();

    type RawRecord = {
      id: string;
      body: string;
      createdAt: Date;
      moderationStatus: ModerationStatus;
      toxicityScore: number;
      authorId?: string;
      senderId?: string;
    };

    const addAutoFlagged = (contentType: ContentType, records: RawRecord[]) => {
      for (const record of records) {
        const key = `${contentType}:${record.id}`;
        queueByKey.set(key, {
          id: record.id,
          body: record.body,
          authorId: record.authorId ?? (record.senderId as string),
          createdAt: record.createdAt,
          moderationStatus: record.moderationStatus,
          toxicityScore: record.toxicityScore,
          contentType,
          reportCount: 0,
          reportReasons: [],
        });
      }
    };

    addAutoFlagged(ContentType.POST, pendingPosts);
    addAutoFlagged(ContentType.CHAT_MESSAGE, pendingChatMessages);
    addAutoFlagged(ContentType.DIRECT_MESSAGE, pendingDirectMessages);

    for (const report of pendingReports) {
      const key = `${report.contentType}:${report.contentId}`;
      const existing = queueByKey.get(key);
      if (existing) {
        existing.reportCount += 1;
        existing.reportReasons.push(report.reason);
        continue;
      }

      try {
        const record = await this.getContentOrThrow(
          report.contentType,
          report.contentId,
        );
        queueByKey.set(key, {
          ...record,
          contentType: report.contentType,
          reportCount: 1,
          reportReasons: [report.reason],
        });
      } catch {
        // Reported content was already deleted/unavailable — skip it from the queue.
      }
    }

    return Array.from(queueByKey.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  private async markReportsReviewed(
    contentType: ContentType,
    contentId: string,
  ): Promise<void> {
    await this.prisma.report.updateMany({
      where: { contentType, contentId, status: ReportStatus.PENDING },
      data: { status: ReportStatus.REVIEWED },
    });
  }

  async approveContent(
    contentType: ContentType,
    contentId: string,
    moderatorId: string,
    reason?: string,
  ) {
    await this.getContentOrThrow(contentType, contentId);
    await this.setModerationStatus(
      contentType,
      contentId,
      ModerationStatus.APPROVED,
    );
    await this.markReportsReviewed(contentType, contentId);

    return this.prisma.moderationAction.create({
      data: {
        moderatorId,
        action: ModerationActionType.APPROVE,
        contentType,
        contentId,
        reason,
      },
    });
  }

  async removeContent(
    contentType: ContentType,
    contentId: string,
    moderatorId: string,
    reason?: string,
  ) {
    await this.getContentOrThrow(contentType, contentId);
    await this.setModerationStatus(
      contentType,
      contentId,
      ModerationStatus.REMOVED,
    );
    await this.markReportsReviewed(contentType, contentId);

    return this.prisma.moderationAction.create({
      data: {
        moderatorId,
        action: ModerationActionType.REMOVE,
        contentType,
        contentId,
        reason,
      },
    });
  }

  async warnUser(targetUserId: string, moderatorId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.prisma.moderationAction.create({
      data: {
        moderatorId,
        action: ModerationActionType.WARN,
        targetUserId,
        reason,
      },
    });
  }

  async suspendUser(targetUserId: string, moderatorId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException(
        'Only student accounts can be suspended through this action.',
      );
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isSuspended: true },
    });

    return this.prisma.moderationAction.create({
      data: {
        moderatorId,
        action: ModerationActionType.SUSPEND,
        targetUserId,
        reason,
      },
    });
  }

  async unsuspendUser(
    targetUserId: string,
    moderatorId: string,
    reason?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isSuspended: false },
    });

    return this.prisma.moderationAction.create({
      data: {
        moderatorId,
        action: ModerationActionType.UNSUSPEND,
        targetUserId,
        reason,
      },
    });
  }

  listAuditLog() {
    return this.prisma.moderationAction.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
