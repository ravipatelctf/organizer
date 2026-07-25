import { Injectable, NotFoundException } from '@nestjs/common';
import { Task } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AccessContext } from './access-context';
import { taskWhere } from './project-scope.util';

@Injectable()
export class TaskAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // findFirst, not findUnique — taskWhere returns relation filters that findUnique's
  // where can't accept. This is what keeps /orgs/:orgSlug/tasks/:id a 404 across a
  // boundary even though ProjectScopeGuard no-ops on a route with no :projectId param.
  async assertVisible(ctx: AccessContext, taskId: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: { ...taskWhere(ctx), id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    return task;
  }
}
