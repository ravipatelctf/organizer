import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listMembers, removeMember, suspendMember, updateMemberRoles } from '@/lib/api/members';

function membersQueryKey(orgSlug: string) {
  return ['orgs', orgSlug, 'members'] as const;
}

export function useMembers(orgSlug: string) {
  return useQuery({
    queryKey: membersQueryKey(orgSlug),
    queryFn: () => listMembers(orgSlug),
    enabled: Boolean(orgSlug),
  });
}

export function useUpdateMemberRoles(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, roleIds }: { membershipId: string; roleIds: string[] }) =>
      updateMemberRoles(orgSlug, membershipId, roleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey(orgSlug) });
    },
  });
}

export function useSuspendMember(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => suspendMember(orgSlug, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey(orgSlug) });
    },
  });
}

export function useRemoveMember(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => removeMember(orgSlug, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membersQueryKey(orgSlug) });
    },
  });
}
