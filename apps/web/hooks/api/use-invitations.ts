import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createInvitation, listInvitations, revokeInvitation } from '@/lib/api/invitations';

function invitationsQueryKey(orgSlug: string) {
  return ['orgs', orgSlug, 'invitations'] as const;
}

export function useInvitations(orgSlug: string) {
  return useQuery({
    queryKey: invitationsQueryKey(orgSlug),
    queryFn: () => listInvitations(orgSlug),
    enabled: Boolean(orgSlug),
  });
}

export function useCreateInvitation(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; roleIds: string[] }) => createInvitation(orgSlug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey(orgSlug) });
    },
  });
}

export function useRevokeInvitation(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(orgSlug, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey(orgSlug) });
    },
  });
}
