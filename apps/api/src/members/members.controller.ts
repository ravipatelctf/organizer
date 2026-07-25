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

import { OrgContext } from '../common/decorators';
import { UpdateMemberRolesDto } from './dto';
import { MembersService } from './members.service';

@ApiTags('members')
@Controller()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('orgs/:orgSlug/members')
  list(@OrgContext() organization: { id: string }) {
    return this.membersService.listForOrg(organization.id);
  }

  @Patch('orgs/:orgSlug/members/:id/roles')
  async updateRoles(
    @OrgContext() organization: { id: string },
    @Param('id') membershipId: string,
    @Body() dto: UpdateMemberRolesDto,
  ) {
    await this.membersService.updateRoles(organization.id, membershipId, dto.roleIds);
    return { success: true };
  }

  @Post('orgs/:orgSlug/members/:id/suspend')
  @HttpCode(HttpStatus.OK)
  suspend(@OrgContext() organization: { id: string }, @Param('id') membershipId: string) {
    return this.membersService.suspend(organization.id, membershipId);
  }

  @Delete('orgs/:orgSlug/members/:id')
  remove(@OrgContext() organization: { id: string }, @Param('id') membershipId: string) {
    return this.membersService.remove(organization.id, membershipId);
  }
}
