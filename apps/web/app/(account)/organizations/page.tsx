'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { listMyOrganizations } from '@/lib/api/organizations';

export default function OrganizationsPage() {
  const { accessToken } = useRequireAuth();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['me', 'organizations'],
    queryFn: listMyOrganizations,
    enabled: Boolean(accessToken),
  });

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your organizations</h1>
        <Button asChild size="sm">
          <Link href="/organizations/new">New organization</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!isLoading && organizations?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You aren&apos;t a member of any organization yet.{' '}
            <Link href="/organizations/new" className="underline underline-offset-4">
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {organizations?.map((org) => (
          <Link key={org.id} href={`/orgs/${org.slug}/dashboard`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{org.name}</CardTitle>
                <CardDescription>/{org.slug}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
