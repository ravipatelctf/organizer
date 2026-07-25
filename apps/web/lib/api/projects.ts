import { apiClient } from '@/lib/api/client';
import type { Project } from '@/lib/types/org';

export async function listProjects(orgSlug: string): Promise<Project[]> {
  const { data } = await apiClient.get<Project[]>(`/orgs/${orgSlug}/projects`);
  return data;
}

export async function getProject(orgSlug: string, projectId: string): Promise<Project> {
  const { data } = await apiClient.get<Project>(`/orgs/${orgSlug}/projects/${projectId}`);
  return data;
}

export async function createProject(
  orgSlug: string,
  input: { key: string; name: string; description?: string; startDate?: string; dueDate?: string },
): Promise<Project> {
  const { data } = await apiClient.post<Project>(`/orgs/${orgSlug}/projects`, input);
  return data;
}

export async function updateProject(
  orgSlug: string,
  projectId: string,
  input: { name?: string; description?: string; startDate?: string; dueDate?: string },
): Promise<Project> {
  const { data } = await apiClient.patch<Project>(`/orgs/${orgSlug}/projects/${projectId}`, input);
  return data;
}

export async function archiveProject(orgSlug: string, projectId: string): Promise<Project> {
  const { data } = await apiClient.post<Project>(`/orgs/${orgSlug}/projects/${projectId}/archive`);
  return data;
}

export async function deleteProject(orgSlug: string, projectId: string): Promise<void> {
  await apiClient.delete(`/orgs/${orgSlug}/projects/${projectId}`);
}
