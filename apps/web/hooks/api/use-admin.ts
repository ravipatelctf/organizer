import { useQuery } from '@tanstack/react-query';

import {
  getAdminOrganization,
  getAdminStats,
  listAdminOrganizations,
  listAdminProjects,
  listAdminUsers,
} from '@/lib/api/admin';

export function useAdminStats(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getAdminStats,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminOrganizations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: listAdminOrganizations,
    enabled: options?.enabled ?? true,
  });
}

export function useAdminOrganization(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'organizations', id],
    queryFn: () => getAdminOrganization(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useAdminProjects(organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'projects', organizationId ?? 'all'],
    queryFn: () => listAdminProjects(organizationId),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: listAdminUsers,
    enabled: options?.enabled ?? true,
  });
}
