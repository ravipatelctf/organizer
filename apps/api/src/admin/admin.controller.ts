import { Controller, Get, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuditInterceptor } from '../audit/audit.interceptor';
import { Audit, RequireSuperAdmin } from '../common/decorators';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AdminService } from './admin.service';
import { AdminProjectsQueryDto } from './dto';

@ApiTags('admin')
@RequireSuperAdmin()
@UseGuards(SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Audit({ action: 'admin.stats.get', resourceType: 'platform' })
  @Get('admin/stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Audit({ action: 'admin.organizations.list', resourceType: 'organization' })
  @Get('admin/organizations')
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Audit({ action: 'admin.organizations.get', resourceType: 'organization' })
  @Get('admin/organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.adminService.getOrganization(id);
  }

  @Audit({ action: 'admin.projects.list', resourceType: 'project' })
  @Get('admin/projects')
  listProjects(@Query() query: AdminProjectsQueryDto) {
    return this.adminService.listProjects(query.organizationId);
  }

  @Audit({ action: 'admin.users.list', resourceType: 'user' })
  @Get('admin/users')
  listUsers() {
    return this.adminService.listUsers();
  }
}
