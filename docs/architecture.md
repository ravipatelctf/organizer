# Architecture

This is the design reference for `organizer`, written for someone encountering the project for the
first time. It describes the full target shape of the system; individual pieces arrive over the
course of the build phases (see `AGENTS.md` and the git history for what currently exists).

## 1. Domain model

```
Platform
 └── Organization (tenant, addressed as /orgs/:slug)   ← isolation boundary #1
      ├── OrgMembership (user ↔ org) ─< MembershipRole >─ Role ─< RolePermission
      └── Project                                       ← isolation boundary #2
           ├── ProjectMember (org membership ↔ project)
           └── Task
```

Users are global — one account can belong to many organizations. That is why account-level routes
(login, the organization picker) are kept separate from org-scoped routes (everything under
`/orgs/:slug/*`): a user's identity and their membership in a particular tenant are different
things, resolved at different points in the request.

## 2. The three access levels

| Level          | Stored as                                                      | Sees                                 |
| -------------- | -------------------------------------------------------------- | ------------------------------------ |
| Superadmin     | `users.is_super_admin = true`                                  | Every organization, every project    |
| Org Admin      | An `OrgMembership` holding a `Role` with `is_org_admin = true` | Every project in that org            |
| Project Member | An `OrgMembership` plus rows in `project_members`              | Only the projects they were added to |

Two things worth being explicit about, because they are easy to get subtly wrong:

- **Superadmin is a column, not a role.** Roles belong to an organization
  (`roles.organization_id` is required); a platform operator belongs to no organization, so a role
  row for them would be a lie in the data.
- **The admin/member split is a view scope, not a hardcoded branch.** "See every project" and "see
  only my projects" are two ends of one permission pair, resolved by a single helper
  (`getViewScope`, see §3). That means adding a role like "sees everything but can't edit settings"
  later requires no new branching logic — just a different permission set.
- **`isSuperAdmin` must reach the JWT.** A flag that lives only in the database and never makes it
  into the token is invisible to every guard that checks the token — the system would look like it
  has three levels and actually enforce two.

## 3. The permissions package

`packages/permissions` (published as `@repo/permissions`) is the single source of truth for
authorization, consumed by both the API and the web app. It has no framework dependencies — no
NestJS, no React, no Prisma — because both sides of the wire need to agree on the same vocabulary.

It is built from a **registry**: one file per feature (`project`, `task`, `member`, `role`, …),
each declaring its permissions plus an `all-<feature>` superset entry. Two properties fall out of
that structure:

- **Superset expansion.** Holding `all-project` should satisfy any `project.*` check without
  special-casing it — a small helper (`expandScopes`) computes this once at module load from the
  `grants` arrays on superset entries.
- **View scope resolution.** Project and task each expose a `view` / `view-own` pair tagged with
  matching `ownership` metadata. `getViewScope(scopes, entity)` reads that metadata and returns
  `'all' | 'own' | 'none'` — this tri-state is what the query-scoping helpers in the API key off of.

Default roles (Owner, Admin, Project Manager, Member) are just fixed scope sets defined against
this registry, seeded into a new organization's `roles` + `role_permissions` tables when it is
created. Superadmin is deliberately not one of them.

## 4. API architecture

### Guard chain

Registered as `APP_GUARD`, in this order:

1. **AtGuard** — JWT authentication. `@Public()` bypasses it.
2. **OrgGuard** — checks that the organization named in the URL path matches the organization
   bound in the verified token. The path segment is client-supplied and carries no authority by
   itself; it only names which tenant is being addressed. A superadmin token has no org context and
   is refused on any `/orgs/*` route, pointed instead at `/admin/*`.
3. **PermissionsGuard** — checks `@RequirePermissions()` against the token's scopes. Skipped for
   org admins and superadmins, who are not scope-checked.
4. **ProjectScopeGuard** — for routes with a `:projectId` param, confirms the actor can see that
   project. No-op otherwise.

### The choke point

A guard can protect `GET /projects/:id` because there is an id to check against. It cannot protect
`GET /projects` — a list endpoint has no id, and a query that forgets its filter simply returns
everything with no guard ever firing. The actual enforcement has to live in the database `where`
clause, which is why every read of `Project` or `Task` is required to go through one of two
helpers:

```ts
projectWhere(ctx: AccessContext): Prisma.ProjectWhereInput
taskWhere(ctx: AccessContext): Prisma.TaskWhereInput   // delegates to projectWhere — isolation is transitive
```

`projectWhere` reads the actor's view scope and returns the narrowest `where` clause that scope
allows — always scoped to `ctx.orgId`, and additionally to the actor's own project memberships when
their scope is `'own'`. There is deliberately no branch that returns an unfiltered query; an absent
tenant filter is the failure mode this whole design exists to prevent.

Writes take `organizationId` from the access context, never from the request body — DTOs have no
such field, and the global `ValidationPipe` rejects a request that includes one. Reads that cross a
tenant boundary return `404`, not `403` — a `403` would confirm the row exists somewhere else, which
is itself a small information leak.

## 5. Web architecture

Next.js 16 App Router, single domain, path-based tenancy (`/orgs/:slug/*`) — no host parsing, no
rewriting middleware for routing. `app/orgs/[slug]/layout.tsx` resolves the organization once and
hands it down through context; everything below reads from there instead of re-deriving it.

The UI is permission-driven rather than role-driven: a component like
`<PermissionGate permission={PERMS.project.create}>` wraps a button once, and any custom role that
grants that permission gets correct UI automatically. `usePermission()` mirrors the API's guard
logic — short-circuiting true for org admins and superadmins, otherwise delegating to
`userHasPermission` from `@repo/permissions`, so both sides of the wire agree on what a given scope
set allows.

One form library (react-hook-form + zod) and one client-state library (zustand) — running two of
either would be drift, not design flexibility.

## 6. Infrastructure

There is no local database and no Docker for development. Everything runs against one hosted Neon
PostgreSQL branch, split into two schemas selected via Prisma's `?schema=` parameter:

```
Neon production branch
├── schema "public"  → application, seed, demo data
└── schema "test"    → automated tests only
```

The split exists because the e2e suite truncates every table it can see — confining it to a
separate schema means a test run can never wipe demo data sitting in `public`.

Two connection strings are derived from the one Neon credential: the pooled host (used at runtime,
through the driver adapter) and the direct host — the same host with `-pooler` removed — used for
migrations and seeding, since migrations can't run through a transaction pooler.

Deployment is two Vercel projects from this one monorepo (`apps/web`, `apps/api`), with the web
project rewriting `/api/*` to the API deployment so the whole thing is same-origin — no CORS
configuration, no cross-site cookie handling for the refresh token.
