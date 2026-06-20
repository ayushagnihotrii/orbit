import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { SafeUser } from '../users/users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectionsService } from './connections.service';
import { CreateConnectionRequestDto } from './dto/create-connection-request.dto';
import { RespondConnectionRequestDto } from './dto/respond-connection-request.dto';
import { SendDirectMessageDto } from './dto/send-direct-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post('requests')
  sendRequest(
    @CurrentUser() user: SafeUser,
    @Body() dto: CreateConnectionRequestDto,
  ) {
    return this.connectionsService.sendRequest(user.id, dto);
  }

  @Get('requests/incoming')
  listIncoming(@CurrentUser() user: SafeUser) {
    return this.connectionsService.listIncoming(user.id);
  }

  @Get('requests/outgoing')
  listOutgoing(@CurrentUser() user: SafeUser) {
    return this.connectionsService.listOutgoing(user.id);
  }

  @Post('requests/:requestId/respond')
  respond(
    @CurrentUser() user: SafeUser,
    @Param('requestId') requestId: string,
    @Body() dto: RespondConnectionRequestDto,
  ) {
    return this.connectionsService.respond(requestId, user.id, dto.accept);
  }

  @Get()
  listAccepted(@CurrentUser() user: SafeUser) {
    return this.connectionsService.listAccepted(user.id);
  }

  @Get(':connectionId/messages')
  listMessages(
    @CurrentUser() user: SafeUser,
    @Param('connectionId') connectionId: string,
  ) {
    return this.connectionsService.listMessages(connectionId, user.id);
  }

  @Post(':connectionId/messages')
  sendMessage(
    @CurrentUser() user: SafeUser,
    @Param('connectionId') connectionId: string,
    @Body() dto: SendDirectMessageDto,
  ) {
    return this.connectionsService.sendMessage(connectionId, user.id, dto);
  }
}
