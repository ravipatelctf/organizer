import { routes, type VercelConfig } from '@vercel/config/v1';

// Rewrites the api under this project's own domain so the browser never talks cross-origin —
// no CORS configuration, no cross-site cookie handling for the refresh token.
export const config: VercelConfig = {
  framework: 'nextjs',
  rewrites: [routes.rewrite('/api/(.*)', 'https://organizer-api.vercel.app/$1')],
};
