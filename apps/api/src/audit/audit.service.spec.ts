import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  function makePrismaMock() {
    return {
      auditLog: { create: jest.fn(), findMany: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;
  }

  describe('record', () => {
    it('writes every field through, including a null organizationId for platform actions', async () => {
      const prisma = makePrismaMock();
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'log-1' });
      const service = new AuditService(prisma);

      await service.record({
        organizationId: null,
        actorUserId: 'user-1',
        action: 'admin.projects.list',
        resourceType: 'project',
        resourceId: null,
        metadata: { organizationId: 'org-1' },
        ipAddress: '127.0.0.1',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          organizationId: null,
          actorUserId: 'user-1',
          action: 'admin.projects.list',
          resourceType: 'project',
          resourceId: null,
          metadata: { organizationId: 'org-1' },
          ipAddress: '127.0.0.1',
        },
      });
    });
  });

  describe('listForOrg', () => {
    it('filters strictly by organizationId', async () => {
      const prisma = makePrismaMock();
      (prisma.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      const service = new AuditService(prisma);

      await service.listForOrg('org-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
