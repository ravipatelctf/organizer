'use client';

import { createContext, useContext } from 'react';

import type { Organization } from '@/lib/types/auth';

const OrgContext = createContext<Organization | null>(null);

export function OrgProvider({
  organization,
  children,
}: {
  organization: Organization;
  children: React.ReactNode;
}) {
  return <OrgContext.Provider value={organization}>{children}</OrgContext.Provider>;
}

export function useOrgContext(): Organization {
  const organization = useContext(OrgContext);
  if (!organization) {
    throw new Error('useOrgContext must be used within an OrgProvider.');
  }
  return organization;
}
