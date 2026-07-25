import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';

import { AUDIT_KEY, AuditMetadata } from '../common/decorators/audit.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { AuditService } from './audit.service';

interface AuditableRequest {
  user?: JwtPayload;
  params: Record<string, string>;
  query: Record<string, unknown>;
  method: string;
  path: string;
  ip: string;
}

// Records every /admin/* request — including reads — before the handler runs, so a request
// that ends up 404ing on a bad :id is still audited. organizationId is unconditionally null:
// /admin/* actions are platform-level by definition, never derived from an AccessContext.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const meta = this.reflector.getAllAndOverride<AuditMetadata | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuditableRequest>();

    await this.auditService.record({
      organizationId: null,
      actorUserId: request.user?.sub ?? null,
      action: meta?.action ?? `${request.method} ${request.path}`,
      resourceType: meta?.resourceType ?? 'platform',
      resourceId: request.params?.id ?? null,
      metadata: (request.query ?? {}) as Prisma.InputJsonValue,
      ipAddress: request.ip ?? null,
    });

    return next.handle();
  }
}
