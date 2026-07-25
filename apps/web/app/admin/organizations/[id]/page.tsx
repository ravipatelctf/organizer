'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminOrganization, useAdminProjects } from '@/hooks/api/use-admin';

export default function AdminOrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: organization, isLoading, isError, error } = useAdminOrganization(id);
  const { data: projects, isLoading: isLoadingProjects } = useAdminProjects(id, {
    enabled: Boolean(organization),
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">
          {status === 404 ? 'Organization not found' : 'Something went wrong'}
        </h1>
        <Button asChild>
          <Link href="/admin/organizations">Back to organizations</Link>
        </Button>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{organization.name}</h1>
        <p className="text-sm text-muted-foreground">/{organization.slug}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{new Date(organization.createdAt).toLocaleString()}</p>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-medium">Projects</h2>
        {isLoadingProjects ? (
          <Skeleton className="h-32 w-full" />
        ) : projects && projects.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Badge variant="outline">{project.key}</Badge>
                  </TableCell>
                  <TableCell>{project.name}</TableCell>
                  <TableCell>
                    <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        )}
      </div>
    </div>
  );
}
