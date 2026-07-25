import { routes, type VercelConfig } from '@vercel/config/v1';

// Rewrites the api under this project's own domain so the browser never talks cross-origin —
// no CORS configuration, no cross-site cookie handling for the refresh token. Replace the
// target host once the api project's real Vercel URL is known (see docs/deployment.md).
export const config: VercelConfig = {
  framework: 'nextjs',
  rewrites: [routes.rewrite('/api/(.*)', 'https://<api-project>.vercel.app/$1')],
};
