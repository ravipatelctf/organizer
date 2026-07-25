import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getViewScope } from '@repo/permissions';

import { AccessContext } from './access-context';

// Everything project-shaped goes through this file. Superadmin (level 1) never reaches it —
// it is served by AdminService on /admin/*, with an explicit organizationId filter. There
// is deliberately no "no filter" branch here: an absent tenant filter is the anti-pattern.
export function projectWhere(ctx: AccessContext): Prisma.ProjectWhereInput {
  if (!ctx.orgId) throw new ForbiddenException('Organization context required.');

  const scope = getViewScope(ctx.scopes, 'project', { isAdmin: ctx.isOrgAdmin });
  if (scope === 'none') throw new ForbiddenException('No project visibility.');
  if (scope === 'all') return { organizationId: ctx.orgId, deletedAt: null }; // level 2

  // A missing membershipId here would silently widen "own" to "every project with any
  // member" once the `some: { orgMembershipId: undefined }` filter drops out — this check
  // is what keeps that failure mode a 403 instead of a visibility leak.
  if (!ctx.membershipId) throw new ForbiddenException('Membership context required.');

  return {
    // level 3
    organizationId: ctx.orgId,
    deletedAt: null,
    members: { some: { orgMembershipId: ctx.membershipId, deletedAt: null } },
  };
}

// Tasks get no tenant filter of their own — isolation is transitive through the project.
export function taskWhere(ctx: AccessContext): Prisma.TaskWhereInput {
  return { deletedAt: null, project: projectWhere(ctx) };
}
