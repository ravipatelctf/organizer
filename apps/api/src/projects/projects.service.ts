import { randomUUID } from 'node:crypto';

import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Project } from '@prisma/client';

import { AccessContext } from '../common/scope/access-context';
import { ProjectAccessService } from '../common/scope/project-access.service';
import { projectWhere } from '../common/scope/project-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  list(ctx: AccessContext) {
    return this.prisma.project.findMany({
      where: projectWhere(ctx),
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(ctx: AccessContext, dto: CreateProjectDto): Promise<Project> {
    if (!ctx.orgId) throw new ForbiddenException('Organization context required.');

    const keyTaken = await this.prisma.project.findUnique({
      where: { organizationId_key: { organizationId: ctx.orgId, key: dto.key } },
    });
    if (keyTaken) {
      throw new ConflictException('A project with this key already exists.');
    }

    const projectId = randomUUID();
    const orgId = ctx.orgId;

    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          id: projectId,
          organizationId: orgId,
          key: dto.key,
          name: dto.name,
          description: dto.description,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          createdById: ctx.userId,
          updatedById: ctx.userId,
        },
      });

      // Without this, a Project Manager (create-projects + view-own-projects, but not
      // view-projects) would create a project and immediately be unable to see it —
      // projectWhere's own branch finds no membership row.
      if (ctx.membershipId) {
        await tx.projectMember.create({
          data: {
            organizationId: orgId,
            projectId,
            orgMembershipId: ctx.membershipId,
            role: 'LEAD',
            addedById: ctx.userId,
          },
        });
      }

      return project;
    });
  }

  async getById(ctx: AccessContext, projectId: string): Promise<Project> {
    return this.projectAccess.assertVisible(ctx, projectId);
  }

  async update(ctx: AccessContext, projectId: string, dto: UpdateProjectDto): Promise<Project> {
    await this.projectAccess.assertVisible(ctx, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
        updatedById: ctx.userId,
      },
    });
  }

  async archive(ctx: AccessContext, projectId: string): Promise<Project> {
    await this.projectAccess.assertVisible(ctx, projectId);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED', updatedById: ctx.userId },
    });
  }

  async remove(ctx: AccessContext, projectId: string): Promise<void> {
    await this.projectAccess.assertVisible(ctx, projectId);

    await this.prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date(), updatedById: ctx.userId },
    });
  }
}
