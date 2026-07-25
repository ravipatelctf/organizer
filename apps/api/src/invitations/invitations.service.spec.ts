import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  function makePrismaMock() {
    return {
      user: { findUnique: jest.fn() },
      orgMembership: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      role: { count: jest.fn() },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;
  }

  describe('revoke', () => {
    it('throws 404 for an invitation in a different organization', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-2',
        status: 'INVITED',
        deletedAt: null,
      });
      const service = new InvitationsService(prisma);

      await expect(service.revoke('org-1', 'inv-1')).rejects.toThrow(NotFoundException);
    });

    it('throws 404 once the invitation has already been accepted', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-1',
        status: 'ACTIVE',
        deletedAt: null,
      });
      const service = new InvitationsService(prisma);

      await expect(service.revoke('org-1', 'inv-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('accept', () => {
    it('rejects an unknown token', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue(null);
      const service = new InvitationsService(prisma);

      await expect(service.accept('user-1', 'bogus')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an expired invitation', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        status: 'INVITED',
        userId: 'user-1',
        invitationExpiresAt: new Date(Date.now() - 1000),
      });
      const service = new InvitationsService(prisma);

      await expect(service.accept('user-1', 'token')).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token being redeemed by the wrong user', async () => {
      const prisma = makePrismaMock();
      (prisma.orgMembership.findUnique as jest.Mock).mockResolvedValue({
        id: 'inv-1',
        status: 'INVITED',
        userId: 'user-1',
        invitationExpiresAt: new Date(Date.now() + 1000 * 60),
      });
      const service = new InvitationsService(prisma);

      await expect(service.accept('user-2', 'token')).rejects.toThrow(ForbiddenException);
    });
  });
});
