import { randomUUID } from 'node:crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLES } from '@repo/permissions';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { Pool } from 'pg';

// Deterministic fixtures shared by the isolation matrix (apps/api/test/isolation.e2e-spec.ts)
// and by anyone running the app locally for a demo. Every user shares one password so a
// reviewer only needs to remember it once.
const PASSWORD = 'password123';

// Prisma 7 always requires a driver adapter — mirrors app.module.ts's runtime wiring, but
// against DIRECT_URL: this is a one-shot batch of writes, not pooled request traffic.
const pool = new Pool({ connectionString: process.env.DIRECT_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function hashed(): Promise<string> {
  return bcrypt.hash(PASSWORD, 10);
}

async function seedOrgRoles(organizationId: string): Promise<Record<string, string>> {
  const roleIds: Record<string, string> = {};

  for (const roleDefinition of DEFAULT_ROLES) {
    const roleId = randomUUID();
    roleIds[roleDefinition.title] = roleId;

    await prisma.role.create({
      data: {
        id: roleId,
        organizationId,
        name: roleDefinition.title,
        rank: roleDefinition.rank,
        isOrgAdmin: roleDefinition.isOrgAdmin,
        isSystemRole: true,
      },
    });

    await prisma.rolePermission.createMany({
      data: roleDefinition.scopes.map((permissionId) => ({ roleId, permissionId })),
    });
  }

  return roleIds;
}

async function seedMember(
  organizationId: string,
  roleId: string,
  overrides: { email: string; firstName: string; lastName: string },
) {
  const user = await prisma.user.create({
    data: { ...overrides, passwordHash: await hashed() },
  });

  const membership = await prisma.orgMembership.create({
    data: { organizationId, userId: user.id, status: 'ACTIVE', joinedAt: new Date() },
  });

  await prisma.membershipRole.create({ data: { orgMembershipId: membership.id, roleId } });

  return { user, membership };
}

async function seedProject(
  organizationId: string,
  createdById: string,
  overrides: { key: string; name: string },
) {
  return prisma.project.create({
    data: { organizationId, createdById, updatedById: createdById, ...overrides },
  });
}

async function seedTasks(
  organizationId: string,
  project: { id: string },
  createdById: string,
  assigneeId: string | undefined,
  count: number,
) {
  const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  for (let i = 1; i <= count; i++) {
    await prisma.task.create({
      data: {
        organizationId,
        projectId: project.id,
        number: i,
        title: `Task ${i}`,
        status: statuses[i % statuses.length],
        priority: priorities[i % priorities.length],
        assigneeId: i % 2 === 0 ? assigneeId : undefined,
        createdById,
        updatedById: createdById,
      },
    });
  }

  await prisma.project.update({ where: { id: project.id }, data: { taskSequence: count } });
}

async function main() {
  await prisma.user.create({
    data: {
      email: 'super@organizer.dev',
      passwordHash: await hashed(),
      firstName: 'Super',
      lastName: 'Admin',
      isSuperAdmin: true,
    },
  });

  // ── Acme — owner, admin, and two members each restricted to one project ──
  const acme = await prisma.organization.create({ data: { name: 'Acme', slug: 'acme' } });
  const acmeRoles = await seedOrgRoles(acme.id);

  const { user: acmeOwnerUser, membership: acmeOwnerMembership } = await seedMember(
    acme.id,
    acmeRoles['Owner']!,
    { email: 'owner@acme.test', firstName: 'Olivia', lastName: 'Owner' },
  );
  await prisma.organization.update({
    where: { id: acme.id },
    data: { createdById: acmeOwnerUser.id },
  });
  await seedMember(acme.id, acmeRoles['Admin']!, {
    email: 'admin@acme.test',
    firstName: 'Amit',
    lastName: 'Admin',
  });
  const { membership: aliceMembership } = await seedMember(acme.id, acmeRoles['Member']!, {
    email: 'alice@acme.test',
    firstName: 'Alice',
    lastName: 'Analyst',
  });
  const { membership: bobMembership } = await seedMember(acme.id, acmeRoles['Member']!, {
    email: 'bob@acme.test',
    firstName: 'Bob',
    lastName: 'Builder',
  });

  const apollo = await seedProject(acme.id, acmeOwnerUser.id, { key: 'APOLLO', name: 'Apollo' });
  const borealis = await seedProject(acme.id, acmeOwnerUser.id, {
    key: 'BOREALIS',
    name: 'Borealis',
  });

  const [aliceOnApollo, bobOnBorealis] = await Promise.all([
    prisma.projectMember.create({
      data: {
        organizationId: acme.id,
        projectId: apollo.id,
        orgMembershipId: aliceMembership.id,
        role: 'CONTRIBUTOR',
      },
    }),
    prisma.projectMember.create({
      data: {
        organizationId: acme.id,
        projectId: borealis.id,
        orgMembershipId: bobMembership.id,
        role: 'CONTRIBUTOR',
      },
    }),
    prisma.projectMember.create({
      data: {
        organizationId: acme.id,
        projectId: apollo.id,
        orgMembershipId: acmeOwnerMembership.id,
        role: 'LEAD',
      },
    }),
    prisma.projectMember.create({
      data: {
        organizationId: acme.id,
        projectId: borealis.id,
        orgMembershipId: acmeOwnerMembership.id,
        role: 'LEAD',
      },
    }),
  ]);

  await seedTasks(acme.id, apollo, acmeOwnerUser.id, aliceOnApollo.id, 10);
  await seedTasks(acme.id, borealis, acmeOwnerUser.id, bobOnBorealis.id, 10);

  // ── Globex — owner and one member, single project ──
  const globex = await prisma.organization.create({ data: { name: 'Globex', slug: 'globex' } });
  const globexRoles = await seedOrgRoles(globex.id);

  const { user: globexOwnerUser } = await seedMember(globex.id, globexRoles['Owner']!, {
    email: 'owner@globex.test',
    firstName: 'Gwen',
    lastName: 'Owner',
  });
  await prisma.organization.update({
    where: { id: globex.id },
    data: { createdById: globexOwnerUser.id },
  });
  const { membership: carolMembership } = await seedMember(globex.id, globexRoles['Member']!, {
    email: 'carol@globex.test',
    firstName: 'Carol',
    lastName: 'Client',
  });

  const cosmos = await seedProject(globex.id, globexOwnerUser.id, {
    key: 'COSMOS',
    name: 'Cosmos',
  });
  const carolOnCosmos = await prisma.projectMember.create({
    data: {
      organizationId: globex.id,
      projectId: cosmos.id,
      orgMembershipId: carolMembership.id,
      role: 'CONTRIBUTOR',
    },
  });

  await seedTasks(globex.id, cosmos, globexOwnerUser.id, carolOnCosmos.id, 10);

  console.log('Seeded: 1 superadmin, 2 organizations (acme, globex), 3 projects, 30 tasks.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
