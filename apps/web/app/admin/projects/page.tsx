'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
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
import { useAdminOrganizations, useAdminProjects } from '@/hooks/api/use-admin';

const ALL_ORGS = 'all';

export default function AdminProjectsPage() {
  const [organizationId, setOrganizationId] = useState<string>(ALL_ORGS);
  const { data: organizations } = useAdminOrganizations();
  const { data: projects, isLoading } = useAdminProjects(
    organizationId === ALL_ORGS ? undefined : organizationId,
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Every project across every organization.</p>
        </div>
        <Select value={organizationId} onValueChange={setOrganizationId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All organizations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ORGS}>All organizations</SelectItem>
            {(organizations ?? []).map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(projects ?? []).map((project) => (
              <TableRow key={project.id}>
                <TableCell>
                  <Badge variant="outline">{project.key}</Badge>
                </TableCell>
                <TableCell>{project.name}</TableCell>
                <TableCell className="text-muted-foreground">{project.organization.name}</TableCell>
                <TableCell>
                  <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
