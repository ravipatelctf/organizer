import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId } from '../common/decorators';
import { CheckSlugDto, CreateOrganizationDto } from './dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post('organizations')
  create(@Body() dto: CreateOrganizationDto, @GetCurrentUserId() userId: string) {
    return this.organizationsService.create(dto, userId);
  }

  @Get('organizations/check-slug')
  async checkSlug(@Query() query: CheckSlugDto) {
    const available = await this.organizationsService.isSlugAvailable(query.slug);
    return { available };
  }

  @Get('me/organizations')
  myOrganizations(@GetCurrentUserId() userId: string) {
    return this.organizationsService.listForUser(userId);
  }
}
