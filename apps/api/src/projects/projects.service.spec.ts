import { ConflictException, NotFoundException } from '@nestjs/common';

import { AccessContext } from '../common/scope/access-context';
import { ProjectAccessService } from '../common/scope/project-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  function makeCtx(overrides: Partial<AccessContext> = {}): AccessContext {
    return {
      userId: 'user-1',
      orgId: 'org-1',
      membershipId: 'membership-1',
      scopes: ['view-projects', 'create-projects'],
      isOrgAdmin: true,
      isSuperAdmin: false,
      ...overrides,
    };
  }

  function makePrismaMock() {
    return {
      project: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;
  }

  function makeProjectAccessMock() {
    return { assertVisible: jest.fn() } as unknown as jest.Mocked<ProjectAccessService>;
  }

  describe('list', () => {
    it('scopes the query by organizationId and excludes soft-deleted rows', async () => {
      const prisma = makePrismaMock();
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      const service = new ProjectsService(prisma, makeProjectAccessMock());

      await service.list(makeCtx());

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-1', deletedAt: null }),
        }),
      );
    });
  });

  describe('create', () => {
    it('throws 409 when the key is already taken in this organization', async () => {
      const prisma = makePrismaMock();
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      const service = new ProjectsService(prisma, makeProjectAccessMock());

      await expect(service.create(makeCtx(), { key: 'APOLLO', name: 'Apollo' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('takes organizationId from the context, never from the dto', async () => {
      const prisma = makePrismaMock();
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      const tx = {
        project: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
        projectMember: { create: jest.fn() },
      };
      (prisma.$transaction as jest.Mock).mockImplementation((fn: (tx: unknown) => unknown) =>
        fn(tx),
      );
      const service = new ProjectsService(prisma, makeProjectAccessMock());

      await service.create(makeCtx({ orgId: 'org-1' }), { key: 'APOLLO', name: 'Apollo' });

      expect(tx.project.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-1' }) }),
      );
      expect(tx.projectMember.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'LEAD', orgMembershipId: 'membership-1' }),
        }),
      );
    });
  });

  describe('getById', () => {
    it('propagates NotFoundException from ProjectAccessService', async () => {
      const prisma = makePrismaMock();
      const projectAccess = makeProjectAccessMock();
      (projectAccess.assertVisible as jest.Mock).mockRejectedValue(
        new NotFoundException('Project not found.'),
      );
      const service = new ProjectsService(prisma, projectAccess);

      await expect(service.getById(makeCtx(), 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes rather than hard-deleting', async () => {
      const prisma = makePrismaMock();
      const projectAccess = makeProjectAccessMock();
      (projectAccess.assertVisible as jest.Mock).mockResolvedValue({ id: 'p1' });
      const service = new ProjectsService(prisma, projectAccess);

      await service.remove(makeCtx(), 'p1');

      expect(prisma.project.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
