'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useRequireAuth } from '@/hooks/use-require-auth';
import { canAccessAdmin } from '@/lib/auth/admin-access';
import { useAuthStore } from '@/lib/store/auth';

// Layers on top of useRequireAuth: a session alone isn't enough here, it must
// carry isSuperAdmin. Redirects non-superadmins to the org picker rather than
// /login, since they do have a valid session — just not one for this surface.
export function useRequireSuperAdmin() {
  const router = useRouter();
  const { accessToken, isBootstrapping } = useRequireAuth();
  const claims = useAuthStore((state) => state.claims);
  const isSuperAdmin = canAccessAdmin(claims);

  useEffect(() => {
    if (!isBootstrapping && accessToken && !isSuperAdmin) {
      router.replace('/organizations');
    }
  }, [isBootstrapping, accessToken, isSuperAdmin, router]);

  return { accessToken, isBootstrapping, isSuperAdmin };
}
