import request from 'supertest';

import { as, login } from './auth';
import { makeUser } from './factories';
import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

describe('Organizations', () => {
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
    return { ...actor, accessToken: res.body.accessToken as string };
  }

  it('creates an organization, seeds the four default roles, and lands the creator as Owner', async () => {
    const owner = await registerAndLogin('owner@example.test');

    const createRes = await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);
    expect(createRes.body.slug).toBe('acme');

    const roles = await ctx.prisma.role.findMany({ where: { organizationId: createRes.body.id } });
    expect(roles.map((r) => r.name).sort()).toEqual(
      ['Admin', 'Member', 'Owner', 'Project Manager'].sort(),
    );

    const membership = await ctx.prisma.orgMembership.findFirst({
      where: { organizationId: createRes.body.id },
      include: { roles: { include: { role: true } } },
    });
    expect(membership?.status).toBe('ACTIVE');
    expect(membership?.roles[0]?.role.name).toBe('Owner');
    expect(membership?.roles[0]?.role.isOrgAdmin).toBe(true);
  });

  it('rejects creating an organization with a taken slug', async () => {
    const owner = await registerAndLogin('dup-owner@example.test');
    await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);

    const other = await registerAndLogin('dup-other@example.test');
    await as(ctx.app, other)
      .post('/organizations')
      .send({ name: 'Acme Clone', slug: 'acme' })
      .expect(409);
  });

  it('reports slug availability', async () => {
    const owner = await registerAndLogin('slug-owner@example.test');
    await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);

    const taken = await as(ctx.app, owner).get('/organizations/check-slug?slug=acme').expect(200);
    expect(taken.body.available).toBe(false);

    const free = await as(ctx.app, owner)
      .get('/organizations/check-slug?slug=totally-free')
      .expect(200);
    expect(free.body.available).toBe(true);
  });

  it('lists only the organizations the caller belongs to', async () => {
    const alice = await registerAndLogin('alice-orgs@example.test');
    await as(ctx.app, alice)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);

    const bob = await registerAndLogin('bob-orgs@example.test');
    await as(ctx.app, bob)
      .post('/organizations')
      .send({ name: 'Globex', slug: 'globex' })
      .expect(201);

    const aliceOrgs = await as(ctx.app, alice).get('/me/organizations').expect(200);
    expect(aliceOrgs.body.map((o: { slug: string }) => o.slug)).toEqual(['acme']);

    const bobOrgs = await as(ctx.app, bob).get('/me/organizations').expect(200);
    expect(bobOrgs.body.map((o: { slug: string }) => o.slug)).toEqual(['globex']);
  });

  it('switches into an organization and mints a token bound to it', async () => {
    const owner = await registerAndLogin('switch-owner@example.test');
    await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);

    const switched = await switchInto(owner, 'acme');
    const res = await as(ctx.app, switched).get('/orgs/acme/organization').expect(200);
    expect(res.body.slug).toBe('acme');
  });

  it('refuses to switch a non-member into an organization', async () => {
    const owner = await registerAndLogin('nonmember-owner@example.test');
    await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);

    const stranger = await registerAndLogin('stranger@example.test');
    await as(ctx.app, stranger).post('/orgs/acme/switch').expect(403);
  });

  it('updates organization details for a scoped owner token', async () => {
    const owner = await registerAndLogin('update-owner@example.test');
    await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);
    const scoped = await switchInto(owner, 'acme');

    const res = await as(ctx.app, scoped)
      .patch('/orgs/acme/organization')
      .send({ name: 'Acme Corp' })
      .expect(200);
    expect(res.body.name).toBe('Acme Corp');
  });

  it('refuses a token minted for one organization under another organization', async () => {
    const acmeOwner = await registerAndLogin('acme-owner@example.test');
    await as(ctx.app, acmeOwner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);
    const acmeScoped = await switchInto(acmeOwner, 'acme');

    const globexOwner = await registerAndLogin('globex-owner@example.test');
    await as(ctx.app, globexOwner)
      .post('/organizations')
      .send({ name: 'Globex', slug: 'globex' })
      .expect(201);

    await as(ctx.app, acmeScoped).get('/orgs/globex/organization').expect(403);
    await as(ctx.app, acmeScoped).get('/orgs/acme/organization').expect(200);
  });

  it('refuses a superadmin under /orgs/*, pointing them at /admin/* instead', async () => {
    await makeUser(ctx.prisma, { email: 'super@example.test', isSuperAdmin: true });

    const superadmin = await login(ctx.app, 'super@example.test');

    const owner = await registerAndLogin('super-target-owner@example.test');
    await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme' })
      .expect(201);

    await as(ctx.app, superadmin).get('/orgs/acme/organization').expect(403);
  });

  it('rejects a request body carrying organizationId on organization creation (whitelist)', async () => {
    const owner = await registerAndLogin('whitelist-owner@example.test');
    await as(ctx.app, owner)
      .post('/organizations')
      .send({ name: 'Acme', slug: 'acme', organizationId: 'not-allowed' })
      .expect(400);
  });
});
