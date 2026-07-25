import { Injectable, NotFoundException } from '@nestjs/common';
import { Project } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AccessContext } from './access-context';
import { projectWhere } from './project-scope.util';

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  // findFirst, not findUnique — projectWhere returns relation filters that findUnique's
  // where can't accept.
  async assertVisible(ctx: AccessContext, projectId: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: { ...projectWhere(ctx), id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    return project;
  }
}
