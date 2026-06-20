import { Module } from '@nestjs/common';
import { ModerationModule } from '../moderation/moderation.module';
import { UsersModule } from '../users/users.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsService } from './connections.service';

@Module({
  imports: [UsersModule, ModerationModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
})
export class ConnectionsModule {}
