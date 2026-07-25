'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTask } from '@/hooks/api/use-tasks';
import type { ProjectMember } from '@/lib/types/org';

const schema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  description: z.string().max(4000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assigneeId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateTaskDialog({
  orgSlug,
  projectId,
  members,
  trigger,
}: {
  orgSlug: string;
  projectId: string;
  members: ProjectMember[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createTask = useCreateTask(orgSlug, projectId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', priority: 'MEDIUM', assigneeId: undefined },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) reset({ title: '', description: '', priority: 'MEDIUM', assigneeId: undefined });
  };

  const submit = async (values: FormValues) => {
    try {
      await createTask.mutateAsync({
        title: values.title,
        description: values.description,
        priority: values.priority,
        assigneeId: values.assigneeId,
      });
      setOpen(false);
    } catch {
      toast.error('Something went wrong.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input id="title" {...register('title')} />
              <FieldError errors={[errors.title]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea id="description" {...register('description')} />
              <FieldError errors={[errors.description]} />
            </Field>
            <Field>
              <FieldLabel>Priority</FieldLabel>
              <Select
                value={watch('priority')}
                onValueChange={(value) => setValue('priority', value as FormValues['priority'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>Assignee</FieldLabel>
              <Select
                value={watch('assigneeId') ?? 'unassigned'}
                onValueChange={(value) =>
                  setValue('assigneeId', value === 'unassigned' ? undefined : value)
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
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create task'}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
