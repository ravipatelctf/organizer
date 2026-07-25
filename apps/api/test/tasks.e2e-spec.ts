import request from 'supertest';

import { as, login } from './auth';
import { makeOrg, makeProject, makeTask } from './factories';
import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

// Same reasoning as projects.e2e-spec.ts: several org-scoped round trips per scenario, each
// paying ProjectScopeGuard's extra query on top of the pooled Neon connection.
jest.setTimeout(45000);

describe('Tasks — isolation is transitive through the project', () => {
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

  async function orgMembershipIdFor(
    actor: Awaited<ReturnType<typeof switchInto>>,
  ): Promise<string> {
    const me = await as(ctx.app, actor).get('/auth/me').expect(200);
    const membership = await ctx.prisma.orgMembership.findFirst({ where: { userId: me.body.sub } });
    return membership!.id;
  }

  it('a member of one project gets 404 on another project task, addressed directly at /orgs/:slug/tasks/:id', async () => {
    const { owner, projectManagerRoleId } = await setupOrg(
      'tasks-member-owner@example.test',
      'acme',
    );

    const apollo = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);
    const borealis = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'BOREALIS', name: 'Borealis' })
      .expect(201);

    const borealisTask = await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${borealis.body.id}/tasks`)
      .send({ title: 'Borealis only task' })
      .expect(201);

    // A Project Manager who creates a project auto-joins it (Phase 6 behaviour) — this
    // one only ever touches Apollo, never Borealis.
    const pm = await inviteAndAccept(owner, 'acme', projectManagerRoleId, 'pm-tasks@example.test');
    await as(ctx.app, pm)
      .post(`/orgs/acme/projects/${apollo.body.id}/tasks`)
      .send({ title: 'Apollo task' })
      .expect(404); // not a member of Apollo yet — ProjectScopeGuard fires on :projectId

    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${apollo.body.id}/members`)
      .send({ orgMembershipId: await orgMembershipIdFor(pm) })
      .expect(201);

    await as(ctx.app, pm)
      .post(`/orgs/acme/projects/${apollo.body.id}/tasks`)
      .send({ title: 'Apollo task' })
      .expect(201);

    await as(ctx.app, pm)
      .patch(`/orgs/acme/tasks/${borealisTask.body.id}`)
      .send({ title: 'Hijacked' })
      .expect(404);
    await as(ctx.app, pm).delete(`/orgs/acme/tasks/${borealisTask.body.id}`).expect(404);
  });

  it('list and create under :projectId are refused with 404 for a project the actor cannot see', async () => {
    const { owner, memberRoleId } = await setupOrg('tasks-list-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'not-on-apollo@example.test');

    await as(ctx.app, member).get(`/orgs/acme/projects/${project.body.id}/tasks`).expect(404);
    await as(ctx.app, member)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Sneaky' })
      .expect(404);
  });

  it('rejects task creation without create-tasks, and permits it with', async () => {
    const { owner, memberRoleId } = await setupOrg('tasks-create-perm-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    // A custom role holding view-own-projects and view-own-tasks but not create-tasks —
    // proves the permission, not just project membership, gates creation.
    const noCreateRole = await as(ctx.app, owner)
      .post('/orgs/acme/roles')
      .send({
        name: 'Viewer Only',
        rank: 5,
        permissionIds: ['view-own-projects', 'view-own-tasks'],
      })
      .expect(201);
    const viewer = await inviteAndAccept(
      owner,
      'acme',
      noCreateRole.body.id,
      'viewer@example.test',
    );
    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId: await orgMembershipIdFor(viewer) })
      .expect(201);

    await as(ctx.app, viewer)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Denied' })
      .expect(403);

    // Member holds create-tasks per DEFAULT_ROLES, but must be on the project first.
    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'creator@example.test');
    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId: await orgMembershipIdFor(member) })
      .expect(201);

    await as(ctx.app, member)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'A task' })
      .expect(201);
  });

  it('rejects an edit without edit-tasks with 403, and a delete without delete-tasks with 403', async () => {
    const { owner, memberRoleId } = await setupOrg('tasks-edit-perm-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);
    const task = await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Editable' })
      .expect(201);

    // Member holds edit-tasks but not delete-tasks per DEFAULT_ROLES.
    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'editor@example.test');
    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId: await orgMembershipIdFor(member) })
      .expect(201);

    await as(ctx.app, member)
      .patch(`/orgs/acme/tasks/${task.body.id}`)
      .send({ title: 'Edited' })
      .expect(200);
    await as(ctx.app, member).delete(`/orgs/acme/tasks/${task.body.id}`).expect(403);
  });

  it('rejects an assigneeId change without assign-tasks, even when edit-tasks is held', async () => {
    const { owner, memberRoleId } = await setupOrg('tasks-assign-perm-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);
    const task = await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Assignable' })
      .expect(201);

    const member = await inviteAndAccept(owner, 'acme', memberRoleId, 'assigner@example.test');
    const memberOrgMembershipId = await orgMembershipIdFor(member);
    const memberOnProject = await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/members`)
      .send({ orgMembershipId: memberOrgMembershipId })
      .expect(201);

    // Member holds edit-tasks but not assign-tasks per DEFAULT_ROLES — the title change
    // in the same request must not be enough to smuggle the assignee change through.
    await as(ctx.app, member)
      .patch(`/orgs/acme/tasks/${task.body.id}`)
      .send({ title: 'Renamed', assigneeId: memberOnProject.body.id })
      .expect(403);

    // The owner (org admin, bypasses the scope check entirely) can assign.
    await as(ctx.app, owner)
      .patch(`/orgs/acme/tasks/${task.body.id}`)
      .send({ assigneeId: memberOnProject.body.id })
      .expect(200);
  });

  it('rejects an assignee that is not a member of the task project', async () => {
    const { owner } = await setupOrg('tasks-foreign-assignee-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Bad assignee', assigneeId: '00000000-0000-0000-0000-000000000000' })
      .expect(404);
  });

  it('rejects a request body carrying organizationId or projectId (whitelist)', async () => {
    const { owner } = await setupOrg('tasks-whitelist-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Sneaky', organizationId: 'not-allowed' })
      .expect(400);
    await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Sneaky', projectId: 'not-allowed' })
      .expect(400);
  });

  it('soft-deletes a task, absent from subsequent list and detail reads', async () => {
    const { owner } = await setupOrg('tasks-delete-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);
    const task = await as(ctx.app, owner)
      .post(`/orgs/acme/projects/${project.body.id}/tasks`)
      .send({ title: 'Removable' })
      .expect(201);

    await as(ctx.app, owner).delete(`/orgs/acme/tasks/${task.body.id}`).expect(200);
    await as(ctx.app, owner).patch(`/orgs/acme/tasks/${task.body.id}`).send({}).expect(404);

    const list = await as(ctx.app, owner)
      .get(`/orgs/acme/projects/${project.body.id}/tasks`)
      .expect(200);
    expect(list.body).toHaveLength(0);
  });

  it('cross-org and cross-org-factory task fixtures are refused with 404', async () => {
    const org = await makeOrg(ctx.prisma, { slug: 'factory-org-tasks' });
    const foreignProject = await makeProject(ctx.prisma, org.id, { key: 'GHOST' });
    const foreignTask = await makeTask(ctx.prisma, foreignProject);

    const { owner } = await setupOrg('tasks-factory-owner@example.test', 'acme');

    await as(ctx.app, owner)
      .patch(`/orgs/acme/tasks/${foreignTask.id}`)
      .send({ title: 'Stolen' })
      .expect(404);
    await as(ctx.app, owner).delete(`/orgs/acme/tasks/${foreignTask.id}`).expect(404);
  });

  it('assigns unique, gapless numbers under concurrent creation', async () => {
    const { owner } = await setupOrg('tasks-concurrency-owner@example.test', 'acme');
    const project = await as(ctx.app, owner)
      .post('/orgs/acme/projects')
      .send({ key: 'APOLLO', name: 'Apollo' })
      .expect(201);

    const CONCURRENCY = 20;
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) =>
        as(ctx.app, owner)
          .post(`/orgs/acme/projects/${project.body.id}/tasks`)
          .send({ title: `Task ${i}` })
          .expect(201),
      ),
    );

    const numbers = results.map((r) => r.body.number as number).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(CONCURRENCY);
    expect(numbers).toEqual(Array.from({ length: CONCURRENCY }, (_, i) => i + 1));
  });
});
