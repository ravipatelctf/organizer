import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createRole, deleteRole, listRoles, updateRole } from '@/lib/api/roles';

function rolesQueryKey(orgSlug: string) {
  return ['orgs', orgSlug, 'roles'] as const;
}

export function useRoles(orgSlug: string) {
  return useQuery({
    queryKey: rolesQueryKey(orgSlug),
    queryFn: () => listRoles(orgSlug),
    enabled: Boolean(orgSlug),
  });
}

export function useCreateRole(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description?: string;
      rank: number;
      permissionIds: string[];
    }) => createRole(orgSlug, input),
    onSuccess: () => {
      // The create response omits `permissions` — re-fetch rather than merge into cache.
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(orgSlug) });
    },
  });
}

export function useUpdateRole(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      ...input
    }: {
      roleId: string;
      name?: string;
      description?: string;
      rank?: number;
      permissionIds?: string[];
    }) => updateRole(orgSlug, roleId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(orgSlug) });
    },
  });
}

export function useDeleteRole(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roleId: string) => deleteRole(orgSlug, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(orgSlug) });
    },
  });
}
