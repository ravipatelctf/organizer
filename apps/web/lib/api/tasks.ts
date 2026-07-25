import { apiClient } from '@/lib/api/client';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types/org';

export async function listTasks(orgSlug: string, projectId: string): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`/orgs/${orgSlug}/projects/${projectId}/tasks`);
  return data;
}

export async function createTask(
  orgSlug: string,
  projectId: string,
  input: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assigneeId?: string;
    dueDate?: string;
  },
): Promise<Task> {
  const { data } = await apiClient.post<Task>(
    `/orgs/${orgSlug}/projects/${projectId}/tasks`,
    input,
  );
  return data;
}

// Not project-nested — the API resolves visibility through the task's own project.
export async function updateTask(
  orgSlug: string,
  taskId: string,
  input: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    dueDate?: string;
  },
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/orgs/${orgSlug}/tasks/${taskId}`, input);
  return data;
}

export async function deleteTask(orgSlug: string, taskId: string): Promise<void> {
  await apiClient.delete(`/orgs/${orgSlug}/tasks/${taskId}`);
}
