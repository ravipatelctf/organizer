import { as, login } from './auth';
import { makeOrg, makeProject, makeUser } from './factories';
import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

// Admin endpoints run outside the org-scoped guard chain and pay for a fresh login per
// scenario — same allowance as the other cross-boundary suites.
jest.setTimeout(45000);

describe('Admin and audit — superadmin surface (isolation boundary #1)', () => {
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

  it("a superadmin lists every organization's projects via /admin/projects", async () => {
    const acme = await makeOrg(ctx.prisma, { slug: 'acme' });
    const globex = await makeOrg(ctx.prisma, { slug: 'globex' });
    await makeProject(ctx.prisma, acme.id, { key: 'APOLLO' });
    await makeProject(ctx.prisma, globex.id, { key: 'COSMOS' });

    await makeUser(ctx.prisma, { email: 'super@example.test', isSuperAdmin: true });
    const superadmin = await login(ctx.app, 'super@example.test');

    const res = await as(ctx.app, superadmin).get('/admin/projects').expect(200);
    expect(res.body.map((p: { key: string }) => p.key).sort()).toEqual(['APOLLO', 'COSMOS']);
  });

  it('filters /admin/projects by an explicit organizationId query param', async () => {
    const acme = await makeOrg(ctx.prisma, { slug: 'acme' });
    const globex = await makeOrg(ctx.prisma, { slug: 'globex' });
    await makeProject(ctx.prisma, acme.id, { key: 'APOLLO' });
    await makeProject(ctx.prisma, globex.id, { key: 'COSMOS' });

    await makeUser(ctx.prisma, { email: 'super-filter@example.test', isSuperAdmin: true });
    const superadmin = await login(ctx.app, 'super-filter@example.test');

    const res = await as(ctx.app, superadmin)
      .get(`/admin/projects?organizationId=${acme.id}`)
      .expect(200);
    expect(res.body.map((p: { key: string }) => p.key)).toEqual(['APOLLO']);
  });

  it('a superadmin is refused with 403 on an org-scoped route, not silently elevated', async () => {
    const acme = await makeOrg(ctx.prisma, { slug: 'acme' });
    await makeProject(ctx.prisma, acme.id, { key: 'APOLLO' });

    await makeUser(ctx.prisma, { email: 'super-orgroute@example.test', isSuperAdmin: true });
    const superadmin = await login(ctx.app, 'super-orgroute@example.test');

    await as(ctx.app, superadmin).get('/orgs/acme/projects').expect(403);
  });

  it('a non-superadmin, authenticated actor is refused on every /admin/* route', async () => {
    await makeUser(ctx.prisma, { email: 'plain@example.test' });
    const actor = await login(ctx.app, 'plain@example.test');

    await as(ctx.app, actor).get('/admin/stats').expect(403);
    await as(ctx.app, actor).get('/admin/organizations').expect(403);
    await as(ctx.app, actor).get('/admin/projects').expect(403);
    await as(ctx.app, actor).get('/admin/users').expect(403);
  });
});
