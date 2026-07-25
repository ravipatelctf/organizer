import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AccessContext } from './access-context';
import { TaskAccessService } from './task-access.service';

describe('TaskAccessService', () => {
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
    return { task: { findFirst: jest.fn() } } as unknown as jest.Mocked<PrismaService>;
  }

  it('returns the task when it is visible', async () => {
    const prisma = makePrismaMock();
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 't1' });
    const service = new TaskAccessService(prisma);

    await expect(service.assertVisible(makeCtx(), 't1')).resolves.toEqual({ id: 't1' });
  });

  it('throws NotFoundException, not ForbiddenException, when the row is out of boundary', async () => {
    const prisma = makePrismaMock();
    (prisma.task.findFirst as jest.Mock).mockResolvedValue(null);
    const service = new TaskAccessService(prisma);

    await expect(service.assertVisible(makeCtx(), 'foreign-id')).rejects.toThrow(NotFoundException);
  });

  it('queries through the nested project filter and the requested id', async () => {
    const prisma = makePrismaMock();
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: 't1' });
    const service = new TaskAccessService(prisma);

    await service.assertVisible(makeCtx(), 't1');

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        deletedAt: null,
        id: 't1',
        project: expect.objectContaining({ organizationId: 'org-1', deletedAt: null }),
      }),
    });
  });
});
