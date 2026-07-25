export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_PATH;
  if (!configured) return 'http://localhost:8000';

  // A full origin (local dev, talking to the api directly) is used as-is. A bare path
  // (deployed, "/api" behind vercel.ts's rewrite) is resolved against the current origin.
  if (/^https?:\/\//.test(configured)) return configured;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${configured}`;
}
