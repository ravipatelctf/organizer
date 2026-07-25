import { SetMetadata } from '@nestjs/common';
import { PermissionEntry, PermissionId } from '@repo/permissions';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

export const RequirePermissions = (...perms: Array<PermissionEntry | PermissionId | string>) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, perms);
