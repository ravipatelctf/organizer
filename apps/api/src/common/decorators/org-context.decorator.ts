import { createParamDecorator, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Organization } from '@prisma/client';
import { Request } from 'express';

// Reads req.organization, set by ResolveOrgMiddleware for any orgs/:orgSlug/* route.
export const OrgContext = createParamDecorator((_: undefined, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>();
  if (!request.organization) {
    throw new NotFoundException('Organization not found.');
  }
  return request.organization as Organization;
});
