import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PERMS } from '@repo/permissions';

import { OrgContext, RequirePermissions } from '../common/decorators';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @RequirePermissions(PERMS.audit.view)
  @Get('orgs/:orgSlug/audit-logs')
  list(@OrgContext() organization: { id: string }) {
    return this.auditService.listForOrg(organization.id);
  }
}
