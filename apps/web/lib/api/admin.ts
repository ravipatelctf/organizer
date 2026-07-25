import { apiClient } from '@/lib/api/client';
import type { AdminProject, AdminStats, AdminUser } from '@/lib/types/admin';
import type { Organization } from '@/lib/types/auth';

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await apiClient.get<AdminStats>('/admin/stats');
  return data;
}

export async function listAdminOrganizations(): Promise<Organization[]> {
  const { data } = await apiClient.get<Organization[]>('/admin/organizations');
  return data;
}

export async function getAdminOrganization(id: string): Promise<Organization> {
  const { data } = await apiClient.get<Organization>(`/admin/organizations/${id}`);
  return data;
}

export async function listAdminProjects(organizationId?: string): Promise<AdminProject[]> {
  const { data } = await apiClient.get<AdminProject[]>('/admin/projects', {
    params: organizationId ? { organizationId } : undefined,
  });
  return data;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users');
  return data;
}
