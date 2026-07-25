import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionEntry, PermissionId, userHasPermission } from '@repo/permissions';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<
      Array<PermissionEntry | PermissionId | string>
    >(REQUIRE_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!required || required.length === 0) return true; // auth-only route

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    if (user?.isSuperAdmin || user?.isOrgAdmin) return true;

    const scopes = user?.scopes ?? [];
    for (const permission of required) {
      if (!userHasPermission(scopes, permission)) {
        throw new ForbiddenException('You do not have permission to perform this action.');
      }
    }

    return true;
  }
}
