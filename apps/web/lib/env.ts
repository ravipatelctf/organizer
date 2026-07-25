export function getApiBaseUrl(): string {
  const basePath = process.env.NEXT_PUBLIC_API_BASE_PATH;
  if (basePath) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${basePath}`;
  }
  return 'http://localhost:8000';
}
