import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMS } from '@repo/permissions';

import { OrgContext, RequirePermissions } from '../common/decorators';
import { UpdateMemberRolesDto } from './dto';
import { MembersService } from './members.service';

@ApiTags('members')
@Controller()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @RequirePermissions(PERMS.member.view)
  @Get('orgs/:orgSlug/members')
  list(@OrgContext() organization: { id: string }) {
    return this.membersService.listForOrg(organization.id);
  }

  @RequirePermissions(PERMS.member.edit)
  @Patch('orgs/:orgSlug/members/:id/roles')
  async updateRoles(
    @OrgContext() organization: { id: string },
    @Param('id') membershipId: string,
    @Body() dto: UpdateMemberRolesDto,
  ) {
    await this.membersService.updateRoles(organization.id, membershipId, dto.roleIds);
    return { success: true };
  }

  @RequirePermissions(PERMS.member.suspend)
  @Post('orgs/:orgSlug/members/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@OrgContext() organization: { id: string }, @Param('id') membershipId: string) {
    return this.membersService.suspend(organization.id, membershipId);
  }

  @RequirePermissions(PERMS.member.remove)
  @Delete('orgs/:orgSlug/members/:id')
  remove(@OrgContext() organization: { id: string }, @Param('id') membershipId: string) {
    return this.membersService.remove(organization.id, membershipId);
  }
}
