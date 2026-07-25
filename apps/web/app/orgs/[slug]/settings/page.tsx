'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useUpdateOrganization } from '@/hooks/api/use-organization';
import { useOrgContext } from '@/lib/context/org-context';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(255),
});
type FormValues = z.infer<typeof schema>;

// NOTE: PATCH /orgs/:orgSlug/organization currently has no @RequirePermissions guard
// server-side — any active member can call it, not only edit-organization holders.
// Gating this page's entry on PERMS.organization.edit is a UI convenience, not the
// security boundary; that's a pre-existing API gap, out of scope for this phase.
export default function OrgSettingsPage() {
  const organization = useOrgContext();
  const updateOrganization = useUpdateOrganization(organization.slug);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: organization.name },
  });

  useEffect(() => {
    reset({ name: organization.name });
  }, [organization.name, reset]);

  const submit = async (values: FormValues) => {
    try {
      await updateOrganization.mutateAsync({ name: values.name });
      toast.success('Organization updated.');
    } catch {
      toast.error('Something went wrong.');
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="org-name">Name</FieldLabel>
                <Input id="org-name" {...register('name')} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input value={organization.slug} disabled readOnly />
              </Field>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
