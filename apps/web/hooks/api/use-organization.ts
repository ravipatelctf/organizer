import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getOrganization, updateOrganization } from '@/lib/api/organization';

export function useOrganization(orgSlug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['orgs', orgSlug, 'organization'],
    queryFn: () => getOrganization(orgSlug),
    enabled: Boolean(orgSlug) && (options?.enabled ?? true),
  });
}

export function useUpdateOrganization(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; settings?: Record<string, unknown> }) =>
      updateOrganization(orgSlug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', orgSlug, 'organization'] });
    },
  });
}
