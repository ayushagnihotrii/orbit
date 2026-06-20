import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConnectionRequest,
  ConnectionStatus,
  DirectMessage,
  ModerationStatus,
} from '@prisma/client';
import { ModerationService } from '../moderation/moderation.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateConnectionRequestDto } from './dto/create-connection-request.dto';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly moderationService: ModerationService,
  ) {}

  async sendRequest(
    requesterId: string,
    dto: CreateConnectionRequestDto,
  ): Promise<ConnectionRequest> {
    const recipient = await this.usersService.findByUsername(
      dto.recipientUsername,
    );
    if (!recipient) {
      throw new NotFoundException('No user found with that username.');
    }
    if (recipient.id === requesterId) {
      throw new ConflictException('You cannot connect with yourself.');
    }

    // If the other user already requested us, a request back is treated as mutual acceptance.
    const reverseRequest = await this.prisma.connectionRequest.findUnique({
      where: {
        requesterId_recipientId: {
          requesterId: recipient.id,
          recipientId: requesterId,
        },
      },
    });
    if (reverseRequest && reverseRequest.status === ConnectionStatus.PENDING) {
      return this.prisma.connectionRequest.update({
        where: { id: reverseRequest.id },
        data: { status: ConnectionStatus.ACCEPTED, respondedAt: new Date() },
      });
    }

    const existing = await this.prisma.connectionRequest.findUnique({
      where: {
        requesterId_recipientId: { requesterId, recipientId: recipient.id },
      },
    });
    if (existing?.status === ConnectionStatus.ACCEPTED) {
      throw new ConflictException('You are already connected with this user.');
    }
    if (existing?.status === ConnectionStatus.PENDING) {
      throw new ConflictException(
        'A connection request to this user is already pending.',
      );
    }
    if (existing) {
      return this.prisma.connectionRequest.update({
        where: { id: existing.id },
        data: { status: ConnectionStatus.PENDING, respondedAt: null },
      });
    }

    return this.prisma.connectionRequest.create({
      data: { requesterId, recipientId: recipient.id },
    });
  }

  async respond(
    connectionId: string,
    recipientId: string,
    accept: boolean,
  ): Promise<ConnectionRequest> {
    const request = await this.getRequestOrThrow(connectionId);
    if (request.recipientId !== recipientId) {
      throw new ForbiddenException(
        'Only the recipient can respond to this request.',
      );
    }
    if (request.status !== ConnectionStatus.PENDING) {
      throw new ConflictException(
        'This request has already been responded to.',
      );
    }

    return this.prisma.connectionRequest.update({
      where: { id: connectionId },
      data: {
        status: accept ? ConnectionStatus.ACCEPTED : ConnectionStatus.DECLINED,
        respondedAt: new Date(),
      },
    });
  }

  private readonly withUsernames = {
    requester: { select: { username: true } },
    recipient: { select: { username: true } },
  };

  listIncoming(userId: string) {
    return this.prisma.connectionRequest.findMany({
      where: { recipientId: userId, status: ConnectionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: this.withUsernames,
    });
  }

  listOutgoing(userId: string) {
    return this.prisma.connectionRequest.findMany({
      where: { requesterId: userId, status: ConnectionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: this.withUsernames,
    });
  }

  async listAccepted(userId: string) {
    const connections = await this.prisma.connectionRequest.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [{ requesterId: userId }, { recipientId: userId }],
      },
      orderBy: { respondedAt: 'desc' },
      include: this.withUsernames,
    });

    return connections.map((connection) => ({
      ...connection,
      otherUsername:
        connection.requesterId === userId
          ? connection.recipient.username
          : connection.requester.username,
    }));
  }

  private async getRequestOrThrow(
    connectionId: string,
  ): Promise<ConnectionRequest> {
    const request = await this.prisma.connectionRequest.findUnique({
      where: { id: connectionId },
    });
    if (!request) {
      throw new NotFoundException('Connection request not found.');
    }
    return request;
  }

  // The only gate that ever unlocks direct messaging: an ACCEPTED connection
  // between the current user and the other participant.
  private async assertAcceptedParticipant(
    connectionId: string,
    userId: string,
  ): Promise<ConnectionRequest> {
    const request = await this.getRequestOrThrow(connectionId);
    const isParticipant =
      request.requesterId === userId || request.recipientId === userId;
    if (!isParticipant || request.status !== ConnectionStatus.ACCEPTED) {
      throw new ForbiddenException(
        'You can only message users you are connected with.',
      );
    }
    return request;
  }

  async sendMessage(
    connectionId: string,
    senderId: string,
    dto: SendDirectMessageDto,
  ): Promise<DirectMessage> {
    await this.assertAcceptedParticipant(connectionId, senderId);
    const { toxicityScore, moderationStatus } =
      await this.moderationService.scoreContent(dto.body);

    return this.prisma.directMessage.create({
      data: {
        connectionId,
        senderId,
        body: dto.body,
        toxicityScore,
        moderationStatus,
      },
    });
  }

  async listMessages(
    connectionId: string,
    userId: string,
  ): Promise<DirectMessage[]> {
    await this.assertAcceptedParticipant(connectionId, userId);
    return this.prisma.directMessage.findMany({
      where: {
        connectionId,
        OR: [
          { moderationStatus: ModerationStatus.APPROVED },
          { senderId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
