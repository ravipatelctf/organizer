'use client';

import { PERMS } from '@repo/permissions';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PermissionGate } from '@/components/permission-gate';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCreateProject, useProjects } from '@/hooks/api/use-projects';
import { useOrgContext } from '@/lib/context/org-context';

export default function ProjectsPage() {
  const organization = useOrgContext();
  const { data: projects, isLoading } = useProjects(organization.slug);
  const createProject = useCreateProject(organization.slug);
  const [search, setSearch] = useState('');

  const filtered = (projects ?? []).filter((project) =>
    `${project.key} ${project.name}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <PermissionGate permission={PERMS.project.create}>
          <ProjectFormDialog
            trigger={
              <Button>
                <Plus /> New project
              </Button>
            }
            onSubmit={async (values) => {
              if (!values.key) return;
              await createProject.mutateAsync({
                key: values.key,
                name: values.name,
                description: values.description,
              });
            }}
          />
        </PermissionGate>
      </div>

      <Input
        placeholder="Search projects…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((project) => (
              <TableRow key={project.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    href={`/orgs/${organization.slug}/projects/${project.id}`}
                    className="font-medium"
                  >
                    {project.key}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/orgs/${organization.slug}/projects/${project.id}`}>
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
