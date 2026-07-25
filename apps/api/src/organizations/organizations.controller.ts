import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId, OrgContext, SkipOrgCheck } from '../common/decorators';
import { CheckSlugDto, CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@Controller()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @SkipOrgCheck()
  @Post('organizations')
  create(@Body() dto: CreateOrganizationDto, @GetCurrentUserId() userId: string) {
    return this.organizationsService.create(dto, userId);
  }

  @SkipOrgCheck()
  @Get('organizations/check-slug')
  async checkSlug(@Query() query: CheckSlugDto) {
    const available = await this.organizationsService.isSlugAvailable(query.slug);
    return { available };
  }

  @SkipOrgCheck()
  @Get('me/organizations')
  myOrganizations(@GetCurrentUserId() userId: string) {
    return this.organizationsService.listForUser(userId);
  }

  @Get('orgs/:orgSlug/organization')
  getOrganization(@OrgContext() organization: unknown) {
    return organization;
  }

  @Patch('orgs/:orgSlug/organization')
  updateOrganization(
    @OrgContext() organization: { id: string },
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(organization.id, dto);
  }
}
