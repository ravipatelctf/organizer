import { PERMS } from '@repo/permissions';
import request from 'supertest';

import { as, login } from './auth';
import {
  makeMembership,
  makeOrg,
  makeProject,
  makeProjectMember,
  makeRole,
  makeTask,
  makeUser,
} from './factories';
import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

// The full cross-boundary matrix from brainstorm/implementation-phases.md §11, collapsed into
// one table instead of the narrative assertions projects/tasks/admin.e2e-spec.ts already carry.
jest.setTimeout(45000);

interface World {
  superadmin: Awaited<ReturnType<typeof login>>;
  acmeOwner: Awaited<ReturnType<typeof login>>;
  alice: Awaited<ReturnType<typeof login>>;
  carol: Awaited<ReturnType<typeof login>>;
  apolloId: string;
  otherProjectId: string;
  apolloTaskId: string;
  otherTaskId: string;
  globexProjectId: string;
}

describe('Isolation matrix', () => {
  let ctx: TestApp;
  let world: World;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function switchInto(actor: Awaited<ReturnType<typeof login>>, slug: string) {
    const res = await as(ctx.app, actor).post(`/orgs/${slug}/switch`).expect(200);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const refreshToken = setCookie
      .find((cookie) => cookie.startsWith('refresh_token='))
      ?.split(';')[0]
      ?.split('=')[1]!;
    return { ...actor, accessToken: res.body.accessToken as string, refreshToken };
  }

  async function grant(roleId: string, permissionIds: readonly string[]) {
    await ctx.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
    });
  }

  async function buildWorld(): Promise<World> {
    const acme = await makeOrg(ctx.prisma, { slug: 'acme' });
    const globex = await makeOrg(ctx.prisma, { slug: 'globex' });

    const acmeOwnerRole = await makeRole(ctx.prisma, acme.id, {
      name: 'Owner',
      rank: 1,
      isOrgAdmin: true,
    });
    const acmeMemberRole = await makeRole(ctx.prisma, acme.id, {
      name: 'Member',
      isOrgAdmin: false,
    });
    await grant(acmeMemberRole.id, [PERMS.project.viewOwn.id, PERMS.task.viewOwn.id]);
    const globexOwnerRole = await makeRole(ctx.prisma, globex.id, {
      name: 'Owner',
      isOrgAdmin: true,
    });
    const globexMemberRole = await makeRole(ctx.prisma, globex.id, {
      name: 'Member',
      isOrgAdmin: false,
    });
    await grant(globexMemberRole.id, [PERMS.project.viewOwn.id]);

    const apollo = await makeProject(ctx.prisma, acme.id, { key: 'APOLLO' });
    const otherProject = await makeProject(ctx.prisma, acme.id, { key: 'OTHER' });
    const apolloTask = await makeTask(ctx.prisma, apollo);
    const otherTask = await makeTask(ctx.prisma, otherProject);
    const globexProject = await makeProject(ctx.prisma, globex.id, { key: 'COSMOS' });

    await makeUser(ctx.prisma, { email: 'super@isolation.test', isSuperAdmin: true });

    const acmeOwnerUser = await makeUser(ctx.prisma, { email: 'owner@acme.isolation.test' });
    await makeMembership(ctx.prisma, acmeOwnerUser, acme, acmeOwnerRole);

    const aliceUser = await makeUser(ctx.prisma, { email: 'alice@acme.isolation.test' });
    const aliceMembership = await makeMembership(ctx.prisma, aliceUser, acme, acmeMemberRole);
    await makeProjectMember(ctx.prisma, apollo, aliceMembership);

    const globexOwnerUser = await makeUser(ctx.prisma, { email: 'owner@globex.isolation.test' });
    await makeMembership(ctx.prisma, globexOwnerUser, globex, globexOwnerRole);

    const carolUser = await makeUser(ctx.prisma, { email: 'carol@globex.isolation.test' });
    await makeMembership(ctx.prisma, carolUser, globex, globexMemberRole);

    const superadmin = await login(ctx.app, 'super@isolation.test');
    const acmeOwner = await switchInto(await login(ctx.app, 'owner@acme.isolation.test'), 'acme');
    const alice = await switchInto(await login(ctx.app, 'alice@acme.isolation.test'), 'acme');
    const carol = await switchInto(await login(ctx.app, 'carol@globex.isolation.test'), 'globex');

    return {
      superadmin,
      acmeOwner,
      alice,
      carol,
      apolloId: apollo.id,
      otherProjectId: otherProject.id,
      apolloTaskId: apolloTask.id,
      otherTaskId: otherTask.id,
      globexProjectId: globexProject.id,
    };
  }

  beforeEach(async () => {
    await truncateAll(ctx.prisma);
    world = await buildWorld();
  });

  const rows: Array<{
    label: string;
    actor: (w: World) => Awaited<ReturnType<typeof login>>;
    method: 'get' | 'post';
    path: (w: World) => string;
    expected: number;
  }> = [
    {
      label: 'superadmin lists every org via /admin/projects',
      actor: (w) => w.superadmin,
      method: 'get',
      path: () => '/admin/projects',
      expected: 200,
    },
    {
      label: 'superadmin is refused on /orgs/*, pointed at /admin/*',
      actor: (w) => w.superadmin,
      method: 'get',
      path: () => '/orgs/acme/projects',
      expected: 403,
    },
    {
      label: 'acme owner sees their org',
      actor: (w) => w.acmeOwner,
      method: 'get',
      path: () => '/orgs/acme/projects',
      expected: 200,
    },
    {
      label: "acme owner gets 404 on globex's project id",
      actor: (w) => w.acmeOwner,
      method: 'get',
      path: (w) => `/orgs/acme/projects/${w.globexProjectId}`,
      expected: 404,
    },
    {
      label: "an acme token is refused under globex's routes",
      actor: (w) => w.acmeOwner,
      method: 'get',
      path: () => '/orgs/globex/projects',
      expected: 403,
    },
    {
      label: 'alice (member) sees only her project list',
      actor: (w) => w.alice,
      method: 'get',
      path: () => '/orgs/acme/projects',
      expected: 200,
    },
    {
      label: 'alice gets 404 on a same-org project she is not on',
      actor: (w) => w.alice,
      method: 'get',
      path: (w) => `/orgs/acme/projects/${w.otherProjectId}`,
      expected: 404,
    },
    {
      label: "alice sees her project's tasks",
      actor: (w) => w.alice,
      method: 'get',
      path: (w) => `/orgs/acme/projects/${w.apolloId}/tasks`,
      expected: 200,
    },
    {
      label: 'alice gets 404 on a task under a project she is not on',
      actor: (w) => w.alice,
      method: 'get',
      path: (w) => `/orgs/acme/tasks/${w.otherTaskId}`,
      expected: 404,
    },
    {
      label: 'alice is refused creating a project (no create-projects)',
      actor: (w) => w.alice,
      method: 'post',
      path: () => '/orgs/acme/projects',
      expected: 403,
    },
    {
      label: "carol's globex token is refused under acme's routes",
      actor: (w) => w.carol,
      method: 'get',
      path: () => '/orgs/acme/projects',
      expected: 403,
    },
  ];

  it.each(rows)('$label', async ({ actor, method, path, expected }) => {
    const req = as(ctx.app, actor(world))[method](path(world));
    await req.send({}).expect(expected);
  });

  it('rejects a request body carrying organizationId (whitelist)', async () => {
    await as(ctx.app, world.acmeOwner)
      .post('/orgs/acme/projects')
      .send({ key: 'NEW', name: 'New', organizationId: 'not-allowed' })
      .expect(400);
  });

  it('a suspended member is refused on their next refresh', async () => {
    const suspendedUser = await makeUser(ctx.prisma, { email: 'suspended@acme.isolation.test' });
    const acme = await ctx.prisma.organization.findUniqueOrThrow({ where: { slug: 'acme' } });
    const memberRole = await ctx.prisma.role.findFirstOrThrow({
      where: { organizationId: acme.id, name: 'Member' },
    });
    const membership = await makeMembership(ctx.prisma, suspendedUser, acme, memberRole);
    const scoped = await switchInto(await login(ctx.app, 'suspended@acme.isolation.test'), 'acme');

    await ctx.prisma.orgMembership.update({
      where: { id: membership.id },
      data: { status: 'SUSPENDED' },
    });

    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${scoped.refreshToken}`])
      .expect(403);
  });
});
