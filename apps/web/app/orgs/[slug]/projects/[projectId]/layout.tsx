'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProject } from '@/hooks/api/use-projects';
import { useOrgContext } from '@/lib/context/org-context';
import { ProjectProvider } from '@/lib/context/project-context';

const TABS = [
  { value: 'overview', label: 'Overview', href: '' },
  { value: 'board', label: 'Board', href: 'board' },
  { value: 'members', label: 'Members', href: 'members' },
] as const;

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const organization = useOrgContext();
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const { data: project, isLoading, isError } = useProject(organization.slug, projectId);

  const basePath = `/orgs/${organization.slug}/projects/${projectId}`;
  const activeTab =
    TABS.find((tab) => tab.href !== '' && pathname === `${basePath}/${tab.href}`)?.value ??
    'overview';

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold">Project not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been deleted, or you may not have access to it.
        </p>
        <Button asChild>
          <Link href={`/orgs/${organization.slug}/projects`}>Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <ProjectProvider project={project}>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.key}</p>
        </div>
        <Tabs value={activeTab}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} asChild>
                <Link href={tab.href ? `${basePath}/${tab.href}` : basePath}>{tab.label}</Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {children}
      </div>
    </ProjectProvider>
  );
}
