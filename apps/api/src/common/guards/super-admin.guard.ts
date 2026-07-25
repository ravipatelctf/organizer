import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { REQUIRE_SUPER_ADMIN_KEY } from '../decorators/require-super-admin.decorator';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // route declares no superadmin requirement

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException('Superadmin access required.');
    }

    return true;
  }
}
