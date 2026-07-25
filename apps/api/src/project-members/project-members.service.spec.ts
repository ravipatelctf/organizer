import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AccessContext } from '../common/scope/access-context';
import { ProjectAccessService } from '../common/scope/project-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectMembersService } from './project-members.service';

describe('ProjectMembersService', () => {
  function makeCtx(overrides: Partial<AccessContext> = {}): AccessContext {
    return {
      userId: 'user-1',
      orgId: 'org-1',
      membershipId: 'membership-1',
      scopes: [],
      isOrgAdmin: true,
      isSuperAdmin: false,
      ...overrides,
    };
  }

  function makePrismaMock() {
    return {
      orgMembership: { findUnique: jest.fn() },
      projectMember: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;
  }

  function makeProjectAccessMock() {
    return {
      assertVisible: jest.fn().mockResolvedValue({ id: 'p1' }),
    } as unknown as jest.Mocked<ProjectAccessService>;
  }

  describe('add', () => {
    it('throws 404 for an org membership in a different organization', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'm1',
        organizationId: 'org-2',
        status: 'ACTIVE',
        deletedAt: null,
      });
      const service = new ProjectMembersService(prisma, makeProjectAccessMock());

      await expect(service.add(makeCtx(), 'p1', { orgMembershipId: 'm1' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 400 when the membership is not active', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'm1',
        organizationId: 'org-1',
        status: 'INVITED',
        deletedAt: null,
      });
      const service = new ProjectMembersService(prisma, makeProjectAccessMock());

      await expect(service.add(makeCtx(), 'p1', { orgMembershipId: 'm1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('takes organizationId from the context on the write payload', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'm1',
        organizationId: 'org-1',
        status: 'ACTIVE',
        deletedAt: null,
      });
      (prisma.projectMember.upsert as jest.Mock).mockResolvedValue({ id: 'pm1' });
      const service = new ProjectMembersService(prisma, makeProjectAccessMock());

      await service.add(makeCtx({ orgId: 'org-1' }), 'p1', { orgMembershipId: 'm1' });

      expect(prisma.projectMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ organizationId: 'org-1' }),
        }),
      );
    });
  });

  describe('findInProject (via updateRole/remove)', () => {
    it('throws 404 when the project member belongs to a different project', async () => {
      const prisma = makePrismaMock();
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'pm1',
        projectId: 'other-project',
        deletedAt: null,
      });
      const service = new ProjectMembersService(prisma, makeProjectAccessMock());

      await expect(service.updateRole(makeCtx(), 'p1', 'pm1', { role: 'LEAD' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('soft-deletes on remove', async () => {
      const prisma = makePrismaMock();
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'pm1',
        projectId: 'p1',
        deletedAt: null,
      });
      const service = new ProjectMembersService(prisma, makeProjectAccessMock());

      await service.remove(makeCtx(), 'p1', 'pm1');

      expect(prisma.projectMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pm1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
