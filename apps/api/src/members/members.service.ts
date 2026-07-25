import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgMembership } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  listForOrg(organizationId: string) {
    return this.prisma.orgMembership.findMany({
      where: { organizationId, status: { in: ['ACTIVE', 'SUSPENDED'] }, deletedAt: null },
      include: { user: true, roles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRoles(
    organizationId: string,
    membershipId: string,
    roleIds: string[],
  ): Promise<void> {
    await this.findInOrg(organizationId, membershipId);
    await this.assertRolesBelongToOrg(organizationId, roleIds);

    await this.prisma.$transaction([
      this.prisma.membershipRole.deleteMany({ where: { orgMembershipId: membershipId } }),
      this.prisma.membershipRole.createMany({
        data: roleIds.map((roleId) => ({ orgMembershipId: membershipId, roleId })),
      }),
    ]);
  }

  async suspend(organizationId: string, membershipId: string): Promise<OrgMembership> {
    await this.findInOrg(organizationId, membershipId);
    return this.prisma.orgMembership.update({
      where: { id: membershipId },
      data: { status: 'SUSPENDED' },
    });
  }

  async remove(organizationId: string, membershipId: string): Promise<OrgMembership> {
    await this.findInOrg(organizationId, membershipId);
    return this.prisma.orgMembership.update({
      where: { id: membershipId },
      data: { status: 'REMOVED', deletedAt: new Date() },
    });
  }

  // Cross-boundary membership ids are a 404, not a 403 — the same isolation principle
  // Phase 6 formalizes for projects and tasks.
  private async findInOrg(organizationId: string, membershipId: string): Promise<OrgMembership> {
    const membership = await this.prisma.orgMembership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.organizationId !== organizationId || membership.deletedAt) {
      throw new NotFoundException('Member not found.');
    }
    return membership;
  }

  private async assertRolesBelongToOrg(organizationId: string, roleIds: string[]): Promise<void> {
    const matching = await this.prisma.role.count({
      where: { id: { in: roleIds }, organizationId, deletedAt: null },
    });
    if (matching !== roleIds.length) {
      throw new BadRequestException('One or more roles do not belong to this organization.');
    }
  }
}
