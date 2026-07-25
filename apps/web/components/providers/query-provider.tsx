'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { useBootstrapAuth } from '@/hooks/api/use-bootstrap-auth';
import { useSetupAxios } from '@/hooks/api/use-setup-axios';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  useSetupAxios();
  useBootstrapAuth();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
