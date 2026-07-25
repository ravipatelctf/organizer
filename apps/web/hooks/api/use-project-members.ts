import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
} from '@/lib/api/project-members';
import type { ProjectMemberRole } from '@/lib/types/org';

export function useProjectMembers(orgSlug: string, projectId: string) {
  return useQuery({
    queryKey: ['orgs', orgSlug, 'projects', projectId, 'members'],
    queryFn: () => listProjectMembers(orgSlug, projectId),
    enabled: Boolean(orgSlug) && Boolean(projectId),
  });
}

export function useAddProjectMember(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orgMembershipId: string; role?: ProjectMemberRole }) =>
      addProjectMember(orgSlug, projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orgs', orgSlug, 'projects', projectId, 'members'],
      });
    },
  });
}

export function useUpdateProjectMemberRole(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: ProjectMemberRole }) =>
      updateProjectMemberRole(orgSlug, projectId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orgs', orgSlug, 'projects', projectId, 'members'],
      });
    },
  });
}

export function useRemoveProjectMember(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeProjectMember(orgSlug, projectId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orgs', orgSlug, 'projects', projectId, 'members'],
      });
    },
  });
}
