import request from 'supertest';

import { createTestApp, TestApp } from './setup-e2e';
import { truncateAll } from './truncate';

describe('GET /health (smoke)', () => {
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

  it('returns 200 and proves the e2e harness runs against the test schema', async () => {
    await request(ctx.app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
  });
});
