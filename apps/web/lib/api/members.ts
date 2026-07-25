import { apiClient } from '@/lib/api/client';
import type { OrgMembership } from '@/lib/types/org';

export async function listMembers(orgSlug: string): Promise<OrgMembership[]> {
  const { data } = await apiClient.get<OrgMembership[]>(`/orgs/${orgSlug}/members`);
  return data;
}

export async function updateMemberRoles(
  orgSlug: string,
  membershipId: string,
  roleIds: string[],
): Promise<void> {
  await apiClient.patch(`/orgs/${orgSlug}/members/${membershipId}/roles`, { roleIds });
}

export async function suspendMember(orgSlug: string, membershipId: string): Promise<OrgMembership> {
  const { data } = await apiClient.post<OrgMembership>(
    `/orgs/${orgSlug}/members/${membershipId}/suspend`,
  );
  return data;
}

export async function removeMember(orgSlug: string, membershipId: string): Promise<OrgMembership> {
  const { data } = await apiClient.delete<OrgMembership>(
    `/orgs/${orgSlug}/members/${membershipId}`,
  );
  return data;
}
