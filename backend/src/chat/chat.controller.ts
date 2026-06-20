import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { SafeUser } from '../users/users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('communities/:communityId/chat-rooms')
  listRooms(
    @CurrentUser() user: SafeUser,
    @Param('communityId') communityId: string,
  ) {
    return this.chatService.listRooms(communityId, user.id);
  }

  @Post('communities/:communityId/chat-rooms')
  createRoom(
    @CurrentUser() user: SafeUser,
    @Param('communityId') communityId: string,
    @Body() dto: CreateChatRoomDto,
  ) {
    return this.chatService.createRoom(communityId, user.id, dto);
  }

  @Get('chat-rooms/:roomId/messages')
  listMessages(@CurrentUser() user: SafeUser, @Param('roomId') roomId: string) {
    return this.chatService.listMessages(roomId, user.id);
  }

  @Post('chat-rooms/:roomId/messages')
  postMessage(
    @CurrentUser() user: SafeUser,
    @Param('roomId') roomId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.chatService.postMessage(roomId, user.id, dto);
  }
}
