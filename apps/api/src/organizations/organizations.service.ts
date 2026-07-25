import { randomUUID } from 'node:crypto';

import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { DEFAULT_ROLES } from '@repo/permissions';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Seeds the four default roles from the permission registry and lands the creator as
  // Owner — all in one transaction so a half-seeded organization can never exist.
  async create(dto: CreateOrganizationDto, creatorUserId: string): Promise<Organization> {
    const slugTaken = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (slugTaken) {
      throw new ConflictException('An organization with this slug already exists.');
    }

    // Role and membership ids are generated client-side so every row can be written with
    // createMany — batched round trips instead of one per role — which keeps the whole
    // seed comfortably inside the interactive transaction's timeout over a pooled
    // connection to Neon.
    const organizationId = randomUUID();
    const membershipId = randomUUID();
    const roleIds = DEFAULT_ROLES.map(() => randomUUID());
    const ownerIndex = DEFAULT_ROLES.findIndex((role) => role.title === 'Owner');

    return this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.create({
          data: { id: organizationId, name: dto.name, slug: dto.slug, createdById: creatorUserId },
        });

        await tx.role.createMany({
          data: DEFAULT_ROLES.map((roleDefinition, index) => ({
            id: roleIds[index]!,
            organizationId,
            name: roleDefinition.title,
            rank: roleDefinition.rank,
            isOrgAdmin: roleDefinition.isOrgAdmin,
            isSystemRole: true,
          })),
        });

        await tx.rolePermission.createMany({
          data: DEFAULT_ROLES.flatMap((roleDefinition, index) =>
            roleDefinition.scopes.map((permissionId) => ({
              roleId: roleIds[index]!,
              permissionId,
            })),
          ),
        });

        await tx.orgMembership.create({
          data: {
            id: membershipId,
            organizationId,
            userId: creatorUserId,
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
        });

        await tx.membershipRole.create({
          data: {
            orgMembershipId: membershipId,
            roleId: roleIds[ownerIndex]!,
            assignedById: creatorUserId,
          },
        });

        return organization;
      },
      { timeout: 15000 },
    );
  }

  async isSlugAvailable(slug: string): Promise<boolean> {
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    return !existing;
  }

  async listForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.prisma.orgMembership.findMany({
      where: { userId, status: 'ACTIVE', deletedAt: null },
      include: { organization: true },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships
      .map((membership) => membership.organization)
      .filter((organization) => !organization.deletedAt);
  }

  async update(organizationId: string, dto: UpdateOrganizationDto): Promise<Organization> {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.settings !== undefined ? { settings: dto.settings } : {}),
      },
    });
  }

  // Verifies the actor holds an ACTIVE membership in the target organization before the
  // controller re-mints a token for it.
  async assertActiveMembership(userId: string, organizationId: string): Promise<void> {
    const membership = await this.prisma.orgMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });

    if (!membership || membership.status !== 'ACTIVE' || membership.deletedAt) {
      throw new ForbiddenException('Not a member of this organization.');
    }
  }
}
