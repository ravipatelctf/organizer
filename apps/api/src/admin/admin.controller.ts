import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { RequireSuperAdmin } from '../common/decorators';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AdminService } from './admin.service';
import { AdminProjectsQueryDto } from './dto';

@ApiTags('admin')
@RequireSuperAdmin()
@UseGuards(SuperAdminGuard)
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('admin/stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('admin/organizations')
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Get('admin/organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.adminService.getOrganization(id);
  }

  @Get('admin/projects')
  listProjects(@Query() query: AdminProjectsQueryDto) {
    return this.adminService.listProjects(query.organizationId);
  }

  @Get('admin/users')
  listUsers() {
    return this.adminService.listUsers();
  }
}
