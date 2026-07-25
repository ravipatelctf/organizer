import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface Actor {
  accessToken: string;
  refreshToken: string;
}

function extractRefreshCookie(setCookieHeader: string[] | undefined): string {
  const cookie = setCookieHeader?.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('login response did not set a refresh_token cookie');
  return cookie.split(';')[0]!.split('=')[1]!;
}

// Every seeded actor shares the uniform password from the fixture convention (Phase 9).
export async function login(
  app: INestApplication,
  email: string,
  password = 'password123',
): Promise<Actor> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: response.body.accessToken,
    refreshToken: extractRefreshCookie(response.headers['set-cookie'] as unknown as string[]),
  };
}

// as(actor).get(url) returns a supertest request with the bearer header attached.
export function as(app: INestApplication, actor: Actor) {
  const httpServer = app.getHttpServer();
  const withAuth = (req: request.Test) => req.set('Authorization', `Bearer ${actor.accessToken}`);

  return {
    get: (url: string) => withAuth(request(httpServer).get(url)),
    post: (url: string) => withAuth(request(httpServer).post(url)),
    patch: (url: string) => withAuth(request(httpServer).patch(url)),
    delete: (url: string) => withAuth(request(httpServer).delete(url)),
  };
}
