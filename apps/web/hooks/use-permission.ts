import {
  type PermissionEntry,
  type PermissionId,
  userHasAnyPermission,
  userHasPermission,
} from '@repo/permissions';

import { useAuthStore } from '@/lib/store/auth';

type Permission = PermissionEntry | PermissionId | string;

export function usePermission() {
  const claims = useAuthStore((state) => state.claims);
  const isAdmin = Boolean(claims?.isOrgAdmin || claims?.isSuperAdmin);
  const scopes = claims?.scopes ?? [];

  const hasPermission = (permission: Permission): boolean =>
    isAdmin || userHasPermission(scopes, permission);

  const hasAllPermissions = (permissions: readonly Permission[]): boolean =>
    isAdmin || permissions.every((permission) => userHasPermission(scopes, permission));

  const hasAnyPermission = (permissions: readonly Permission[]): boolean =>
    isAdmin || userHasAnyPermission(scopes, permissions);

  return { hasPermission, hasAllPermissions, hasAnyPermission };
}
