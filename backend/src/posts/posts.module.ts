import { Module } from '@nestjs/common';
import { CommunitiesModule } from '../communities/communities.module';
import { ModerationModule } from '../moderation/moderation.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [CommunitiesModule, ModerationModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
