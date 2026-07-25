import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { AccessContext } from '../common/scope/access-context';
import { ProjectAccessService } from '../common/scope/project-access.service';
import { TaskAccessService } from '../common/scope/task-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  function makeCtx(overrides: Partial<AccessContext> = {}): AccessContext {
    return {
      userId: 'user-1',
      orgId: 'org-1',
      membershipId: 'membership-1',
      scopes: ['view-tasks', 'create-tasks', 'edit-tasks', 'assign-tasks'],
      isOrgAdmin: false,
      isSuperAdmin: false,
      ...overrides,
    };
  }

  function makePrismaMock() {
    return {
      task: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
      projectMember: { findUnique: jest.fn() },
    } as unknown as jest.Mocked<PrismaService>;
  }

  function makeProjectAccessMock() {
    return { assertVisible: jest.fn() } as unknown as jest.Mocked<ProjectAccessService>;
  }

  function makeTaskAccessMock() {
    return { assertVisible: jest.fn() } as unknown as jest.Mocked<TaskAccessService>;
  }

  describe('create', () => {
    it('takes organizationId from the context, never from the dto', async () => {
      const prisma = makePrismaMock();
      (prisma.task.count as jest.Mock).mockResolvedValue(2);
      (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1', number: 3 });
      const projectAccess = makeProjectAccessMock();
      const service = new TasksService(prisma, projectAccess, makeTaskAccessMock());

      await service.create(makeCtx({ orgId: 'org-1' }), 'p1', { title: 'Ship it' });

      expect(projectAccess.assertVisible).toHaveBeenCalledWith(expect.anything(), 'p1');
      expect(prisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organizationId: 'org-1', number: 3, projectId: 'p1' }),
        }),
      );
    });

    it('rejects an assignee that is not a member of this project', async () => {
      const prisma = makePrismaMock();
      (prisma.projectMember.findUnique as jest.Mock).mockResolvedValue(null);
      const service = new TasksService(prisma, makeProjectAccessMock(), makeTaskAccessMock());

      await expect(
        service.create(makeCtx(), 'p1', { title: 'Ship it', assigneeId: 'foreign-member' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('rejects an assigneeId change without assign-tasks', async () => {
      const prisma = makePrismaMock();
      const taskAccess = makeTaskAccessMock();
      (taskAccess.assertVisible as jest.Mock).mockResolvedValue({ id: 't1', projectId: 'p1' });
      const service = new TasksService(prisma, makeProjectAccessMock(), taskAccess);

      await expect(
        service.update(makeCtx({ scopes: ['edit-tasks'] }), 't1', { assigneeId: 'member-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permits a title-only edit without assign-tasks', async () => {
      const prisma = makePrismaMock();
      const taskAccess = makeTaskAccessMock();
      (taskAccess.assertVisible as jest.Mock).mockResolvedValue({ id: 't1', projectId: 'p1' });
      const service = new TasksService(prisma, makeProjectAccessMock(), taskAccess);

      await service.update(makeCtx({ scopes: ['edit-tasks'] }), 't1', { title: 'Renamed' });

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'Renamed' }) }),
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes rather than hard-deleting', async () => {
      const prisma = makePrismaMock();
      const taskAccess = makeTaskAccessMock();
      (taskAccess.assertVisible as jest.Mock).mockResolvedValue({ id: 't1', projectId: 'p1' });
      const service = new TasksService(prisma, makeProjectAccessMock(), taskAccess);

      await service.remove(makeCtx(), 't1');

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
