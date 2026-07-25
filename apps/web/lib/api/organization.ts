import { apiClient } from '@/lib/api/client';
import type { Organization } from '@/lib/types/auth';

export async function getOrganization(orgSlug: string): Promise<Organization> {
  const { data } = await apiClient.get<Organization>(`/orgs/${orgSlug}/organization`);
  return data;
}

export async function updateOrganization(
  orgSlug: string,
  input: { name?: string; settings?: Record<string, unknown> },
): Promise<Organization> {
  const { data } = await apiClient.patch<Organization>(`/orgs/${orgSlug}/organization`, input);
  return data;
}
