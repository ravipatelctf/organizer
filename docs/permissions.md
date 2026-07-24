# The permission registry

`@repo/permissions` (`packages/permissions`) is the single source of truth for authorization. Both
`apps/api` and `apps/web` depend on it as `"@repo/permissions": "workspace:*"`. It has no framework
dependencies — no NestJS, no React, no Prisma — because the API and the web app both need to agree
on exactly the same vocabulary, and a shared dependency is the only way to guarantee that.

## Shape of the registry

Each feature (`project`, `task`, `member`, `role`, `organization`, `invitation`, `audit`,
`dashboard`) is one file under `src/registry/`. A feature file declares a handful of
`PermissionEntry` objects — an id, a label, a `kind` (`view` | `create` | `edit` | `delete` | …) —
plus one `all-<feature>` superset entry whose `grants` array lists every other id in that feature.

`src/registry/index.ts` assembles all eight into `FEATURES` and derives a typed `PERMS` facade —
`PERMS.project.create`, `PERMS.task.assign`, and so on — so call sites never spell out a raw id
string. The lookup helper backing `PERMS` (`p(feature, id)`) throws at module load if an id is
missing, so a typo in the registry fails at boot, not at some unlucky runtime request.

## The two things call sites actually use

**`userHasPermission(scopes, required)`** — does this actor's scope array satisfy this permission?
It expands supersets first: a scope array containing `all-project` satisfies any `project.*` check,
because `expandScopes()` walks every entry's `grants` once at module load and builds the reverse
map (which raw scopes satisfy a given id). `userHasAnyPermission` is the OR version.

**`getViewScope(scopes, entity, { isAdmin })`** — resolves to `'all' | 'own' | 'none'`. This is what
the API's query-scoping helpers (`projectWhere`, `taskWhere` — arriving in Phase 6) key off of. It
works by scanning the registry once for any entry carrying `ownership: 'all' | 'own'` paired with an
`ownershipFor` value (`project` and `task` are the two entities that declare this today), then
checking which side of the pair the actor's scopes satisfy. `isAdmin: true` short-circuits to
`'all'` without touching scopes at all — an org admin's visibility isn't scope-gated.

## Adding a feature

1. Add `src/registry/<feature>.ts` following an existing file: declare each `PermissionEntry`, then
   an `all-<feature>` entry whose `grants` lists every sibling id.
2. If the feature has a "see everything" / "see only mine" split (like `project` and `task`), tag
   the pair with matching `ownership` / `ownershipFor` values — this is what makes `getViewScope`
   work for it. Skipping this silently breaks visibility resolution for that entity.
3. Register the feature in `src/registry/index.ts`'s `FEATURES` map and extend `PERMS` with its
   facade entries.
4. Add it to `FeatureKey` and pick an `EditorCategory` in `src/types.ts`.
5. If any of its permissions imply another (a `create` implying the matching `view`), add an entry
   to `DEPENDENCIES` in `src/helpers/categorize.ts`.
6. Add a unit test asserting the new feature's `all-*` grants resolve and, if relevant, that its
   ownership pair round-trips through `getViewScope`.

## Adding a role

Default roles (`src/defaultRoles/index.ts`) are just a fixed `scopes` array checked against the
registry — there's no separate mechanism to learn. Follow the existing four (`Owner`, `Admin`,
`Project Manager`, `Member`) as a template: give it a `rank` (lower is more privileged), decide
`isOrgAdmin` (an org-admin role bypasses scope checks entirely in the API's `PermissionsGuard`), and
list the `PERMS.*` ids it should hold. These are seeded into a new organization's `roles` +
`role_permissions` tables when `POST /organizations` runs (Phase 4) — adding a role here does not by
itself change any existing organization's data.

Superadmin is deliberately absent from this list — it's the `users.is_super_admin` column, checked
before RBAC runs at all, not a role scoped to an organization.
