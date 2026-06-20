import { Module } from '@nestjs/common';
import { AiModerationClient } from './ai-moderation-client.service';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { ReportsController } from './reports.controller';

@Module({
  controllers: [ModerationController, ReportsController],
  providers: [ModerationService, AiModerationClient],
  exports: [ModerationService],
})
export class ModerationModule {}
