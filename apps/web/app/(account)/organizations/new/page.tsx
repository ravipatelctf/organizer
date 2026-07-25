'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { checkSlugAvailable, createOrganization } from '@/lib/api/organizations';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(255),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters.')
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens.'),
});
type FormValues = z.infer<typeof schema>;

export default function NewOrganizationPage() {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const name = watch('name');
  const slug = watch('slug');

  useEffect(() => {
    if (!slugTouched && name) {
      setValue('slug', slugify(name), { shouldValidate: true });
    }
  }, [name, slugTouched, setValue]);

  useEffect(() => {
    setSlugAvailable(null);
    if (!slug || slug.length < 2) return;
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      try {
        setSlugAvailable(await checkSlugAvailable(slug));
      } catch {
        setSlugAvailable(null);
      }
    }, 400);
    return () => {
      if (checkTimer.current) clearTimeout(checkTimer.current);
    };
  }, [slug]);

  const onSubmit = async (values: FormValues) => {
    try {
      const organization = await createOrganization(values);
      router.push(`/orgs/${organization.slug}/dashboard`);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 409
          ? 'That slug is already taken.'
          : 'Something went wrong.';
      toast.error(message);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an organization</CardTitle>
        <CardDescription>You&apos;ll become its owner.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" {...register('name')} />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <Input
                id="slug"
                {...register('slug', {
                  onChange: () => setSlugTouched(true),
                })}
              />
              <FieldError errors={[errors.slug]} />
              {!errors.slug && slugAvailable !== null && (
                <FieldDescription
                  className={slugAvailable ? 'text-emerald-600' : 'text-destructive'}
                >
                  {slugAvailable ? `Available at /orgs/${slug}` : 'That slug is already taken.'}
                </FieldDescription>
              )}
            </Field>
            <Button type="submit" disabled={isSubmitting || slugAvailable === false}>
              {isSubmitting ? 'Creating…' : 'Create organization'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
