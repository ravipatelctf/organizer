'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';

import { useRequireAuth } from '@/hooks/use-require-auth';
import { useOrgStore } from '@/lib/store/org';

// Placeholder — Phase 11 replaces this with the real org layout, sidebar and dashboard.
export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  useRequireAuth();
  const setCurrentOrgSlug = useOrgStore((state) => state.setCurrentOrgSlug);

  useEffect(() => {
    setCurrentOrgSlug(slug);
  }, [slug, setCurrentOrgSlug]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Dashboard for /{slug} — coming in Phase 11.</p>
    </div>
  );
}
