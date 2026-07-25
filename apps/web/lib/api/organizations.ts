import { apiClient } from '@/lib/api/client';
import type { Organization } from '@/lib/types/auth';

export async function listMyOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>('/me/organizations');
  return data;
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const { data } = await apiClient.get<{ available: boolean }>('/organizations/check-slug', {
    params: { slug },
  });
  return data.available;
}

export async function createOrganization(input: {
  name: string;
  slug: string;
}): Promise<Organization> {
  const { data } = await apiClient.post<Organization>('/organizations', input);
  return data;
}
