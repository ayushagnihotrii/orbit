import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ContentType, Role } from '@prisma/client';
import type { SafeUser } from '../users/users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ModerationReasonDto } from './dto/moderation-reason.dto';
import { UserActionDto } from './dto/user-action.dto';
import { ModerationService } from './moderation.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MODERATOR, Role.ADMIN)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  getQueue() {
    return this.moderationService.getQueue();
  }

  @Get('audit-log')
  getAuditLog() {
    return this.moderationService.listAuditLog();
  }

  @Post('content/:contentType/:contentId/approve')
  approveContent(
    @CurrentUser() moderator: SafeUser,
    @Param('contentType', new ParseEnumPipe(ContentType))
    contentType: ContentType,
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Body() dto: ModerationReasonDto,
  ) {
    return this.moderationService.approveContent(
      contentType,
      contentId,
      moderator.id,
      dto.reason,
    );
  }

  @Post('content/:contentType/:contentId/remove')
  removeContent(
    @CurrentUser() moderator: SafeUser,
    @Param('contentType', new ParseEnumPipe(ContentType))
    contentType: ContentType,
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Body() dto: ModerationReasonDto,
  ) {
    return this.moderationService.removeContent(
      contentType,
      contentId,
      moderator.id,
      dto.reason,
    );
  }

  @Post('users/:userId/warn')
  warnUser(
    @CurrentUser() moderator: SafeUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UserActionDto,
  ) {
    return this.moderationService.warnUser(userId, moderator.id, dto.reason);
  }

  @Post('users/:userId/suspend')
  suspendUser(
    @CurrentUser() moderator: SafeUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UserActionDto,
  ) {
    return this.moderationService.suspendUser(userId, moderator.id, dto.reason);
  }

  @Post('users/:userId/unsuspend')
  unsuspendUser(
    @CurrentUser() moderator: SafeUser,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: ModerationReasonDto,
  ) {
    return this.moderationService.unsuspendUser(
      userId,
      moderator.id,
      dto.reason,
    );
  }
}
