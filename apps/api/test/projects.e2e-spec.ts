import request from 'supertest';

import { as, login } from './auth';
import { makeOrg, makeProject, makeUser } from './factories';
import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

// Chains several org-scoped round trips per scenario, each now paying ProjectScopeGuard's
// extra query on top — comfortably over the shared 15s default against a pooled Neon
// connection. Matches rbac.e2e-spec.ts's timeout.
jest.setTimeout(45000);

describe('Projects — isolation boundary #2', () => {
  let ctx: TestApp;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.prisma);
  });

  async function registerAndLogin(email: string) {
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'password123', firstName: 'Test', lastName: 'User' })
      .expect(201);
    return login(ctx.app, email);
  }

  async function switchInto(actor: Awaited<ReturnType<typeof login>>, slug: string) {
    const res = await as(ctx.app, actor).post(`/orgs/${slug}/switch`).expect(200);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const refreshToken = setCookie
      .find((cookie) => cookie.startsWith('refresh_token='))
      ?.split(';')[0]
      ?.split('=')[1]!;
    return { ...actor, accessToken: res.body.accessToken as string, refreshToken };
  }

  async function setupOrg(ownerEmail: string, slug: string) {
    const owner = await registerAndLogin(ownerEmail);
    await as(ctx.app, owner).post('/organizations').send({ name: 'Acme', slug }).expect(201);
    const scopedOwner = await switchInto(owner, slug);

    const roles = await as(ctx.app, scopedOwner).get(`/orgs/${slug}/roles`).expect(200);
    const memberRoleId = roles.body.find((r: { name: string }) => r.name === 'Member').id as string;
    const projectManagerRoleId = roles.body.find(
      (r: { name: string }) => r.name === 'Project Manager',
    ).id as string;

    return { owner: scopedOwner, memberRoleId, projectManagerRoleId };
  }

  async function inviteAndAccept(
    owner: Awaited<ReturnType<typeof switchInto>>,
    slug: string,
    roleId: string,
    inviteeEmail: string,
  ) {
    const invitee = await registerAndLogin(inviteeEmail);

    const invite = await as(ctx.app, owner)
      .post(`/orgs/${slug}/invitations`)
      .send({ email: inviteeEmail, roleIds: [roleId] })
      .expect(201);

    await as(ctx.app, invitee)
      .post('/invitations/accept')
      .send({ token: invite.body.token })
      .expect(200);

    return switchInto(invitee, slug);
  }

  it('an org admin sees every project in their org', async () => {
    const { owner } = await setupOrg('admin-sees-both-owner@example.test', 'acme');

    await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);
    await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'BOREALIS', name: 'Borealis' })
      .expect(201);

    const res = await as(ctx.app, owner).get('/orgs/acme/projects').expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((p: { key: string }) => p.key).sort()).toEqual(['APOLLO', 'BOREALIS']);
  });

  it('a project member sees only projects they are on', async () => {
    const { owner, projectManagerRoleId } = await setupOrg(
      'member-sees-own-owner@example.test',
      'acme',
    );

    const apollo = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    const pm = await inviteAndAccept(owner, 'acme', projectManagerRoleId, 'pm@example.test');
    const cosmos = await as(ctx.app, pm)
      .post('/orgs/acme/projects')
      .send({ key: 'COSMOS', name: 'Cosmos' })
      .expect(201);

    const res = await as(ctx.app, pm).get('/orgs/acme/projects').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].key).toBe('COSMOS');

    // Not a member of Apollo — 404, not 403.
    await as(ctx.app, pm).get(`/orgs/acme/projects/${apollo.body.id}`).expect(404);
    await as(ctx.app, pm).get(`/orgs/acme/projects/${cosmos.body.id}`).expect(200);
  });

  it('a cross-org project id is refused with 404 on every verb', async () => {
    const { owner: acmeOwner } = await setupOrg('cross-org-acme-owner@example.test', 'acme');
    const { owner: globexOwner } = await setupOrg('cross-org-globex-owner@example.test', 'globex');

    const globexProject = await as(ctx.app, globexOwner)
      .post('/orgs/globex/projects')
      .send({ key: 'NOVA', name: 'Nova' })
      .expect(201);
    const foreignId = globexProject.body.id;

    await as(ctx.app, acmeOwner).get(`/orgs/acme/projects/${foreignId}`).expect(404);
    await as(ctx.app, acmeOwner)
      .patch(`/orgs/acme/projects/${foreignId}`)
      .send({ name: 'Renamed' })
      .expect(404);
    await as(ctx.app, acmeOwner).post(`/orgs/acme/projects/${foreignId}/archive`).expect(404);
    await as(ctx.app, acmeOwner).delete(`/orgs/acme/projects/${foreignId}`).expect(404);
  });

  it('rejects project creation without create-projects, and permits it with', async () => {
    const { owner, memberRoleId } = await setupOrg('create-perm-owner@example.test', 'acme');
    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'plain-member@example.test');

    await as(ctx.app, member)
      .post('/orgs/acme/projects')
      .send({ key: 'DENIED', name: 'Denied' })
      .expect(403);

    await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'ALLOWED', name: 'Allowed' })
      .expect(201);
  });

  it('refuses an edit without edit-projects with 403, not 404, on a project the actor can see', async () => {
    const { owner, memberRoleId } = await setupOrg('edit-perm-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    // Member holds view-own-projects but not edit-projects per DEFAULT_ROLES.
    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'member-edit@example.test');
    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId: await orgMembershipIdFor(member) })
      .expect(201);

    // The actor can see the project (proving they're genuinely on it) but is still
    // refused the edit — 403, not the 404 a non-member would get.
    await as(ctx.app, member).get(`/orgs/acme/projects/${project.body.id}`).expect(200);
    await as(ctx.app, member)
      .patch(`/orgs/acme/projects/${project.body.id}`)
      .send({ name: 'Apollo Renamed' })
      .expect(403);
  });

  it('rejects a duplicate key in the same org, but allows the same key in a different org', async () => {
    const { owner: acmeOwner } = await setupOrg('dup-key-acme-owner@example.test', 'acme');
    const { owner: globexOwner } = await setupOrg('dup-key-globex-owner@example.test', 'globex');

    await as(ctx.app, acmeOwner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);
    await as(ctx.app, acmeOwner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo Clone' })
      .expect(409);

    await as(ctx.app, globexOwner)
      .post('/orgs/globex/projects')
      .send({ key: 'APOLLO', name: 'Apollo In Globex' })
      .expect(201);
  });

  it('rejects a request body carrying organizationId (whitelist)', async () => {
    const { owner } = await setupOrg('whitelist-owner@example.test', 'acme');

    await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo', organizationId: 'not-allowed' })
      .expect(400);
  });

  it('archives and soft-deletes a project, both visible in subsequent reads', async () => {
    const { owner } = await setupOrg('archive-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    await as(ctx.app, owner).post(`/orgs/acme/projects/${project.body.id}/archive`).expect(200);
    const archived = await as(ctx.app, owner)
      .get(`/orgs/acme/projects/${project.body.id}`)
      .expect(200);
    expect(archived.body.status).toBe('ARCHIVED');

    await as(ctx.app, owner).delete(`/orgs/acme/projects/${project.body.id}`).expect(200);
    await as(ctx.app, owner).get(`/orgs/acme/projects/${project.body.id}`).expect(404);
    const list = await as(ctx.app, owner).get('/orgs/acme/projects').expect(200);
    expect(list.body).toHaveLength(0);
  });

  it('adding a project member flips their visibility from 404 to 200, and removal flips it back', async () => {
    const { owner, memberRoleId } = await setupOrg('member-visibility-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'visibility@example.test');
    await as(ctx.app, member).get(`/orgs/acme/projects/${project.body.id}`).expect(404);

    const orgMembershipId = await orgMembershipIdFor(member);
    const added = await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId })
      .expect(201);

    await as(ctx.app, member).get(`/orgs/acme/projects/${project.body.id}`).expect(200);

    await as(ctx.app, owner)
      .delete(`/orgs/acme/projects/${project.body.id}/members/${added.body.id}`)
      .expect(200);
    await as(ctx.app, member).get(`/orgs/acme/projects/${project.body.id}`).expect(404);

    // Re-adding the same, now soft-deleted, membership row must succeed (the upsert path)
    // rather than throwing a raw unique-constraint error.
    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId })
      .expect(201);
    await as(ctx.app, member).get(`/orgs/acme/projects/${project.body.id}`).expect(200);
  });

  it('rejects adding a member from another org', async () => {
    const { owner: acmeOwner } = await setupOrg('add-member-acme-owner@example.test', 'acme');
    const { owner: globexOwner, memberRoleId: globexMemberRoleId } = await setupOrg(
      'add-member-globex-owner@example.test',
      'globex',
    );

    const project = await as(ctx.app, acmeOwner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    const globexMember = await inviteAndAccept(
      globexOwner,
      'globex',
      globexMemberRoleId,
      'cross-org-member@example.test',
    );
    const foreignOrgMembershipId = await orgMembershipIdFor(globexMember);

    await as(ctx.app, acmeOwner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId: foreignOrgMembershipId })
      .expect(404);
  });

  it('rejects adding a member whose org membership is not yet ACTIVE', async () => {
    const { owner, memberRoleId } = await setupOrg('pending-invite-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    await registerAndLogin('pending-invite@example.test');
    const invite = await as(ctx.app, owner)
      .post('/orgs/acme/invitations')
      .send({ email: 'pending-invite@example.test', roleIds: [memberRoleId] })
      .expect(201);

    // Never accepted — the membership stays INVITED, not ACTIVE.
    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId: invite.body.id })
      .expect(400);
  });

  it('rejects a plain member managing project members without manage-project-members', async () => {
    const { owner, memberRoleId } = await setupOrg('manage-members-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'no-manage@example.test');
    const orgMembershipId = await orgMembershipIdFor(member);

    await as(ctx.app, member)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId })
      .expect(403);
  });

  it('cross-org and cross-org-factory fixtures are refused with 404', async () => {
    const org = await makeOrg(ctx.prisma, { slug: 'factory-org' });
    const foreignProject = await makeProject(ctx.prisma, org.id, { key: 'GHOST' });

    const { owner } = await setupOrg('factory-owner@example.test', 'acme');

    await as(ctx.app, owner).get(`/orgs/acme/projects/${foreignProject.id}`).expect(404);
  });

  it('a superadmin is refused under /orgs/*, even on a :projectId route', async () => {
    await makeUser(ctx.prisma, { email: 'super-projects@example.test', isSuperAdmin: true });
    const superadmin = await login(ctx.app, 'super-projects@example.test');

    const { owner } = await setupOrg('super-target-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    await as(ctx.app, superadmin).get(`/orgs/acme/projects/${project.body.id}`).expect(403);
  });

  // Project-member endpoints key off OrgMembership.id, not the user id — look it up via
  // the JWT's sub claim. Each test uses a fresh single-org user, so findFirst is safe.
  async function orgMembershipIdFor(
    actor: Awaited<ReturnType<typeof switchInto>>,
  ): Promise<string> {
    const me = await as(ctx.app, actor).get('/auth/me').expect(200);
    const membership = await ctx.prisma.orgMembership.findFirst({ where: { userId: me.body.sub } });
    return membership!.id;
  }
});
