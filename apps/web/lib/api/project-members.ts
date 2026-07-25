import { apiClient } from '@/lib/api/client';
import type { ProjectMember, ProjectMemberRole } from '@/lib/types/org';

export async function listProjectMembers(
  orgSlug: string,
  projectId: string,
): Promise<ProjectMember[]> {
  const { data } = await apiClient.get<ProjectMember[]>(
    `/orgs/${orgSlug}/projects/${projectId}/members`,
  );
  return data;
}

export async function addProjectMember(
  orgSlug: string,
  projectId: string,
  input: { orgMembershipId: string; role?: ProjectMemberRole },
): Promise<ProjectMember> {
  const { data } = await apiClient.post<ProjectMember>(
    `/orgs/${orgSlug}/projects/${projectId}/members`,
    input,
  );
  return data;
}

export async function updateProjectMemberRole(
  orgSlug: string,
  projectId: string,
  memberId: string,
  role: ProjectMemberRole,
): Promise<ProjectMember> {
  const { data } = await apiClient.patch<ProjectMember>(
    `/orgs/${orgSlug}/projects/${projectId}/members/${memberId}`,
    { role },
  );
  return data;
}

export async function removeProjectMember(
  orgSlug: string,
  projectId: string,
  memberId: string,
): Promise<void> {
  await apiClient.delete(`/orgs/${orgSlug}/projects/${projectId}/members/${memberId}`);
}
