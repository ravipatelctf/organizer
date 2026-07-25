'use client';

import Link from 'next/link';

import { AdminSidebar } from '@/components/admin-sidebar';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireSuperAdmin } from '@/hooks/use-require-super-admin';

function ErrorState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button asChild>
        <Link href="/organizations">Back to organizations</Link>
      </Button>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, isBootstrapping, isSuperAdmin } = useRequireSuperAdmin();

  if (isBootstrapping) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  if (!isSuperAdmin) {
    return (
      <ErrorState
        title="Superadmin access required"
        description="This console is restricted to platform administrators."
      />
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
