import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '@/lib/api/projects';

export function useProjects(orgSlug: string) {
  return useQuery({
    queryKey: ['orgs', orgSlug, 'projects'],
    queryFn: () => listProjects(orgSlug),
    enabled: Boolean(orgSlug),
  });
}

export function useProject(orgSlug: string, projectId: string) {
  return useQuery({
    queryKey: ['orgs', orgSlug, 'projects', projectId],
    queryFn: () => getProject(orgSlug, projectId),
    enabled: Boolean(orgSlug) && Boolean(projectId),
  });
}

export function useCreateProject(orgSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      key: string;
      name: string;
      description?: string;
      startDate?: string;
      dueDate?: string;
    }) => createProject(orgSlug, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', orgSlug, 'projects'] });
    },
  });
}

export function useUpdateProject(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name?: string;
      description?: string;
      startDate?: string;
      dueDate?: string;
    }) => updateProject(orgSlug, projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', orgSlug, 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['orgs', orgSlug, 'projects', projectId] });
    },
  });
}

export function useArchiveProject(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveProject(orgSlug, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', orgSlug, 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['orgs', orgSlug, 'projects', projectId] });
    },
  });
}

export function useDeleteProject(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteProject(orgSlug, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs', orgSlug, 'projects'] });
    },
  });
}
