# The isolation model

This is the document a reviewer should read to understand why the data-isolation guarantee in this
system can be trusted, not just asserted. It covers the three access levels, the one place tenant
filtering happens, why cross-boundary reads return 404 instead of 403, and — honestly — where this
can still fail and what's done about it.

## The three access levels

| Level          | Stored as                                                      | Sees                                                                  |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Superadmin     | `users.is_super_admin = true`                                  | Every organization, every project — served entirely outside `/orgs/*` |
| Org Admin      | An `OrgMembership` holding a `Role` with `is_org_admin = true` | Every project in that one organization                                |
| Project Member | An `OrgMembership` plus rows in `project_members`              | Only the projects they have a `project_members` row for               |

Superadmin is a column, not a role, because roles are scoped to an organization
(`roles.organization_id` is required) and a platform operator belongs to none. The Admin/Member
split is a view scope, not a hardcoded branch: `view-projects` (permission) means "every project in
the org," `view-own-projects` means "only projects I'm on." `getViewScope()` in `@repo/permissions`
resolves which one an actor holds, so adding a future role like "sees everything, can't edit
settings" needs no new isolation code — only a different set of granted permissions.

## The choke point

Two functions in `apps/api/src/common/scope/project-scope.util.ts` are the only place a `Project` or
`Task` tenant filter is constructed:

```ts
export function projectWhere(ctx: AccessContext): Prisma.ProjectWhereInput {
  // resolves the actor's view scope, throws if 'none', returns an organizationId
  // (+ optionally a project_members membership) filter otherwise — never an empty filter
}

export function taskWhere(ctx: AccessContext): Prisma.TaskWhereInput {
  return { deletedAt: null, project: projectWhere(ctx) };
}
```

Every `findMany` / `findFirst` / `count` against `Project` or `Task` spreads one of these. There is
deliberately no "no filter" branch — an absent tenant filter is exactly the anti-pattern this exists
to prevent, so the helper cannot express one. `Task` carries no filter of its own; isolation is
transitive through `project: projectWhere(ctx)`, which is what makes a member of one project get a
404 on another project's task even when the URL (`/orgs/:orgSlug/tasks/:id`) names no project.

Superadmins never call `projectWhere`/`taskWhere` at all. They're served by `AdminService` on
`/admin/*`, where every query takes an **explicit** `organizationId` filter (or none, by design, for
a genuinely cross-org read like `GET /admin/projects`) — the absence of a filter there is the visible
point of that surface, not an oversight, and it's why the guardrail test described below excludes
`admin/` entirely.

## Why a helper, not just a guard

`ProjectScopeGuard` protects `GET /projects/:id` — there's an id to check visibility against. It
cannot protect `GET /projects`: a list endpoint has no id, and if the underlying query forgets its
filter it silently returns every organization's rows with no guard ever firing. The real enforcement
has to live in the `where` clause itself, which is why `projectWhere`/`taskWhere` exist as
standalone, spreadable functions rather than guard-only logic.

## 404, not 403, across a tenant boundary

`ProjectAccessService.assertVisible` (and `TaskAccessService.assertVisible`) throw
`NotFoundException`, not `ForbiddenException`, when an id doesn't resolve under the caller's scope.
A 403 would confirm the row exists somewhere the caller can't see — an existence leak across the
tenant boundary. In-boundary permission failures (holding `view-own-projects` but not
`edit-projects` on a project the actor can see) still return 403 — that failure carries no
information the actor doesn't already have.

## The guard chain

Registered in `app.module.ts`'s `APP_GUARD` array, in this order:

| Guard               | Checks                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `AtGuard`           | Authenticates the JWT (`@Public()` bypasses)                                                                        |
| `OrgGuard`          | The URL's `:orgSlug` resolves to the token's `orgId` — refuses superadmins outright, since they hold no org context |
| `PermissionsGuard`  | `@RequirePermissions()` against the token's scopes (bypassed for `isOrgAdmin`/`isSuperAdmin`)                       |
| `ProjectScopeGuard` | If the route has a `:projectId` param, it must resolve under `projectWhere(ctx)` — a no-op on any route without one |

`PermissionsGuard` runs before `ProjectScopeGuard` on purpose: a member editing their own project
without `edit-projects` must get 403 (an in-boundary permission failure), not 404 — if the order were
reversed, a project the actor can see but not edit would look identical to a project they can't see
at all.

## The proof artifact

`apps/api/test/isolation.e2e-spec.ts` is the cross-boundary matrix from this document, collapsed
into one `it.each` table: a superadmin against `/admin/*` and against `/orgs/*`, an org owner against
their own org and a foreign project id, a project member against their project, a same-org project
they're not on, and a task under it, a token from one organization presented to another
organization's routes, and a suspended member's next refresh. It's built on the same factories and
`login()`/`as(actor)` helpers every other e2e suite in this repo uses — see
`.claude/commands/verify-isolation.md` for how to run and read it.

## Where this can fail, honestly

The realistic failure mode isn't a guard misconfiguration — it's a developer writing
`prisma.task.findMany({ where: { projectId } })` directly and forgetting `taskWhere(ctx)`. Nothing
in the type system stops that; `Prisma.TaskWhereInput` accepts either shape happily. Three things are
done about it, none of them airtight alone:

1. **The helper makes the correct thing the shortest thing to write.** Spreading `taskWhere(ctx)` is
   less code than hand-rolling a filter, so there's no convenience incentive to bypass it.
2. **A guardrail test fails CI the moment a call site doesn't.** It greps every `.ts` file under
   `apps/api/src` (excluding `admin/`, where the absent filter is intentional) for
   `prisma.project.find*` / `prisma.task.find*` / `.count`, and asserts each one has
   `projectWhere(`/`taskWhere(` in its call. It's a regex tripwire, not a type-level guarantee, but
   it turns a silent regression into a failed PR instead of a missed code-review comment.
3. **Postgres itself, eventually.** Phase 14 (optional, not built) adds row-level security as a
   database-enforced backstop, so even a query that skips the application-layer filter entirely
   still can't cross a tenant boundary.

Naming the failure mode here, rather than claiming the isolation is airtight, is the honest version
of this document.
