import { Module } from '@nestjs/common';
import { CommunitiesModule } from '../communities/communities.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [CommunitiesModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
