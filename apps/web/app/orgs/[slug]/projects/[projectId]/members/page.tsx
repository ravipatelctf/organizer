'use client';

import { PERMS } from '@repo/permissions';
import { Plus } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMembers } from '@/hooks/api/use-members';
import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProjectMemberRole,
} from '@/hooks/api/use-project-members';
import { useOrgContext } from '@/lib/context/org-context';
import { useProjectContext } from '@/lib/context/project-context';
import type { ProjectMemberRole } from '@/lib/types/org';

const ROLES: ProjectMemberRole[] = ['LEAD', 'CONTRIBUTOR', 'VIEWER'];

function AddMemberDialog({ orgSlug, projectId }: { orgSlug: string; projectId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const { data: orgMembers } = useMembers(orgSlug);
  const { data: projectMembers } = useProjectMembers(orgSlug, projectId);
  const addMember = useAddProjectMember(orgSlug, projectId);

  const candidates = (orgMembers ?? []).filter(
    (membership) =>
      membership.status === 'ACTIVE' &&
      !projectMembers?.some((member) => member.orgMembershipId === membership.id),
  );

  const submit = async () => {
    if (!selected) return;
    try {
      await addMember.mutateAsync({ orgMembershipId: selected });
      setOpen(false);
      setSelected('');
    } catch {
      toast.error('Something went wrong.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add project member</DialogTitle>
        </DialogHeader>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a member" />
          </SelectTrigger>
          <SelectContent>
            {candidates.map((membership) => (
              <SelectItem key={membership.id} value={membership.id}>
                {membership.user.firstName} {membership.user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={submit} disabled={!selected || addMember.isPending}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectMembersPage() {
  const organization = useOrgContext();
  const project = useProjectContext();
  const { data: members, isLoading } = useProjectMembers(organization.slug, project.id);
  const updateRole = useUpdateProjectMemberRole(organization.slug, project.id);
  const removeMember = useRemoveProjectMember(organization.slug, project.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PermissionGate permission={PERMS.project.manageMembers}>
          <AddMemberDialog orgSlug={organization.slug} projectId={project.id} />
        </PermissionGate>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(members ?? []).map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  {member.membership?.user.firstName} {member.membership?.user.lastName}
                </TableCell>
                <TableCell>
                  <PermissionGate
                    permission={PERMS.project.manageMembers}
                    fallback={<Badge variant="outline">{member.role}</Badge>}
                  >
                    <Select
                      value={member.role}
                      onValueChange={(role) =>
                        updateRole.mutate({ memberId: member.id, role: role as ProjectMemberRole })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PermissionGate>
                </TableCell>
                <TableCell className="text-right">
                  <PermissionGate permission={PERMS.project.manageMembers}>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove this member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            They will lose access to this project&apos;s tasks.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember.mutate(member.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
