'use client';

import { PERMS } from '@repo/permissions';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { EditRolesDialog } from '@/components/members/edit-roles-dialog';
import { InviteMemberDialog } from '@/components/members/invite-member-dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInvitations, useRevokeInvitation } from '@/hooks/api/use-invitations';
import { useMembers, useRemoveMember, useSuspendMember } from '@/hooks/api/use-members';
import { useOrgContext } from '@/lib/context/org-context';
import type { OrgMembership } from '@/lib/types/org';

function MembersTable({ orgSlug }: { orgSlug: string }) {
  const { data: members, isLoading } = useMembers(orgSlug);
  const suspendMember = useSuspendMember(orgSlug);
  const removeMember = useRemoveMember(orgSlug);
  const [editing, setEditing] = useState<OrgMembership | null>(null);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(members ?? []).map((membership) => (
            <TableRow key={membership.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span>
                    {membership.user.firstName} {membership.user.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">{membership.user.email}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={membership.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {membership.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {membership.roles.map((membershipRole) => (
                    <Badge key={membershipRole.id} variant="outline">
                      {membershipRole.role.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <PermissionGate permission={PERMS.member.edit}>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(membership)}>
                    Edit roles
                  </Button>
                </PermissionGate>
                <PermissionGate permission={PERMS.member.suspend}>
                  {membership.status === 'ACTIVE' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Suspend
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Suspend this member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            They&apos;ll lose access to this organization until reinstated.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => suspendMember.mutate(membership.id)}>
                            Suspend
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </PermissionGate>
                <PermissionGate permission={PERMS.member.remove}>
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
                          They&apos;ll lose access to this organization entirely.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeMember.mutate(membership.id)}>
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
      <EditRolesDialog
        key={editing?.id ?? 'none'}
        orgSlug={orgSlug}
        membership={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </>
  );
}

function InvitationsTable({ orgSlug }: { orgSlug: string }) {
  const { data: invitations, isLoading } = useInvitations(orgSlug);
  const revokeInvitation = useRevokeInvitation(orgSlug);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  if (!invitations || invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">No pending invitations.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Roles</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>{invitation.user.email}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {invitation.roles.map((membershipRole) => (
                  <Badge key={membershipRole.id} variant="outline">
                    {membershipRole.role.name}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <PermissionGate permission={PERMS.invitation.revoke}>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke this invitation?</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => revokeInvitation.mutate(invitation.id)}>
                        Revoke
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
  );
}

export default function MembersPage() {
  const organization = useOrgContext();

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Members</h1>
        <PermissionGate permission={PERMS.member.invite}>
          <InviteMemberDialog
            orgSlug={organization.slug}
            trigger={
              <Button>
                <Plus /> Invite
              </Button>
            }
          />
        </PermissionGate>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="members">
          <MembersTable orgSlug={organization.slug} />
        </TabsContent>
        <TabsContent value="invitations">
          <InvitationsTable orgSlug={organization.slug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
