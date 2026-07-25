import { randomUUID } from 'node:crypto';

import {
  Organization,
  OrgMembership,
  PrismaClient,
  Project,
  ProjectMember,
  Role,
  User,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// The isolation matrix (Phase 9) is unreadable without these. Extended with makeTask in
// Phase 7 once that model exists.

// Every factory-made user shares this password, matching the uniform-password fixture
// convention from Phase 9 — test/auth.ts's login() defaults to it.
export const DEFAULT_TEST_PASSWORD = 'password123';

export async function makeUser(
  prisma: PrismaClient,
  overrides: Partial<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isSuperAdmin: boolean;
  }> = {},
): Promise<User> {
  const suffix = randomUUID().slice(0, 8);
  const passwordHash = await bcrypt.hash(overrides.password ?? DEFAULT_TEST_PASSWORD, 10);
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${suffix}@example.test`,
      passwordHash,
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

export async function makeProject(
  prisma: PrismaClient,
  organizationId: string,
  overrides: Partial<{ key: string; name: string; status: string }> = {},
): Promise<Project> {
  const suffix = randomUUID().slice(0, 8);
  return prisma.project.create({
    data: {
      organizationId,
      key: overrides.key ?? `P${suffix.slice(0, 4).toUpperCase()}`,
      name: overrides.name ?? `Project ${suffix}`,
      status: overrides.status ?? 'ACTIVE',
    },
  });
}

// organizationId is derived from the project, never passed in — a hand-written fixture
// getting the denormalized column wrong would silently break the member-visibility filter.
export async function makeProjectMember(
  prisma: PrismaClient,
  project: Project,
  membership: OrgMembership,
  overrides: Partial<{ role: string }> = {},
): Promise<ProjectMember> {
  return prisma.projectMember.create({
    data: {
      organizationId: project.organizationId,
      projectId: project.id,
      orgMembershipId: membership.id,
      role: overrides.role ?? 'CONTRIBUTOR',
    },
  });
}
