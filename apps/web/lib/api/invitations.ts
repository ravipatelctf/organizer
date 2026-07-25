import { apiClient } from '@/lib/api/client';
import type { Invitation } from '@/lib/types/org';

export async function acceptInvitation(token: string): Promise<void> {
  await apiClient.post('/invitations/accept', { token });
}

export async function listInvitations(orgSlug: string): Promise<Invitation[]> {
  const { data } = await apiClient.get<Invitation[]>(`/orgs/${orgSlug}/invitations`);
  return data;
}

export async function createInvitation(
  orgSlug: string,
  input: { email: string; roleIds: string[] },
): Promise<Invitation> {
  const { data } = await apiClient.post<Invitation>(`/orgs/${orgSlug}/invitations`, input);
  return data;
}

export async function revokeInvitation(orgSlug: string, invitationId: string): Promise<void> {
  await apiClient.delete(`/orgs/${orgSlug}/invitations/${invitationId}`);
}
