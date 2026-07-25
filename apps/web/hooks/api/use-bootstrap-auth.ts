'use client';

import { useEffect, useRef } from 'react';

import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import type { TokenResponse } from '@/lib/types/auth';

// On first load there's no access token in memory yet, only the httpOnly
// refresh cookie (if the user has one). Attempt a silent refresh once so a
// page reload doesn't look like a logged-out session.
export function useBootstrapAuth() {
  const ran = useRef(false);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setBootstrapping = useAuthStore((state) => state.setBootstrapping);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    apiClient
      .post<TokenResponse>('/auth/refresh')
      .then(({ data }) => setAccessToken(data.accessToken))
      .catch(() => {})
      .finally(() => setBootstrapping(false));
  }, [setAccessToken, setBootstrapping]);
}
