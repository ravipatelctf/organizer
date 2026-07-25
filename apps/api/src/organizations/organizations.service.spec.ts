import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  function makePrismaMock() {
    return {
      organization: { findUnique: jest.fn(), update: jest.fn() },
      orgMembership: { findMany: jest.fn(), findUnique: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;
  }

  describe('isSlugAvailable', () => {
    it('is true when no organization holds the slug', async () => {
      const prisma = makePrismaMock();
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue(null);
      const service = new OrganizationsService(prisma);

      await expect(service.isSlugAvailable('acme')).resolves.toBe(true);
    });

    it('is false once an organization holds the slug', async () => {
      const prisma = makePrismaMock();
      (prisma.organization.findUnique as jest.Mock).mockResolvedValue({ id: 'org-1' });
      const service = new OrganizationsService(prisma);

      await expect(service.isSlugAvailable('acme')).resolves.toBe(false);
    });
  });

  describe('listForUser', () => {
    it('returns only organizations behind an active, non-deleted membership', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findMany as jest.Mock).mockResolvedValue([
        { organization: { id: 'org-1', deletedAt: null } },
        { organization: { id: 'org-2', deletedAt: new Date() } },
      ]);
      const service = new OrganizationsService(prisma);

      const result = await service.listForUser('user-1');

      expect(prisma.orgMembership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', status: 'ACTIVE', deletedAt: null } }),
      );
      expect(result).toEqual([{ id: 'org-1', deletedAt: null }]);
    });
  });
});
