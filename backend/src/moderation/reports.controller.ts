import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { SafeUser } from '../users/users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportContentDto } from './dto/report-content.dto';
import { ModerationService } from './moderation.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post()
  report(@CurrentUser() user: SafeUser, @Body() dto: ReportContentDto) {
    return this.moderationService.report(user.id, dto);
  }
}
