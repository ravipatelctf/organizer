import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Organization } from '@prisma/client';
import { Request } from 'express';

import { JwtPayload } from '../types/jwt-payload.type';

export interface AccessContext {
  userId: string;
  orgId: string | null;
  membershipId: string | null;
  scopes: string[];
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
}

// Shared by @Ctx() and ProjectScopeGuard — guards run before param decorators resolve, so
// they can't share the decorator itself, only this builder. Keeping the actor-assembly
// logic in exactly one place means the guard's notion of "who is asking" can never drift
// from the handler's.
export function buildAccessContext(
  user: JwtPayload | undefined,
  organization?: Organization | null,
): AccessContext {
  if (!user) {
    throw new UnauthorizedException('Authentication required.');
  }

  // OrgGuard already enforces token-org agreement, but it has a @SkipOrgCheck() escape
  // hatch — this is the second line of defense for any route that both skips that check
  // and carries a :projectId.
  if (organization && user.orgId && organization.id !== user.orgId) {
    throw new ForbiddenException('Token is not valid for this organization.');
  }

  return {
    userId: user.sub,
    orgId: user.orgId ?? null,
    membershipId: user.membershipId ?? null,
    scopes: user.scopes ?? [],
    isOrgAdmin: user.isOrgAdmin ?? false,
    isSuperAdmin: user.isSuperAdmin ?? false,
  };
}

export const Ctx = createParamDecorator(
  (_: undefined, context: ExecutionContext): AccessContext => {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    return buildAccessContext(request.user, request.organization);
  },
);
