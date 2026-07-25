import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { GetCurrentUserId, OrgContext, SkipOrgCheck } from '../common/decorators';
import { AcceptInvitationDto, CreateInvitationDto } from './dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('orgs/:orgSlug/invitations')
  list(@OrgContext() organization: { id: string }) {
    return this.invitationsService.listForOrg(organization.id);
  }

  @Post('orgs/:orgSlug/invitations')
  async create(
    @OrgContext() organization: { id: string },
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    const { membership, token } = await this.invitationsService.create(
      organization.id,
      userId,
      dto,
    );
    return { ...membership, token };
  }

  @Delete('orgs/:orgSlug/invitations/:id')
  async revoke(@OrgContext() organization: { id: string }, @Param('id') invitationId: string) {
    await this.invitationsService.revoke(organization.id, invitationId);
    return { success: true };
  }

  @SkipOrgCheck()
  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  accept(@GetCurrentUserId() userId: string, @Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(userId, dto.token);
  }
}
