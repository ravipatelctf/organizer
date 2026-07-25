import { apiClient } from '@/lib/api/client';
import type { Role } from '@/lib/types/org';

export async function listRoles(orgSlug: string): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>(`/orgs/${orgSlug}/roles`);
  return data;
}

export async function createRole(
  orgSlug: string,
  input: { name: string; description?: string; rank: number; permissionIds: string[] },
): Promise<Role> {
  const { data } = await apiClient.post<Role>(`/orgs/${orgSlug}/roles`, input);
  return data;
}

export async function updateRole(
  orgSlug: string,
  roleId: string,
  input: { name?: string; description?: string; rank?: number; permissionIds?: string[] },
): Promise<Role> {
  const { data } = await apiClient.patch<Role>(`/orgs/${orgSlug}/roles/${roleId}`, input);
  return data;
}

export async function deleteRole(orgSlug: string, roleId: string): Promise<void> {
  await apiClient.delete(`/orgs/${orgSlug}/roles/${roleId}`);
}
