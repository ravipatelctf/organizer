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
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions(PERMS.role.view)
  @Get('orgs/:orgSlug/roles')
  list(@OrgContext() organization: { id: string }) {
    return this.rolesService.listForOrg(organization.id);
  }

  @RequirePermissions(PERMS.role.create)
  @Post('orgs/:orgSlug/roles')
  create(@OrgContext() organization: { id: string }, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(organization.id, dto);
  }

  @RequirePermissions(PERMS.role.edit)
  @Patch('orgs/:orgSlug/roles/:id')
  update(
    @OrgContext() organization: { id: string },
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(organization.id, roleId, dto);
  }

  @RequirePermissions(PERMS.role.delete)
  @Delete('orgs/:orgSlug/roles/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@OrgContext() organization: { id: string }, @Param('id') roleId: string) {
    await this.rolesService.remove(organization.id, roleId);
    return { success: true };
  }
}
