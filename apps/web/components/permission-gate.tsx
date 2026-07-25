'use client';

import type { PermissionEntry, PermissionId } from '@repo/permissions';

import { usePermission } from '@/hooks/use-permission';

type Permission = PermissionEntry | PermissionId | string;

interface PermissionGateProps {
  permission?: Permission | readonly Permission[];
  anyOf?: readonly Permission[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function isPermissionList(
  value: Permission | readonly Permission[],
): value is readonly Permission[] {
  return Array.isArray(value);
}

// Declarative permission check for sidebar entries and action buttons.
// `permission` requires all listed permissions; `anyOf` requires at least one.
export function PermissionGate({
  permission,
  anyOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermission();

  let allowed = true;
  if (permission && isPermissionList(permission)) {
    allowed = hasAllPermissions(permission);
  } else if (permission) {
    allowed = hasPermission(permission);
  }
  if (allowed && anyOf) {
    allowed = hasAnyPermission(anyOf);
  }

  return allowed ? <>{children}</> : <>{fallback}</>;
}
