import { ForbiddenException } from '@nestjs/common';

import { AccessContext } from './access-context';
import { projectWhere } from './project-scope.util';

function makeCtx(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    userId: 'user-1',
    orgId: 'org-1',
    membershipId: null,
    scopes: [],
    isOrgAdmin: false,
    isSuperAdmin: false,
    ...overrides,
  };
}

describe('projectWhere', () => {
  it('throws when there is no organization context', () => {
    expect(() => projectWhere(makeCtx({ orgId: null }))).toThrow(ForbiddenException);
    expect(() => projectWhere(makeCtx({ orgId: null }))).toThrow('Organization context required.');
  });

  it('returns the org-wide filter for an org admin, with no members clause', () => {
    const result = projectWhere(makeCtx({ isOrgAdmin: true, scopes: [] }));

    expect(result).toEqual({ organizationId: 'org-1', deletedAt: null });
    expect((result as Record<string, unknown>).members).toBeUndefined();
  });

  it('returns the org-wide filter for a non-admin holding view-projects', () => {
    const result = projectWhere(makeCtx({ scopes: ['view-projects'] }));

    expect(result).toEqual({ organizationId: 'org-1', deletedAt: null });
  });

  it('returns the org-wide filter for a holder of the all-project superset', () => {
    // Proves getViewScope reads the registry's superset expansion rather than
    // string-matching a literal permission id.
    const result = projectWhere(makeCtx({ scopes: ['all-project'] }));

    expect(result).toEqual({ organizationId: 'org-1', deletedAt: null });
  });

  it('returns the membership-scoped filter for view-own-projects with a membershipId', () => {
    const result = projectWhere(
      makeCtx({ scopes: ['view-own-projects'], membershipId: 'membership-1' }),
    );

    expect(result).toEqual({
      organizationId: 'org-1',
      deletedAt: null,
      members: { some: { orgMembershipId: 'membership-1', deletedAt: null } },
    });
  });

  it('throws when the actor holds no project-visibility scope at all', () => {
    expect(() => projectWhere(makeCtx({ scopes: [] }))).toThrow(ForbiddenException);
    expect(() => projectWhere(makeCtx({ scopes: [] }))).toThrow('No project visibility.');
  });

  it('throws for scopes unrelated to project visibility', () => {
    expect(() => projectWhere(makeCtx({ scopes: ['view-tasks', 'view-members'] }))).toThrow(
      ForbiddenException,
    );
  });

  it('throws rather than silently widening own-scope visibility when membershipId is missing', () => {
    // A missing membershipId here must not fall through to an unfiltered `some: {}`
    // clause — that would match every project in the org with any member at all.
    expect(() =>
      projectWhere(makeCtx({ scopes: ['view-own-projects'], membershipId: null })),
    ).toThrow(ForbiddenException);
    expect(() =>
      projectWhere(makeCtx({ scopes: ['view-own-projects'], membershipId: null })),
    ).toThrow('Membership context required.');
  });

  it('has no superadmin branch — a superadmin with no org context is still refused', () => {
    expect(() => projectWhere(makeCtx({ isSuperAdmin: true, orgId: null }))).toThrow(
      ForbiddenException,
    );
  });
});
