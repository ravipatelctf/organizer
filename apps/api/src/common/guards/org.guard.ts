import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_ORG_CHECK_KEY } from '../decorators/skip-org-check.decorator';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isSkipped = this.reflector.getAllAndOverride<boolean>(SKIP_ORG_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isSkipped) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    if (user?.isSuperAdmin) {
      // Platform admins hold no org context. They are not silently elevated into a
      // tenant — they are refused and pointed at their own surface.
      if (request.organization) {
        throw new ForbiddenException('Platform admins operate on /admin/*, not /orgs/*.');
      }
      return true;
    }

    if (!request.organization) return true; // non-org route

    if (!user?.orgId) {
      throw new ForbiddenException('Token has no organization context.');
    }

    if (user.orgId !== request.organization.id) {
      throw new ForbiddenException('Token is not valid for this organization.');
    }

    return true;
  }
}
