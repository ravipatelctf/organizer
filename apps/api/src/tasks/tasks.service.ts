import { randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PERMS, userHasPermission } from '@repo/permissions';

import { AccessContext } from '../common/scope/access-context';
import { ProjectAccessService } from '../common/scope/project-access.service';
import { taskWhere } from '../common/scope/project-scope.util';
import { TaskAccessService } from '../common/scope/task-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
    private readonly taskAccess: TaskAccessService,
  ) {}

  async list(ctx: AccessContext, projectId: string) {
    await this.projectAccess.assertVisible(ctx, projectId);

    return this.prisma.task.findMany({
      where: { ...taskWhere(ctx), projectId },
      orderBy: { number: 'asc' },
    });
  }

  async create(ctx: AccessContext, projectId: string, dto: CreateTaskDto): Promise<Task> {
    await this.projectAccess.assertVisible(ctx, projectId);
    if (!ctx.orgId) throw new ForbiddenException('Organization context required.');

    if (dto.assigneeId) {
      await this.assertAssigneeInProject(projectId, dto.assigneeId);
    }

    const taskId = randomUUID();
    const orgId = ctx.orgId;

    // Incrementing task_sequence and reading it back happen inside the same transaction
    // as the insert, so concurrent creates against the same project serialize on that row
    // and get unique, gapless numbers rather than racing on a read-then-write. A burst of
    // concurrent creates against one project queues on this row lock, so the defaults
    // (2s wait, 5s timeout) are too tight against a pooled Neon connection — widen both.
    return this.prisma.$transaction(
      async (tx) => {
        const project = await tx.project.update({
          where: { id: projectId },
          data: { taskSequence: { increment: 1 } },
        });

        return tx.task.create({
          data: {
            id: taskId,
            organizationId: orgId,
            projectId,
            number: project.taskSequence,
            title: dto.title,
            description: dto.description,
            priority: dto.priority ?? 'MEDIUM',
            assigneeId: dto.assigneeId,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            createdById: ctx.userId,
            updatedById: ctx.userId,
          },
        });
      },
      { maxWait: 15000, timeout: 15000 },
    );
  }

  async update(ctx: AccessContext, taskId: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.taskAccess.assertVisible(ctx, taskId);

    if (dto.assigneeId !== undefined) {
      // assign-tasks is checked independently of edit-tasks — a Member holding
      // edit-tasks but not assign-tasks can edit a task's title without being able to
      // reassign it.
      const canAssign =
        ctx.isOrgAdmin || ctx.isSuperAdmin || userHasPermission(ctx.scopes, PERMS.task.assign);
      if (!canAssign) throw new ForbiddenException('Missing permission: assign-tasks.');
      await this.assertAssigneeInProject(task.projectId, dto.assigneeId);
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        updatedById: ctx.userId,
      },
    });
  }

  async remove(ctx: AccessContext, taskId: string): Promise<void> {
    await this.taskAccess.assertVisible(ctx, taskId);

    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date(), updatedById: ctx.userId },
    });
  }

  // Cross-org / cross-project existence leak avoidance, same posture as
  // ProjectMembersService.add's membership check — a mismatch is a 404, not a 400.
  private async assertAssigneeInProject(projectId: string, assigneeId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({ where: { id: assigneeId } });
    if (!member || member.projectId !== projectId || member.deletedAt) {
      throw new NotFoundException('Assignee is not a member of this project.');
    }
  }
}
