'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { applyDependencies, featuresByEditorCategory, type PermissionId } from '@repo/permissions';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRole, useUpdateRole } from '@/hooks/api/use-roles';
import type { Role } from '@/lib/types/org';

const CATEGORIES = featuresByEditorCategory();

const schema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  description: z.string().max(2000).optional(),
  rank: z.coerce.number().int().min(1, 'Rank must be at least 1.'),
});
type FormValues = z.infer<typeof schema>;

export function RoleEditorDialog({
  orgSlug,
  role,
  trigger,
}: {
  orgSlug: string;
  role?: Role;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const createRole = useCreateRole(orgSlug);
  const updateRole = useUpdateRole(orgSlug);
  const isSystemRole = Boolean(role?.isSystemRole);

  const defaultValues: FormValues = role
    ? { name: role.name, description: role.description ?? '', rank: role.rank }
    : { name: '', description: '', rank: 10 };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      reset(defaultValues);
      setSelected(new Set(role?.permissions?.map((permission) => permission.permissionId) ?? []));
    }
  };

  const toggle = (permissionId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
        applyDependencies(permissionId as PermissionId, next);
      }
      return next;
    });
  };

  const submit = async (values: FormValues) => {
    try {
      const permissionIds = Array.from(selected);
      if (role) {
        await updateRole.mutateAsync({
          roleId: role.id,
          name: values.name,
          description: values.description,
          rank: values.rank,
          permissionIds,
        });
      } else {
        await createRole.mutateAsync({
          name: values.name,
          description: values.description,
          rank: values.rank,
          permissionIds,
        });
      }
      setOpen(false);
    } catch {
      toast.error('Something went wrong.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role ? 'Edit role' : 'New role'}</DialogTitle>
        </DialogHeader>

        {isSystemRole ? (
          <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            {role?.name} is a system role seeded for every organization and can&apos;t be edited or
            deleted.
          </p>
        ) : (
          <form onSubmit={handleSubmit(submit)} noValidate>
            <FieldGroup>
              <div className="grid grid-cols-3 gap-4">
                <Field className="col-span-2">
                  <FieldLabel htmlFor="role-name">Name</FieldLabel>
                  <Input id="role-name" {...register('name')} />
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="role-rank">Rank</FieldLabel>
                  <Input id="role-rank" type="number" min={1} {...register('rank')} />
                  <FieldError errors={[errors.rank]} />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="role-description">Description</FieldLabel>
                <Textarea id="role-description" {...register('description')} />
              </Field>

              <Tabs defaultValue="Workspace">
                <TabsList>
                  {Object.keys(CATEGORIES).map((category) => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {Object.entries(CATEGORIES).map(([category, features]) => (
                  <TabsContent key={category} value={category} className="flex flex-col gap-4">
                    {features.map((feature) => (
                      <div key={feature.key} className="flex flex-col gap-1.5">
                        <p className="text-sm font-medium">{feature.title}</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {Object.values(feature.permissions).map((permission) => (
                            <label
                              key={permission.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <Checkbox
                                checked={selected.has(permission.id)}
                                onCheckedChange={() => toggle(permission.id)}
                              />
                              {permission.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : role ? 'Save changes' : 'Create role'}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
