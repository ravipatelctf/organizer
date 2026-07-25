'use client';

import { PERMS } from '@repo/permissions';
import Link from 'next/link';

import { PermissionGate } from '@/components/permission-gate';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMembers } from '@/hooks/api/use-members';
import { useProjects } from '@/hooks/api/use-projects';
import { useOrgContext } from '@/lib/context/org-context';

export default function DashboardPage() {
  const organization = useOrgContext();
  const { data: projects, isLoading } = useProjects(organization.slug);
  const activeProjects = projects?.filter((project) => project.status === 'ACTIVE') ?? [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{organization.name}</h1>
        <p className="text-sm text-muted-foreground">Overview of your projects.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{projects?.length ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-semibold">{activeProjects.length}</p>
            )}
          </CardContent>
        </Card>
        <PermissionGate permission={PERMS.member.view} fallback={<div />}>
          <MemberCountCard orgSlug={organization.slug} />
        </PermissionGate>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Your projects</h2>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/orgs/${organization.slug}/projects/${project.id}`}>
                <Card className="transition-colors hover:bg-accent/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{project.name}</CardTitle>
                      <Badge variant="outline">{project.key}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        )}
      </div>
    </div>
  );
}

// Isolated so the org-admin-only members fetch doesn't run for members without
// view-members — there is no aggregate stats endpoint, so this is a second small query.
function MemberCountCard({ orgSlug }: { orgSlug: string }) {
  const { data: members, isLoading } = useMembers(orgSlug);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-semibold">{members?.length ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}
