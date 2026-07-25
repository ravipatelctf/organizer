import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectMember } from '@prisma/client';

import { AccessContext } from '../common/scope/access-context';
import { ProjectAccessService } from '../common/scope/project-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto, UpdateProjectMemberDto } from './dto';

@Injectable()
export class ProjectMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async list(ctx: AccessContext, projectId: string) {
    await this.projectAccess.assertVisible(ctx, projectId);

    return this.prisma.projectMember.findMany({
      where: { projectId, deletedAt: null },
      include: { membership: { include: { user: { omit: { passwordHash: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async add(
    ctx: AccessContext,
    projectId: string,
    dto: AddProjectMemberDto,
  ): Promise<ProjectMember> {
    await this.projectAccess.assertVisible(ctx, projectId);
    const orgId = ctx.orgId;
    if (!orgId) throw new ForbiddenException('Organization context required.');

    const membership = await this.prisma.orgMembership.findUnique({
      where: { id: dto.orgMembershipId },
    });
    if (!membership || membership.organizationId !== orgId || membership.deletedAt) {
      throw new NotFoundException('Member not found.');
    }
    if (membership.status !== 'ACTIVE') {
      throw new BadRequestException('Member is not active.');
    }

    // @@unique([projectId, orgMembershipId]) spans soft-deleted rows — a plain create
    // would throw a raw P2002 on re-adding a previously removed member. upsert revives it.
    return this.prisma.projectMember.upsert({
      where: { projectId_orgMembershipId: { projectId, orgMembershipId: dto.orgMembershipId } },
      create: {
        organizationId: orgId,
        projectId,
        orgMembershipId: dto.orgMembershipId,
        role: dto.role ?? 'CONTRIBUTOR',
        addedById: ctx.userId,
      },
      update: {
        deletedAt: null,
        role: dto.role ?? 'CONTRIBUTOR',
        addedById: ctx.userId,
      },
    });
  }

  async updateRole(
    ctx: AccessContext,
    projectId: string,
    projectMemberId: string,
    dto: UpdateProjectMemberDto,
  ): Promise<ProjectMember> {
    await this.projectAccess.assertVisible(ctx, projectId);
    await this.findInProject(projectId, projectMemberId);

    return this.prisma.projectMember.update({
      where: { id: projectMemberId },
      data: { role: dto.role },
    });
  }

  async remove(ctx: AccessContext, projectId: string, projectMemberId: string): Promise<void> {
    await this.projectAccess.assertVisible(ctx, projectId);
    await this.findInProject(projectId, projectMemberId);

    // No last-LEAD or self-removal guard yet — out of scope for Phase 6.
    await this.prisma.projectMember.update({
      where: { id: projectMemberId },
      data: { deletedAt: new Date() },
    });
  }

  private async findInProject(projectId: string, projectMemberId: string): Promise<ProjectMember> {
    const member = await this.prisma.projectMember.findUnique({ where: { id: projectMemberId } });
    if (!member || member.projectId !== projectId || member.deletedAt) {
      throw new NotFoundException('Project member not found.');
    }
    return member;
  }
}
