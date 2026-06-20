import { Module } from '@nestjs/common';
import { CommunitiesModule } from '../communities/communities.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [CommunitiesModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
