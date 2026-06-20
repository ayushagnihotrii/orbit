import { Module } from '@nestjs/common';
import { CommunitiesModule } from '../communities/communities.module';
import { ModerationModule } from '../moderation/moderation.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [CommunitiesModule, ModerationModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
