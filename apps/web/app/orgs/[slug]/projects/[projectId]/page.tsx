'use client';

import { PERMS } from '@repo/permissions';
import { useRouter } from 'next/navigation';

import { PermissionGate } from '@/components/permission-gate';
import { ProjectFormDialog } from '@/components/projects/project-form-dialog';
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
import { useArchiveProject, useDeleteProject, useUpdateProject } from '@/hooks/api/use-projects';
import { useOrgContext } from '@/lib/context/org-context';
import { useProjectContext } from '@/lib/context/project-context';

export default function ProjectOverviewPage() {
  const organization = useOrgContext();
  const project = useProjectContext();
  const router = useRouter();
  const updateProject = useUpdateProject(organization.slug, project.id);
  const archiveProject = useArchiveProject(organization.slug, project.id);
  const deleteProject = useDeleteProject(organization.slug, project.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant={project.status === 'ACTIVE' ? 'default' : 'secondary'}>
          {project.status}
        </Badge>
        {project.dueDate && (
          <span className="text-sm text-muted-foreground">
            Due {new Date(project.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">
        {project.description || 'No description.'}
      </p>

      <div className="flex gap-2">
        <PermissionGate permission={PERMS.project.edit}>
          <ProjectFormDialog
            trigger={<Button variant="outline">Edit</Button>}
            project={project}
            onSubmit={async (values) => {
              await updateProject.mutateAsync({
                name: values.name,
                description: values.description,
              });
            }}
          />
        </PermissionGate>

        <PermissionGate permission={PERMS.project.archive}>
          {project.status === 'ACTIVE' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Archive</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {project.name} will be marked archived. This can be reversed later by an admin.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => archiveProject.mutate()}>
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </PermissionGate>

        <PermissionGate permission={PERMS.project.delete}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                <AlertDialogDescription>
                  {project.name} and its tasks will be removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteProject.mutateAsync();
                    router.push(`/orgs/${organization.slug}/projects`);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </PermissionGate>
      </div>
    </div>
  );
}
