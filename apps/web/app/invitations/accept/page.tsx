'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { acceptInvitation } from '@/lib/api/invitations';
import { useAuthStore } from '@/lib/store/auth';

type Status = 'pending' | 'success' | 'error';

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const accessToken = useAuthStore((state) => state.accessToken);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const [status, setStatus] = useState<Status>(() => (token ? 'pending' : 'error'));

  useEffect(() => {
    if (!token || isBootstrapping) {
      return;
    }
    if (!accessToken) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/invitations/accept?token=${token}`)}`);
      return;
    }
    acceptInvitation(token)
      .then(() => {
        setStatus('success');
        setTimeout(() => router.push('/organizations'), 1500);
      })
      .catch(() => {
        setStatus('error');
      });
  }, [token, accessToken, isBootstrapping, router]);

  if (status === 'pending') {
    return <p className="text-sm text-muted-foreground">Accepting your invitation…</p>;
  }

  if (status === 'success') {
    return <p className="text-sm text-muted-foreground">You&apos;re in! Redirecting…</p>;
  }

  return (
    <p className="text-sm text-muted-foreground">
      This invitation link is invalid or has expired. Ask whoever invited you to send a new one, or{' '}
      <Link href="/organizations" className="underline underline-offset-4">
        go to your organizations
      </Link>
      .
    </p>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join organization</CardTitle>
          <CardDescription>Confirming your invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <AcceptInvitationContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
