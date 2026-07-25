Scaffold a new feature module under `apps/api/src/<name>/` in the house style established by
`auth/`, `users/`, `organizations/`, `members/`. Every feature module is a directory containing:

```
<name>/
  <name>.module.ts
  <name>.controller.ts
  <name>.service.ts
  <name>.service.spec.ts
  dto/
    index.ts          # barrel — re-export every DTO by name
    <thing>.dto.ts     # one class per file
```

## Conventions

- **DTO rule:** no DTO ever declares an `organizationId` field. Tenant identity always comes from
  the verified access context (`@OrgContext()` for the resolved organization,
  `@GetCurrentUserId()` / `@GetCurrentUser()` for the actor) — never from the request body.
  `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` is registered globally, so a
  request that includes one is rejected with 400 rather than silently ignored.
- **Controllers** use a plain `@Controller()` with no base path, and spell the full route on each
  handler (`@Get('orgs/:orgSlug/members')`, not a controller-level prefix) — this keeps org-scoped
  and account-level routes readable side by side in one file when a feature has both (see
  `organizations.controller.ts`).
- **Org-scoped routes** read the resolved organization via `@OrgContext()` (set by
  `ResolveOrgMiddleware` for any `orgs/:orgSlug/*` route) rather than re-querying by slug.
  **Account-level routes** (no `:orgSlug` segment, or routes that must bypass the organization
  check even though they sit under `orgs/:orgSlug/*`, like `POST /orgs/:slug/switch`) are marked
  `@SkipOrgCheck()`.
- **Permission-gated routes** carry `@RequirePermissions(PERMS.<feature>.<action>)` from
  `@repo/permissions`. Routes with no decorator are auth-only (any authenticated actor may call
  them); `isOrgAdmin` / `isSuperAdmin` actors bypass the check entirely.
- **Cross-boundary lookups return 404, not 403.** A service method that loads a row scoped to an
  organization (a membership, a role, an invitation, and from Phase 6 onward a project or task)
  must confirm the row belongs to `req.organization` and throw `NotFoundException` if it doesn't —
  a 403 would confirm the row exists in another organization, which is an existence leak.
- **Services** inject `PrismaService` directly; there is no need to import `PrismaModule` in a
  feature module, since it is registered `isGlobal: true` in `app.module.ts`. Multi-step writes
  that must be atomic use `this.prisma.$transaction(...)`; when several related rows need
  client-generated ids up front (to batch writes with `createMany` instead of one round trip per
  row), generate them with `randomUUID()` before the transaction — see
  `organizations.service.ts`'s role-seeding logic.
- **Register the module** in `app.module.ts`'s `imports` array. If the module needs another
  module's service, import that module and add the service to its own `exports` array — see how
  `OrganizationsModule` imports `AuthModule` and `UsersModule` for the `/orgs/:slug/switch` flow.

## Testing

- **Unit** (`<name>.service.spec.ts`) — pure logic with no HTTP surface: validation branches,
  cross-boundary lookups, anything mockable without booting the app. Mirrors
  `organizations.service.spec.ts` / `members.service.spec.ts`.
- **E2E** (`apps/api/test/<name>.e2e-spec.ts`) — every access-control assertion. Guard wiring is
  invisible to a unit test with a mocked `Reflector` and catastrophic in production, so anything
  that depends on the guard chain being registered correctly belongs here, built on
  `apps/api/test/factories.ts` and `apps/api/test/auth.ts`'s `login()` / `as(actor)` helpers.
