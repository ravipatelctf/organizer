import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AccessContext } from './access-context';
import { ProjectAccessService } from './project-access.service';

describe('ProjectAccessService', () => {
  function makeCtx(overrides: Partial<AccessContext> = {}): AccessContext {
    return {
      userId: 'user-1',
      orgId: 'org-1',
      membershipId: null,
      scopes: [],
      isOrgAdmin: true,
      isSuperAdmin: false,
      ...overrides,
    };
  }

  function makePrismaMock() {
    return { project: { findFirst: jest.fn() } } as unknown as jest.Mocked<PrismaService>;
  }

  it('returns the project when it is visible', async () => {
    const prisma = makePrismaMock();
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p1' });
    const service = new ProjectAccessService(prisma);

    await expect(service.assertVisible(makeCtx(), 'p1')).resolves.toEqual({ id: 'p1' });
  });

  it('throws NotFoundException, not ForbiddenException, when the row is out of boundary', async () => {
    const prisma = makePrismaMock();
    (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new ProjectAccessService(prisma);

    await expect(service.assertVisible(makeCtx(), 'foreign-id')).rejects.toThrow(NotFoundException);
  });

  it('queries by both the scope filter and the requested id', async () => {
    const prisma = makePrismaMock();
    (prisma.project.findFirst as jest.Mock).mockResolvedValue({ id: 'p1' });
    const service = new ProjectAccessService(prisma);

    await service.assertVisible(makeCtx(), 'p1');

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({ organizationId: 'org-1', deletedAt: null, id: 'p1' }),
    });
  });
});
