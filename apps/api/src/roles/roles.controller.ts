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
import { CreateRoleDto, UpdateRoleDto } from './dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('orgs/:orgSlug/roles')
  list(@OrgContext() organization: { id: string }) {
    return this.rolesService.listForOrg(organization.id);
  }

  @Post('orgs/:orgSlug/roles')
  create(@OrgContext() organization: { id: string }, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(organization.id, dto);
  }

  @Patch('orgs/:orgSlug/roles/:id')
  update(
    @OrgContext() organization: { id: string },
    @Param('id') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(organization.id, roleId, dto);
  }

  @Delete('orgs/:orgSlug/roles/:id')
  @HttpCode(HttpStatus.OK)
  async remove(@OrgContext() organization: { id: string }, @Param('id') roleId: string) {
    await this.rolesService.remove(organization.id, roleId);
    return { success: true };
  }
}
