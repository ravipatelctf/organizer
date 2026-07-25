'use client';

import { PERMS } from '@repo/permissions';
import { Plus } from 'lucide-react';

import { PermissionGate } from '@/components/permission-gate';
import { RoleEditorDialog } from '@/components/roles/role-editor-dialog';
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
import { useDeleteRole, useRoles } from '@/hooks/api/use-roles';
import { useOrgContext } from '@/lib/context/org-context';

export default function RolesPage() {
  const organization = useOrgContext();
  const { data: roles, isLoading } = useRoles(organization.slug);
  const deleteRole = useDeleteRole(organization.slug);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles</h1>
        <PermissionGate permission={PERMS.role.create}>
          <RoleEditorDialog
            orgSlug={organization.slug}
            trigger={
              <Button>
                <Plus /> New role
              </Button>
            }
          />
        </PermissionGate>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(roles ?? []).map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {role.name}
                    {role.isSystemRole && <Badge variant="outline">System</Badge>}
                  </div>
                </TableCell>
                <TableCell>{role.rank}</TableCell>
                <TableCell>{role.permissions?.length ?? 0}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <PermissionGate permission={PERMS.role.edit}>
                    <RoleEditorDialog
                      orgSlug={organization.slug}
                      role={role}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      }
                    />
                  </PermissionGate>
                  <PermissionGate permission={PERMS.role.delete}>
                    {!role.isSystemRole && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this role?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Members holding only this role will lose its permissions.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRole.mutate(role.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
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
