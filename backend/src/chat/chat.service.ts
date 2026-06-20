import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatMessage, ChatRoom } from '@prisma/client';
import { CommunitiesService } from '../communities/communities.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communitiesService: CommunitiesService,
  ) {}

  async listRooms(communityId: string, userId: string): Promise<ChatRoom[]> {
    await this.communitiesService.findByIdOrThrow(communityId);
    await this.communitiesService.assertMember(userId, communityId);
    return this.prisma.chatRoom.findMany({
      where: { communityId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createRoom(
    communityId: string,
    userId: string,
    dto: CreateChatRoomDto,
  ): Promise<ChatRoom> {
    await this.communitiesService.findByIdOrThrow(communityId);
    await this.communitiesService.assertMember(userId, communityId);

    const existing = await this.prisma.chatRoom.findUnique({
      where: { communityId_name: { communityId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        'A chat room with that name already exists in this community.',
      );
    }

    return this.prisma.chatRoom.create({
      data: { communityId, name: dto.name },
    });
  }

  private async getRoomOrThrow(roomId: string): Promise<ChatRoom> {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      throw new NotFoundException('Chat room not found.');
    }
    return room;
  }

  private async assertRoomMember(
    roomId: string,
    userId: string,
  ): Promise<ChatRoom> {
    const room = await this.getRoomOrThrow(roomId);
    const isMember = await this.communitiesService.isMember(
      userId,
      room.communityId,
    );
    if (!isMember) {
      throw new ForbiddenException(
        'You must join this community to access its chat rooms.',
      );
    }
    return room;
  }

  async listMessages(roomId: string, userId: string): Promise<ChatMessage[]> {
    await this.assertRoomMember(roomId, userId);
    return this.prisma.chatMessage.findMany({
      where: { chatRoomId: roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async postMessage(
    roomId: string,
    userId: string,
    dto: CreateMessageDto,
  ): Promise<ChatMessage> {
    await this.assertRoomMember(roomId, userId);

    return this.prisma.chatMessage.create({
      data: {
        chatRoomId: roomId,
        authorId: userId,
        body: dto.body,
      },
    });
  }
}
