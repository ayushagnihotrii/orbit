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
  findAll(): Promise<Community[]> {
    return this.communitiesService.findAll();
  }

  @Get(':communityId')
  findOne(@Param('communityId') communityId: string): Promise<Community> {
    return this.communitiesService.findByIdOrThrow(communityId);
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
