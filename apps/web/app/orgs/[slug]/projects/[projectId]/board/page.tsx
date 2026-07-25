'use client';

import { DndContext, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import { PERMS } from '@repo/permissions';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskDetailDialog } from '@/components/tasks/task-detail-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjectMembers } from '@/hooks/api/use-project-members';
import { useTasks, useUpdateTask } from '@/hooks/api/use-tasks';
import { useOrgContext } from '@/lib/context/org-context';
import { useProjectContext } from '@/lib/context/project-context';
import type { ProjectMember, Task, TaskStatus } from '@/lib/types/org';
import { cn } from '@/lib/utils';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'IN_REVIEW', label: 'In review' },
  { status: 'DONE', label: 'Done' },
];

function BoardColumn({
  status,
  label,
  tasks,
  onTaskClick,
  assigneeFor,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  assigneeFor: (task: Task) => ProjectMember | undefined;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[200px] flex-1 flex-col gap-2 rounded-lg border bg-muted/30 p-3',
        isOver && 'bg-muted/60',
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            assignee={assigneeFor(task)}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const organization = useOrgContext();
  const project = useProjectContext();
  const { data: tasks, isLoading } = useTasks(organization.slug, project.id);
  const { data: members } = useProjectMembers(organization.slug, project.id);
  const updateTask = useUpdateTask(organization.slug, project.id);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const assigneeFor = (task: Task) => members?.find((member) => member.id === task.assigneeId);

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = event.active.id as string;
    const newStatus = event.over?.id as TaskStatus | undefined;
    const task = tasks?.find((candidate) => candidate.id === taskId);
    if (!task || !newStatus || task.status === newStatus) return;
    updateTask.mutate({ taskId, status: newStatus });
  };

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-4">
        {COLUMNS.map((column) => (
          <Skeleton key={column.status} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PermissionGate permission={PERMS.task.create}>
          <CreateTaskDialog
            orgSlug={organization.slug}
            projectId={project.id}
            members={members ?? []}
            trigger={
              <Button size="sm">
                <Plus /> New task
              </Button>
            }
          />
        </PermissionGate>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid gap-3 sm:grid-cols-4">
          {COLUMNS.map((column) => (
            <BoardColumn
              key={column.status}
              status={column.status}
              label={column.label}
              tasks={(tasks ?? []).filter((task) => task.status === column.status)}
              onTaskClick={setActiveTask}
              assigneeFor={assigneeFor}
            />
          ))}
        </div>
      </DndContext>

      <TaskDetailDialog
        key={activeTask?.id ?? 'none'}
        orgSlug={organization.slug}
        projectId={project.id}
        task={activeTask}
        members={members ?? []}
        open={activeTask !== null}
        onOpenChange={(open) => !open && setActiveTask(null)}
      />
    </div>
  );
}
