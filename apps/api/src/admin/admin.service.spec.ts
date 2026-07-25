import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  function makePrismaMock() {
    return {
      organization: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      project: { count: jest.fn(), findMany: jest.fn() },
      user: { count: jest.fn(), findMany: jest.fn() },
      task: { count: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;
  }

  describe('getStats', () => {
    it('counts every table with no organizationId filter — this surface is cross-org by design', async () => {
      const prisma = makePrismaMock();
      (prisma.organization.count as jest.Mock).mockResolvedValue(2);
      (prisma.project.count as jest.Mock).mockResolvedValue(5);
      (prisma.user.count as jest.Mock).mockResolvedValue(10);
      (prisma.task.count as jest.Mock).mockResolvedValue(40);
      const service = new AdminService(prisma);

      const stats = await service.getStats();

      expect(stats).toEqual({ organizations: 2, projects: 5, users: 10, tasks: 40 });
      expect(prisma.organization.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(prisma.project.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(prisma.user.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(prisma.task.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });
  });

  describe('getOrganization', () => {
    it('throws NotFoundException for a missing id', async () => {
      const prisma = makePrismaMock();
      (prisma.organization.findFirst as jest.Mock).mockResolvedValue(null);
      const service = new AdminService(prisma);

      await expect(service.getOrganization('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listProjects', () => {
    it('queries every organization when none is given', async () => {
      const prisma = makePrismaMock();
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      const service = new AdminService(prisma);

      await service.listProjects();

      const call = (prisma.project.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({ deletedAt: null });
    });

    it('takes organizationId as an explicit, caller-supplied filter when given', async () => {
      const prisma = makePrismaMock();
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      const service = new AdminService(prisma);

      await service.listProjects('org-1');

      const call = (prisma.project.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where).toEqual({ deletedAt: null, organizationId: 'org-1' });
    });
  });
});
