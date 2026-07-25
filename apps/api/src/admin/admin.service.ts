import { Injectable, NotFoundException } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export interface AdminStats {
  organizations: number;
  projects: number;
  users: number;
  tasks: number;
}

// Superadmin (level 1) never reaches projectWhere/taskWhere — those exist to enforce a
// tenant filter that must never be absent. Here the absence of an organizationId filter is
// the deliberate, visible point of this surface, not an oversight: every query below either
// carries no org filter at all (cross-org by design) or an explicit one supplied by the
// caller — never one derived from an AccessContext, which for a superadmin has no org to give.
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStats> {
    const [organizations, projects, users, tasks] = await Promise.all([
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.project.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { deletedAt: null } }),
    ]);

    return { organizations, projects, users, tasks };
  }

  listOrganizations(): Promise<Organization[]> {
    return this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrganization(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }

    return organization;
  }

  listProjects(organizationId?: string) {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...(organizationId ? { organizationId } : {}),
    };

    return this.prisma.project.findMany({
      where,
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
