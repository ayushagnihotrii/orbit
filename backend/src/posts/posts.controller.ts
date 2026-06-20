import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { SafeUser } from '../users/users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { VoteDto } from './dto/vote.dto';
import { PostsService } from './posts.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('communities/:communityId/posts')
  create(
    @CurrentUser() user: SafeUser,
    @Param('communityId') communityId: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.create(communityId, user.id, dto);
  }

  @Get('communities/:communityId/posts')
  findAll(
    @CurrentUser() user: SafeUser,
    @Param('communityId') communityId: string,
  ) {
    return this.postsService.findAllForCommunity(communityId, user.id);
  }

  @Post('posts/:postId/votes')
  vote(
    @CurrentUser() user: SafeUser,
    @Param('postId') postId: string,
    @Body() dto: VoteDto,
  ) {
    return this.postsService.vote(postId, user.id, dto.value);
  }

  @Delete('posts/:postId/votes')
  removeVote(@CurrentUser() user: SafeUser, @Param('postId') postId: string) {
    return this.postsService.removeVote(postId, user.id);
  }
}
