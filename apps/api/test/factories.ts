import { randomUUID } from 'node:crypto';

import { Organization, OrgMembership, PrismaClient, Role, User } from '@prisma/client';

// The isolation matrix (Phase 9) is unreadable without these. Extended with makeProject/
// makeTask in Phase 6/7 once those models exist.

export async function makeUser(
  prisma: PrismaClient,
  overrides: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    isSuperAdmin: boolean;
  }> = {},
): Promise<User> {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${suffix}@example.test`,
      passwordHash: 'test-hash',
      firstName: overrides.firstName ?? 'Test',
      lastName: overrides.lastName ?? 'User',
      isSuperAdmin: overrides.isSuperAdmin ?? false,
    },
  });
}

export async function makeOrg(
  prisma: PrismaClient,
  overrides: Partial<{ name: string; slug: string }> = {},
): Promise<Organization> {
  const suffix = randomUUID().slice(0, 8);
  return prisma.organization.create({
    data: {
      name: overrides.name ?? `Org ${suffix}`,
      slug: overrides.slug ?? `org-${suffix}`,
    },
  });
}

export async function makeRole(
  prisma: PrismaClient,
  organizationId: string,
  overrides: Partial<{ name: string; rank: number; isOrgAdmin: boolean }> = {},
): Promise<Role> {
  return prisma.role.create({
    data: {
      organizationId,
      name: overrides.name ?? 'Member',
      rank: overrides.rank ?? 4,
      isOrgAdmin: overrides.isOrgAdmin ?? false,
      isSystemRole: true,
    },
  });
}

// Pass `role` to also assign it via membership_roles — the "(role)" in the harness's own
// naming convention for this factory.
export async function makeMembership(
  prisma: PrismaClient,
  user: User,
  org: Organization,
  role?: Role,
): Promise<OrgMembership> {
  const membership = await prisma.orgMembership.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  });

  if (role) {
    await prisma.membershipRole.create({
      data: { orgMembershipId: membership.id, roleId: role.id },
    });
  }

  return membership;
}
