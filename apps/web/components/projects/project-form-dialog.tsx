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
import { Textarea } from '@/components/ui/textarea';
import type { Project } from '@/lib/types/org';

const schema = z.object({
  key: z
    .string()
    .min(2, 'Key must be at least 2 characters.')
    .max(10)
    .regex(/^[A-Z][A-Z0-9]*$/, 'Uppercase letters and digits, starting with a letter.')
    .optional(),
  name: z.string().min(1, 'Name is required.').max(150),
  description: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

interface ProjectFormDialogProps {
  trigger: React.ReactNode;
  project?: Project;
  onSubmit: (values: { key?: string; name: string; description?: string }) => Promise<void>;
}

// Shared create/edit dialog — `project` present means edit mode, which hides the
// immutable `key` field (the API doesn't accept it on PATCH).
export function ProjectFormDialog({ trigger, project, onSubmit }: ProjectFormDialogProps) {
  const [open, setOpen] = useState(false);

  const defaultValues: FormValues = project
    ? { name: project.name, description: project.description ?? '' }
    : { key: '', name: '', description: '' };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) reset(defaultValues);
  };

  const submit = async (values: FormValues) => {
    try {
      await onSubmit(values);
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
          <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} noValidate>
          <FieldGroup>
            {!project && (
              <Field>
                <FieldLabel htmlFor="key">Key</FieldLabel>
                <Input
                  id="key"
                  placeholder="APOLLO"
                  {...register('key', {
                    onChange: (event) => {
                      event.target.value = event.target.value.toUpperCase();
                    },
                  })}
                />
                <FieldError errors={[errors.key]} />
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea id="description" {...register('description')} />
              <FieldError errors={[errors.description]} />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : project ? 'Save changes' : 'Create project'}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
