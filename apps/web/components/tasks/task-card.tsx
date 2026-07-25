'use client';

import { useDraggable } from '@dnd-kit/core';

import { Badge } from '@/components/ui/badge';
import type { ProjectMember, Task } from '@/lib/types/org';
import { cn } from '@/lib/utils';

const PRIORITY_VARIANT: Record<Task['priority'], 'secondary' | 'default' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'secondary',
  HIGH: 'default',
  URGENT: 'destructive',
};

export function TaskCard({
  task,
  assignee,
  onClick,
}: {
  task: Task;
  assignee?: ProjectMember;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      {...listeners}
      {...attributes}
      style={
        transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
      }
      className={cn(
        'flex w-full flex-col gap-2 rounded-md border bg-card p-3 text-left text-sm shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{task.number}</span>
        <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
      </div>
      <p className="font-medium leading-snug">{task.title}</p>
      {assignee && (
        <p className="truncate text-xs text-muted-foreground">
          {assignee.membership?.user.firstName} {assignee.membership?.user.lastName}
        </p>
      )}
    </button>
  );
}
