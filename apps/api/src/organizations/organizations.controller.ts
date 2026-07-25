import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import { AuthService } from '../auth/auth.service';
import { GetCurrentUserId, OrgContext, SkipOrgCheck } from '../common/decorators';
import { UsersService } from '../users/users.service';
import { CheckSlugDto, CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { OrganizationsService } from './organizations.service';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_PATH = '/auth';

@ApiTags('organizations')
@Controller()
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

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

  @SkipOrgCheck()
  @Post('orgs/:orgSlug/switch')
  @HttpCode(HttpStatus.OK)
  async switch(
    @GetCurrentUserId() userId: string,
    @OrgContext() organization: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.organizationsService.assertActiveMembership(userId, organization.id);
    const user = await this.usersService.findById(userId);
    const { accessToken, refreshToken } = await this.authService.reissueTokensForOrganization(
      user!,
      organization.id,
    );

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
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
