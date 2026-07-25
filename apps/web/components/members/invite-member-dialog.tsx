'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { Check, Copy } from 'lucide-react';
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
import { useCreateInvitation } from '@/hooks/api/use-invitations';
import { useRoles } from '@/hooks/api/use-roles';

const schema = z.object({ email: z.string().email('Enter a valid email.') });
type FormValues = z.infer<typeof schema>;

export function InviteMemberDialog({
  orgSlug,
  trigger,
}: {
  orgSlug: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: roles } = useRoles(orgSlug);
  const createInvitation = useCreateInvitation(orgSlug);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      reset();
      setSelectedRoleIds(new Set());
      setIssuedToken(null);
      setCopied(false);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((current) => {
      const next = new Set(current);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const submit = async (values: FormValues) => {
    if (selectedRoleIds.size === 0) {
      toast.error('Choose at least one role.');
      return;
    }
    try {
      const invitation = await createInvitation.mutateAsync({
        email: values.email,
        roleIds: Array.from(selectedRoleIds),
      });
      setIssuedToken(invitation.token ?? null);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 404
          ? 'No registered user with that email.'
          : 'Something went wrong.';
      toast.error(message);
    }
  };

  const copyToken = async () => {
    if (!issuedToken) return;
    await navigator.clipboard.writeText(issuedToken);
    setCopied(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
        </DialogHeader>

        {issuedToken ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Share this invitation token — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={issuedToken} className="font-mono text-xs" />
              <Button type="button" variant="outline" size="icon" onClick={copyToken}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(submit)} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                <Input id="invite-email" type="email" {...register('email')} />
                <FieldError errors={[errors.email]} />
              </Field>
              <Field>
                <FieldLabel>Roles</FieldLabel>
                <div className="flex flex-col gap-2">
                  {(roles ?? []).map((role) => (
                    <label key={role.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedRoleIds.has(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      {role.name}
                    </label>
                  ))}
                </div>
              </Field>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send invitation'}
                </Button>
              </DialogFooter>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
