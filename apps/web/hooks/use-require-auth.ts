'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/lib/store/auth';

// Waits out the silent-refresh bootstrap before deciding there's no session,
// so a page reload doesn't bounce a still-valid user to /login.
export function useRequireAuth() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  useEffect(() => {
    if (!isBootstrapping && !accessToken) {
      router.replace('/login');
    }
  }, [isBootstrapping, accessToken, router]);

  return { accessToken, isBootstrapping };
}
