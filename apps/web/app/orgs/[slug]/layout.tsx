'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { OrgSidebar } from '@/components/org-sidebar';
import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/hooks/api/use-organization';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { OrgProvider } from '@/lib/context/org-context';

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

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { accessToken, isBootstrapping } = useRequireAuth();

  // Deliberately doesn't pre-set useOrgStore's currentOrgSlug here — that store only
  // exists for the axios interceptor to detect a stale-token org mismatch on a 403 (see
  // hooks/api/use-setup-axios.ts). Setting it ahead of the first request would make an
  // actual mismatch look like a match and skip the token re-mint entirely.
  const {
    data: organization,
    isLoading,
    isError,
    error,
  } = useOrganization(slug, {
    enabled: !isBootstrapping && Boolean(accessToken),
  });

  if (isBootstrapping || isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status === 404) {
      return (
        <ErrorState
          title="Organization not found"
          description={`There's no organization at /orgs/${slug}.`}
        />
      );
    }
    if (status === 403) {
      return (
        <ErrorState
          title="You're not a member of this organization"
          description="Ask an admin of this organization to invite you, or switch to one you belong to."
        />
      );
    }
    return (
      <ErrorState
        title="Something went wrong"
        description="Couldn't load this organization. Try again shortly."
      />
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <OrgProvider organization={organization}>
      <SidebarProvider>
        <OrgSidebar organization={organization} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </OrgProvider>
  );
}
