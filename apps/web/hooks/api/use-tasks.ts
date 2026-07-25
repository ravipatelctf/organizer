import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTask, deleteTask, listTasks, updateTask } from '@/lib/api/tasks';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types/org';

export function tasksQueryKey(orgSlug: string, projectId: string) {
  return ['orgs', orgSlug, 'projects', projectId, 'tasks'] as const;
}

export function useTasks(orgSlug: string, projectId: string) {
  return useQuery({
    queryKey: tasksQueryKey(orgSlug, projectId),
    queryFn: () => listTasks(orgSlug, projectId),
    enabled: Boolean(orgSlug) && Boolean(projectId),
  });
}

export function useCreateTask(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      description?: string;
      priority?: TaskPriority;
      assigneeId?: string;
      dueDate?: string;
    }) => createTask(orgSlug, projectId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(orgSlug, projectId) });
    },
  });
}

// projectId is only needed to invalidate the right cached list — the PATCH URL itself
// is not project-nested (the API resolves the task's project internally).
export function useUpdateTask(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      taskId,
      ...input
    }: {
      taskId: string;
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      dueDate?: string;
    }) => updateTask(orgSlug, taskId, input),
    onMutate: async ({ taskId, status }) => {
      if (!status) return undefined;
      const queryKey = tasksQueryKey(orgSlug, projectId);
      const previous = queryClient.getQueryData<Task[]>(queryKey);
      queryClient.setQueryData<Task[]>(queryKey, (tasks) =>
        tasks?.map((task) => (task.id === taskId ? { ...task, status } : task)),
      );
      return { previous, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(orgSlug, projectId) });
    },
  });
}

export function useDeleteTask(orgSlug: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(orgSlug, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(orgSlug, projectId) });
    },
  });
}
