import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditEntry {
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: RecordAuditEntry): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        actorUserId: entry.actorUserId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata ?? {},
        ipAddress: entry.ipAddress,
      },
    });
  }

  listForOrg(organizationId: string): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
