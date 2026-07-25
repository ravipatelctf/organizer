'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateMemberRoles } from '@/hooks/api/use-members';
import { useRoles } from '@/hooks/api/use-roles';
import type { OrgMembership } from '@/lib/types/org';

export function EditRolesDialog({
  orgSlug,
  membership,
  open,
  onOpenChange,
}: {
  orgSlug: string;
  membership: OrgMembership | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: roles } = useRoles(orgSlug);
  const updateMemberRoles = useUpdateMemberRoles(orgSlug);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(membership?.roles.map((membershipRole) => membershipRole.roleId) ?? []),
  );

  if (!membership) return null;

  const toggle = (roleId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) {
      toast.error('A member needs at least one role.');
      return;
    }
    try {
      await updateMemberRoles.mutateAsync({
        membershipId: membership.id,
        roleIds: Array.from(selected),
      });
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Roles for {membership.user.firstName} {membership.user.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {(roles ?? []).map((role) => (
            <label key={role.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={selected.has(role.id)} onCheckedChange={() => toggle(role.id)} />
              {role.name}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={updateMemberRoles.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
