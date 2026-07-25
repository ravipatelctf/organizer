'use client';

import { PERMS } from '@repo/permissions';
import { useState } from 'react';
import { toast } from 'sonner';

import { PermissionGate } from '@/components/permission-gate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDeleteTask, useUpdateTask } from '@/hooks/api/use-tasks';
import { usePermission } from '@/hooks/use-permission';
import type { ProjectMember, Task, TaskPriority, TaskStatus } from '@/lib/types/org';

const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function TaskDetailDialog({
  orgSlug,
  projectId,
  task,
  members,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  projectId: string;
  task: Task | null;
  members: ProjectMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateTask = useUpdateTask(orgSlug, projectId);
  const deleteTask = useDeleteTask(orgSlug, projectId);
  const { hasPermission } = usePermission();
  const canEdit = hasPermission(PERMS.task.edit);
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');

  if (!task) return null;

  const save = async (fields: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
  }) => {
    try {
      await updateTask.mutateAsync({ taskId: task.id, ...fields });
    } catch {
      toast.error('Something went wrong.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {task.number} · {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="task-title">Title</FieldLabel>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => title !== task.title && save({ title })}
              disabled={!canEdit}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="task-description">Description</FieldLabel>
            <Textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => description !== (task.description ?? '') && save({ description })}
              disabled={!canEdit}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={task.status}
                onValueChange={(status) => save({ status: status as TaskStatus })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={task.priority}
                onValueChange={(priority) => save({ priority: priority as TaskPriority })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <PermissionGate permission={PERMS.task.assign}>
            <Field>
              <FieldLabel>Assignee</FieldLabel>
              <Select
                value={task.assigneeId ?? 'unassigned'}
                onValueChange={(assigneeId) =>
                  save({ assigneeId: assigneeId === 'unassigned' ? undefined : assigneeId })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.membership?.user.firstName} {member.membership?.user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </PermissionGate>

          <PermissionGate permission={PERMS.task.delete}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="self-start">
                  Delete task
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await deleteTask.mutateAsync(task.id);
                      onOpenChange(false);
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </PermissionGate>
        </div>
      </DialogContent>
    </Dialog>
  );
}
