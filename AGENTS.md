# AGENTS.md

Canonical instructions for anyone — human or agent — working in this repository. Read this before
making changes. It is amended as new phases land; check the "Amended by" line at the bottom of
each section.

## What this is

`organizer` is a multi-tenant project management system. Three access levels — superadmin, org
admin, project member — share one guarantee: isolation between organizations and between projects
is enforced structurally, not by convention. See `docs/architecture.md` for the full design.

## Stack

| Layer              | Choice                                                                |
| ------------------ | --------------------------------------------------------------------- |
| Monorepo           | Turborepo, Yarn 4 workspaces                                          |
| API                | NestJS, Prisma (driver adapter), PostgreSQL (Neon)                    |
| Web                | Next.js 16 App Router, React 19, Tailwind CSS v4, shadcn/ui           |
| Server state (web) | TanStack Query + axios                                                |
| Client state (web) | zustand — the only client state library                               |
| Forms (web)        | react-hook-form + zod — the only form library                         |
| Hosting            | Vercel — two projects (`apps/web`, `apps/api`) from this one monorepo |

## Workspace layout

```
apps/
  api/            NestJS API
  web/             Next.js web app
packages/
  typescript-config/   shared tsconfig bases
  eslint-config/       shared eslint flat configs
  permissions/         @repo/permissions — the shared authorization vocabulary (Phase 1)
```

## Commands

Run from the repo root unless noted.

| Command            | Does                                                                       |
| ------------------ | -------------------------------------------------------------------------- |
| `yarn dev`         | Starts both apps — web on `:3000`, api on `:8000` (Swagger at `:8000/api`) |
| `yarn build`       | Builds every workspace via Turborepo                                       |
| `yarn lint`        | Lints every workspace                                                      |
| `yarn check-types` | Type-checks every workspace                                                |
| `yarn format`      | Formats the repo with Prettier                                             |
| `yarn test`        | Runs unit tests across every workspace                                     |

Database and migration commands are documented in `.claude/commands/db.md`. Two additional
per-workspace commands, run from `apps/api`:

| Command                             | Does                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `yarn workspace api test:e2e`       | Runs the e2e suite against the Neon `test` schema (real DB)                |
| `yarn workspace api prisma ...`     | Any Prisma CLI command, config-driven via `prisma.config.ts`               |
| `yarn workspace api prisma db seed` | Seeds deterministic fixtures (superadmin, two organizations) into `public` |

## Module conventions (API)

Established in full once the first feature module lands (Phase 3). Each feature module under
`apps/api/src/` is a directory containing `<name>.module.ts`, `<name>.controller.ts`,
`<name>.service.ts`, a `dto/` folder with a barrel `index.ts`, and `<name>.service.spec.ts`.

**DTO rule:** no DTO ever declares an `organizationId` field. Tenant identity is derived from the
verified access context (the JWT), never accepted from a request body. Combined with
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`, a request that includes one is
rejected outright rather than silently ignored.

## No external provenance

No file, comment, commit message, or document in this repository may reference another codebase as
a source. Every file here is written fresh for this project. Copied files carry fingerprints —
version pins, config style, comment idiom — that survive renaming, and that undermines the point of
building this from a clean specification.

## Isolation invariants

Read this before touching anything that queries `Project` or `Task`.

**The choke point.** `apps/api/src/common/scope/project-scope.util.ts` is the only place a
`Project` tenant filter is constructed. Every `findMany` / `findFirst` / `count` on `Project`
spreads `projectWhere(ctx)`. No service hand-rolls `where: { organizationId }`. When adding an
`id` to a query, spread `projectWhere(ctx)` first and the `id` second — never let a caller-supplied
key shadow a scope key.

**Why there is no "no filter" branch.** An absent tenant filter is the anti-pattern, so the helper
cannot express one. Superadmins never reach `projectWhere` — they are served by `AdminService` on
`/admin/*` (Phase 8), with an explicit `organizationId` filter. Do not "fix" the missing branch by
adding one; that is the failure mode this phase exists to prevent.

**404, not 403, across boundaries.** `ProjectAccessService.assertVisible` throws
`NotFoundException` when a project id doesn't resolve under the caller's scope — a 403 would
confirm the row exists in another organization, which is an existence leak. In-boundary permission
failures (e.g. holding `view-own-projects` but not `edit-projects`) still return 403 via
`PermissionsGuard`. This is why `PermissionsGuard` is registered _before_ `ProjectScopeGuard`: a
member editing their own project without `edit-projects` must get 403, not 404.

**The guard chain**, in registration order (`app.module.ts`'s `APP_GUARD` array):

| Guard               | Checks                                                       |
| ------------------- | ------------------------------------------------------------ |
| `AtGuard`           | Authenticates the JWT                                        |
| `OrgGuard`          | Token's org matches the URL's org                            |
| `PermissionsGuard`  | Scopes satisfy `@RequirePermissions()`                       |
| `ProjectScopeGuard` | `:projectId` (if present) resolves under `projectWhere(ctx)` |

`ProjectScopeGuard` is a no-op — `return true` — on any route with no `:projectId` param, which is
what lets it register globally without touching every other route in the app.

**`:projectId`, not `:id`.** Every project-scoped controller route names its project-id param
`:projectId` literally, because `ProjectScopeGuard` looks up that exact name. Naming it `:id` (the
convention everywhere else in the app) silently disables the guard on that route.

**Tenant identity comes from the token, never the URL or the body.** `AccessContext.orgId` is
read from the verified JWT (`user.orgId`), not from `req.organization` (which only names which org
the URL is addressing — see `ResolveOrgMiddleware`'s own comment) and not from a request body. This
extends the existing DTO rule: no DTO may declare an `organizationId` _or_ `projectId` field.

**Membership is the `own`-filter mechanism.** `getViewScope(ctx.scopes, 'project', { isAdmin })`
resolves to `'all'` (org admins and `view-projects` holders — organization-wide), `'own'`
(`view-own-projects` holders — `members: { some: { orgMembershipId: ctx.membershipId, deletedAt: null } }`),
or `'none'` (neither — `projectWhere` throws). Soft-deleting a `ProjectMember` therefore revokes
visibility immediately, which is why both project removal and project-member removal are soft
deletes (`deletedAt`), not hard deletes — a hard delete would make `projectWhere`'s own
`deletedAt: null` filter dead code.

**`AccessContext` is shared, not duplicated.** `buildAccessContext()` in `access-context.ts` is
the one function that turns `req.user` + `req.organization` into an `AccessContext`. Both `@Ctx()`
(for handlers) and `ProjectScopeGuard` (which runs before param decorators resolve, so it can't use
`@Ctx()` itself) call it — this is what keeps the guard's notion of "who is asking" from ever
drifting from the handler's.

**`taskWhere` is transitive through the project.** `taskWhere(ctx)` is
`{ deletedAt: null, project: projectWhere(ctx) }` — `Task` carries no tenant filter of its own. A
module touching tasks gets isolation by spreading `taskWhere`, not by writing its own
`projectId`/`organizationId` check.

**The proof is `apps/api/test/isolation.e2e-spec.ts`.** The cross-boundary matrix — every actor
shape against every kind of boundary, from `brainstorm/implementation-phases.md` §11 — lives there
as one table test, backed by a CI-enforced guardrail
(`apps/api/src/common/scope/guardrail.spec.ts`) that greps `src/**` (excluding `admin/`, where the
absent filter is deliberate) for a `prisma.project.find*` / `prisma.task.find*` / `.count` call
missing `projectWhere`/`taskWhere` and fails the build if one appears. See
`docs/isolation-model.md` for the full writeup and `.claude/commands/verify-isolation.md` for how
to run and read both.

---

_Amended at phases 0, 2, 6, 9, 13._
