'use client';

import Link from 'next/link';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminOrganizations } from '@/hooks/api/use-admin';

export default function AdminOrganizationsPage() {
  const { data: organizations, isLoading } = useAdminOrganizations();

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="text-sm text-muted-foreground">Every organization on the platform.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(organizations ?? []).map((org) => (
              <TableRow key={org.id}>
                <TableCell>
                  <Link href={`/admin/organizations/${org.id}`} className="hover:underline">
                    {org.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">/{org.slug}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(org.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
