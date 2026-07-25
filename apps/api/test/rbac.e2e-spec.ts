import request from 'supertest';

import { as, login } from './auth';
import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

// Each scenario here chains several org-scoped round trips (create org, switch, invite,
// accept, sometimes a second org) — comfortably over the shared 15s default against a
// pooled connection to Neon.
jest.setTimeout(45000);

describe('RBAC — members, invitations, roles', () => {
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
    // The switch rotates the session — the new refresh cookie is org-bound, unlike the
    // account-level one the actor logged in with.
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
    const memberRole = roles.body.find((r: { name: string }) => r.name === 'Member');

    return { owner: scopedOwner, memberRoleId: memberRole.id as string };
  }

  async function inviteAndAccept(
    owner: Awaited<ReturnType<typeof switchInto>>,
    slug: string,
    memberRoleId: string,
    inviteeEmail: string,
  ) {
    const invitee = await registerAndLogin(inviteeEmail);

    const invite = await as(ctx.app, owner)
      .post(`/orgs/${slug}/invitations`)
      .send({ email: inviteeEmail, roleIds: [memberRoleId] })
      .expect(201);

    await as(ctx.app, invitee)
      .post('/invitations/accept')
      .send({ token: invite.body.token })
      .expect(200);

    return { invitee, token: invite.body.token as string };
  }

  it('invites, accepts, and lands the invitee with the Member role', async () => {
    const { owner, memberRoleId } = await setupOrg('rbac-owner@example.test', 'acme');
    const { invitee } = await inviteAndAccept(owner, 'acme', memberRoleId, 'invitee@example.test');

    const scopedInvitee = await switchInto(invitee, 'acme');
    const me = await as(ctx.app, scopedInvitee).get('/auth/me').expect(200);
    expect(me.body.isOrgAdmin).toBe(false);
    expect(me.body.scopes).toEqual(expect.arrayContaining(['view-own-projects', 'create-tasks']));

    const members = await as(ctx.app, owner).get('/orgs/acme/members').expect(200);
    expect(
      members.body.some(
        (m: { user: { email: string } }) => m.user.email === 'invitee@example.test',
      ),
    ).toBe(true);
  });

  it('a Member gets 403 creating a role; the Owner bypasses via isOrgAdmin', async () => {
    const { owner, memberRoleId } = await setupOrg('member-403-owner@example.test', 'acme');
    const { invitee } = await inviteAndAccept(
      owner,
      'acme',
      memberRoleId,
      'member-403@example.test',
    );
    const scopedInvitee = await switchInto(invitee, 'acme');

    await as(ctx.app, scopedInvitee)
      .post('/orgs/acme/roles')
      .send({ name: 'Should Fail', rank: 10, permissionIds: ['view-members'] })
      .expect(403);

    await as(ctx.app, owner)
      .post('/orgs/acme/roles')
      .send({ name: 'Should Succeed', rank: 10, permissionIds: ['view-members'] })
      .expect(201);
  });

  it('rejects accepting an invitation with someone else’s token', async () => {
    const { owner, memberRoleId } = await setupOrg('wrong-user-owner@example.test', 'acme');
    const invitee = await registerAndLogin('wrong-user-invitee@example.test');
    const stranger = await registerAndLogin('wrong-user-stranger@example.test');

    const invite = await as(ctx.app, owner)
      .post('/orgs/acme/invitations')
      .send({ email: 'wrong-user-invitee@example.test', roleIds: [memberRoleId] })
      .expect(201);

    await as(ctx.app, stranger)
      .post('/invitations/accept')
      .send({ token: invite.body.token })
      .expect(403);

    // The rightful invitee can still accept afterward.
    await as(ctx.app, invitee)
      .post('/invitations/accept')
      .send({ token: invite.body.token })
      .expect(200);
  });

  it('rejects an unknown or already-used invitation token', async () => {
    await setupOrg('bogus-token-owner@example.test', 'acme');
    const someone = await registerAndLogin('bogus-token-user@example.test');

    await as(ctx.app, someone)
      .post('/invitations/accept')
      .send({ token: 'not-a-real-token' })
      .expect(401);
  });

  it('revokes a pending invitation, which can no longer be accepted', async () => {
    const { owner, memberRoleId } = await setupOrg('revoke-owner@example.test', 'acme');
    const invitee = await registerAndLogin('revoke-invitee@example.test');

    const invite = await as(ctx.app, owner)
      .post('/orgs/acme/invitations')
      .send({ email: 'revoke-invitee@example.test', roleIds: [memberRoleId] })
      .expect(201);

    const pending = await as(ctx.app, owner).get('/orgs/acme/invitations').expect(200);
    expect(pending.body).toHaveLength(1);

    await as(ctx.app, owner).delete(`/orgs/acme/invitations/${pending.body[0].id}`).expect(200);

    await as(ctx.app, invitee)
      .post('/invitations/accept')
      .send({ token: invite.body.token })
      .expect(401);
  });

  it('rejects inviting an email with no registered account', async () => {
    const { owner } = await setupOrg('no-account-owner@example.test', 'acme');
    const roles = await as(ctx.app, owner).get('/orgs/acme/roles').expect(200);
    const memberRoleId = roles.body.find((r: { name: string }) => r.name === 'Member').id;

    await as(ctx.app, owner)
      .post('/orgs/acme/invitations')
      .send({ email: 'never-registered@example.test', roleIds: [memberRoleId] })
      .expect(404);
  });

  it('rejects a role with an unknown permission id', async () => {
    const { owner } = await setupOrg('bad-perm-owner@example.test', 'acme');

    await as(ctx.app, owner)
      .post('/orgs/acme/roles')
      .send({ name: 'Bad Role', rank: 10, permissionIds: ['not-a-real-permission'] })
      .expect(400);
  });

  it('rejects editing and deleting a system role', async () => {
    const { owner } = await setupOrg('system-role-owner@example.test', 'acme');
    const roles = await as(ctx.app, owner).get('/orgs/acme/roles').expect(200);
    const memberRoleId = roles.body.find((r: { name: string }) => r.name === 'Member').id;

    await as(ctx.app, owner)
      .patch(`/orgs/acme/roles/${memberRoleId}`)
      .send({ name: 'Renamed' })
      .expect(409);

    await as(ctx.app, owner).delete(`/orgs/acme/roles/${memberRoleId}`).expect(409);
  });

  it('suspends and removes a member', async () => {
    const { owner, memberRoleId } = await setupOrg('suspend-owner@example.test', 'acme');
    const { invitee } = await inviteAndAccept(
      owner,
      'acme',
      memberRoleId,
      'suspend-me@example.test',
    );
    // The account-level session (pre-switch) carries no org context, so the suspend check
    // — which only runs when a refresh token is bound to an organization — doesn't apply
    // to it. Use the org-scoped session to exercise that check.
    const scopedInvitee = await switchInto(invitee, 'acme');

    const members = await as(ctx.app, owner).get('/orgs/acme/members').expect(200);
    const membershipId = members.body.find(
      (m: { user: { email: string } }) => m.user.email === 'suspend-me@example.test',
    ).id;

    await as(ctx.app, owner).post(`/orgs/acme/members/${membershipId}/suspend`).expect(200);

    // Suspension is enforced on the member's next refresh — presenting their existing
    // org-scoped refresh token now fails.
    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${scopedInvitee.refreshToken}`])
      .expect(403);

    await as(ctx.app, owner).delete(`/orgs/acme/members/${membershipId}`).expect(200);

    const afterRemoval = await as(ctx.app, owner).get('/orgs/acme/members').expect(200);
    expect(
      afterRemoval.body.some(
        (m: { user: { email: string } }) => m.user.email === 'suspend-me@example.test',
      ),
    ).toBe(false);
  });

  it('refuses a role id from another organization with 404', async () => {
    const { owner: acmeOwner } = await setupOrg('cross-org-acme-owner@example.test', 'acme');
    const { owner: globexOwner } = await setupOrg('cross-org-globex-owner@example.test', 'globex');

    const globexRoles = await as(ctx.app, globexOwner).get('/orgs/globex/roles').expect(200);
    const globexRoleId = globexRoles.body.find((r: { name: string }) => r.name === 'Member').id;

    await as(ctx.app, acmeOwner).delete(`/orgs/acme/roles/${globexRoleId}`).expect(404);
  });
});
