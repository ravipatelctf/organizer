import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  function makePrismaMock() {
    return {
      role: {
        findUnique: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;
  }

  describe('create', () => {
    it('rejects an unknown permission id before touching the database', async () => {
      const prisma = makePrismaMock();
      const service = new RolesService(prisma);

      await expect(
        service.create('org-1', {
          name: 'Custom',
          rank: 5,
          permissionIds: ['not-a-real-permission'],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.role.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a duplicate role name in the same organization', async () => {
      const prisma = makePrismaMock();
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role-1' });
      const service = new RolesService(prisma);

      await expect(
        service.create('org-1', { name: 'Member', rank: 5, permissionIds: ['view-members'] }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('throws 404 for a role in a different organization', async () => {
      const prisma = makePrismaMock();
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 'role-1',
        organizationId: 'org-2',
        deletedAt: null,
        isSystemRole: false,
      });
      const service = new RolesService(prisma);

      await expect(service.update('org-1', 'role-1', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses to edit a system role', async () => {
      const prisma = makePrismaMock();
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 'role-1',
        organizationId: 'org-1',
        deletedAt: null,
        isSystemRole: true,
      });
      const service = new RolesService(prisma);

      await expect(service.update('org-1', 'role-1', { name: 'New' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('refuses to delete a system role', async () => {
      const prisma = makePrismaMock();
      (prisma.role.findUnique as jest.Mock).mockResolvedValue({
        id: 'role-1',
        organizationId: 'org-1',
        deletedAt: null,
        isSystemRole: true,
      });
      const service = new RolesService(prisma);

      await expect(service.remove('org-1', 'role-1')).rejects.toThrow(ConflictException);
    });
  });
});
