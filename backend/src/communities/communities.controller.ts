import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Community } from '@prisma/client';
import type { SafeUser } from '../users/users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';

@UseGuards(JwtAuthGuard)
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Post()
  create(
    @CurrentUser() user: SafeUser,
    @Body() dto: CreateCommunityDto,
  ): Promise<Community> {
    return this.communitiesService.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: SafeUser) {
    return this.communitiesService.findAllWithMembership(user.id);
  }

  @Get(':communityId')
  findOne(
    @CurrentUser() user: SafeUser,
    @Param('communityId') communityId: string,
  ) {
    return this.communitiesService.findOneWithMembership(communityId, user.id);
  }

  @Post(':communityId/membership')
  join(
    @CurrentUser() user: SafeUser,
    @Param('communityId') communityId: string,
  ): Promise<void> {
    return this.communitiesService.join(user.id, communityId);
  }

  @Delete(':communityId/membership')
  leave(
    @CurrentUser() user: SafeUser,
    @Param('communityId') communityId: string,
  ): Promise<void> {
    return this.communitiesService.leave(user.id, communityId);
  }
}
