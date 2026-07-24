# Data model

This walks through the schema as it exists so far (identity and RBAC — Phase 2). `Project`,
`Task`, and `AuditLog` arrive in Phases 6–8; this document is amended as they land.

## Conventions

Every table uses a `uuid` primary key, `snake_case` column names via Prisma's `@map`/`@@map`, and
the same three timestamp columns: `created_at`, `updated_at`, `deleted_at` (soft delete — nothing
in this schema is ever hard-deleted from application code). Tables that record who made a change
carry `created_by` / `updated_by` (or an equivalent actor column, e.g. `invited_by`,
`assigned_by`), all with `onDelete: SetNull` — losing the actor's account shouldn't cascade into
losing the record of what they did.

## Tables

**`users`** — global accounts. `is_super_admin` is the single boolean that makes someone a platform
operator; it is deliberately not a role (see below). `reset_password_token_hash` is unique so a
token can be looked up directly without scanning, and it's a hash, not the raw token, for the same
reason passwords are hashed.

**`organizations`** — the tenant boundary. `slug` is the `/orgs/:slug` URL segment and is globally
unique. `settings` is an open `jsonb` bag for anything that doesn't need its own column yet.

**`org_memberships`** — the join between a user and an organization, one row per user per org
(`@@unique([organizationId, userId])`). `status` (`INVITED` → `ACTIVE`, or `SUSPENDED`/`REMOVED`)
is a string rather than an enum because Prisma enums require a migration to add a value and this
one is expected to grow. Invitation state (`invitation_token_hash`, `invitation_expires_at`) lives
on this same row rather than a separate table — there's exactly one pending invitation per
membership at a time.

**`roles`** — scoped to one organization (`organization_id` is required, not nullable — see below).
`rank` is a plain integer (1 = highest privilege) used for display ordering and for preventing a
member from assigning a role above their own rank in later phases. `is_org_admin` is access level 2
from the architecture doc: holding a role with this flag means "every project in this org," not
scope-checked. `is_system_role` marks the four seeded roles (Owner/Admin/Project Manager/Member) as
undeletable.

**`role_permissions`** — a role's granted permission ids, each a raw string
(`view-own-projects`, `create-projects`, …) validated against `@repo/permissions`'
`isValidPermissionId()` at write time (Phase 5) rather than constrained by a foreign key — the
registry, not the database, is the source of truth for which ids exist.

**`membership_roles`** — the many-to-many between a membership and the roles it holds. A membership
can hold more than one role; the union of every held role's permissions is what the JWT's `scopes`
array ends up containing (Phase 3).

**`sessions`** — one row per refresh token. `organization_id` is nullable: `null` means an
account-level session (before an org is chosen), set means the session — and the access token
minted from it — is bound to exactly one organization. This is what makes "one token, one org"
enforceable: switching organizations mints a new session rather than mutating this one.

## Two things worth calling out explicitly

**Why `roles.organization_id` is required, not nullable.** A nullable column inviting a "global
role" would immediately need special-casing everywhere a role is looked up. Superadmin sidesteps
the whole question by not being a role at all — it's the `users.is_super_admin` column, checked
before any role/permission logic runs.

**Why permission ids are strings, not a foreign key to a `permissions` table.** The permission
registry (`@repo/permissions`) is shared TypeScript, versioned with the code that reads it. Making
the database the source of truth for valid ids would mean every registry change needs a data
migration in lockstep; instead the database stores whatever the application layer already
validated, and `role_permissions.permission_id` is just `varchar(100)`.

## What's not here yet

`Project`, `ProjectMember`, and `Task` (Phase 6/7) will each carry a denormalized
`organization_id` alongside their "real" parent reference, specifically so every isolation-scoped
query filters one indexed column with no join. That tradeoff — and the isolation model it exists to
support — is documented in full once those tables land (`docs/isolation-model.md`, Phase 9).
`AuditLog` (Phase 8) is append-only and has no soft-delete column, since an audit trail that can be
"deleted" isn't one.
