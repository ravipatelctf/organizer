import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from './members.service';

describe('MembersService', () => {
  function makePrismaMock() {
    return {
      orgMembership: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      role: { count: jest.fn() },
      membershipRole: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;
  }

  describe('updateRoles', () => {
    it('throws 404 when the membership belongs to a different organization', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'm1',
        organizationId: 'org-2',
        deletedAt: null,
      });
      const service = new MembersService(prisma);

      await expect(service.updateRoles('org-1', 'm1', ['r1'])).rejects.toThrow(NotFoundException);
    });

    it('throws 400 when a role does not belong to the organization', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'm1',
        organizationId: 'org-1',
        deletedAt: null,
      });
      (prisma.role.count as jest.Mock).mockResolvedValue(1);
      const service = new MembersService(prisma);

      await expect(service.updateRoles('org-1', 'm1', ['r1', 'r2'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
