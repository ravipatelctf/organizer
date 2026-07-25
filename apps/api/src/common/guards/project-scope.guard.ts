import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { buildAccessContext } from '../scope/access-context';
import { ProjectAccessService } from '../scope/project-access.service';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class ProjectScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();

    const projectId = request.params?.projectId as string | undefined;
    if (!projectId) return true; // no-op on routes with no :projectId

    // Superadmins never reach projectWhere's org-scoped filtering (no branch for them
    // there, by design) — they're served by AdminService on /admin/* with an explicit
    // organizationId filter. This short-circuit just keeps a stray :projectId route from
    // confusingly 403ing a superadmin instead of deferring to that surface.
    if (request.user?.isSuperAdmin) return true;

    const ctx = buildAccessContext(request.user, request.organization);
    await this.projectAccess.assertVisible(ctx, projectId);

    return true;
  }
}
