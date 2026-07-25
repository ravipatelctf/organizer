import request from 'supertest';

import { as, login } from './auth';
import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

describe('Authentication', () => {
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

  it('registers, logs in, hits a protected route, refreshes, and rejects the old refresh token', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'grace@example.test',
        password: 'password123',
        firstName: 'Grace',
        lastName: 'Hopper',
      })
      .expect(201);

    const actor = await login(ctx.app, 'grace@example.test');
    expect(actor.accessToken).toEqual(expect.any(String));

    const me = await as(ctx.app, actor).get('/auth/me').expect(200);
    expect(me.body.email).toBe('grace@example.test');

    const refreshed = await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${actor.refreshToken}`])
      .expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.accessToken).not.toBe(actor.accessToken);

    // The old refresh token was deleted by rotation — presenting it again is a 403.
    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${actor.refreshToken}`])
      .expect(403);
  });

  it('rejects a protected route with no token', async () => {
    await request(ctx.app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('rejects duplicate registration with the same email', async () => {
    const body = {
      email: 'dup@example.test',
      password: 'password123',
      firstName: 'Dup',
      lastName: 'User',
    };
    await request(ctx.app.getHttpServer()).post('/auth/register').send(body).expect(201);
    await request(ctx.app.getHttpServer()).post('/auth/register').send(body).expect(409);
  });

  it('rejects login with the wrong password', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'wrongpw@example.test',
        password: 'password123',
        firstName: 'Wrong',
        lastName: 'Pw',
      })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'wrongpw@example.test', password: 'not-the-password' })
      .expect(401);
  });

  it('rejects a request body carrying organizationId (whitelist)', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'whitelist@example.test',
        password: 'password123',
        firstName: 'White',
        lastName: 'List',
        organizationId: 'not-allowed',
      })
      .expect(400);
  });

  it('logs out and rejects the refresh token afterward', async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'logout@example.test',
        password: 'password123',
        firstName: 'Log',
        lastName: 'Out',
      })
      .expect(201);

    const actor = await login(ctx.app, 'logout@example.test');

    await as(ctx.app, actor)
      .post('/auth/logout')
      .set('Cookie', [`refresh_token=${actor.refreshToken}`])
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [`refresh_token=${actor.refreshToken}`])
      .expect(403);
  });
});
