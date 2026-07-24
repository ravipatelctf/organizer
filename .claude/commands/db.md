Database commands — always run from the repo root unless noted. There is no local database; every
command below talks to the hosted Neon branch, scoped to either the `public` schema (application
data) or the `test` schema (`?schema=test`, via `apps/api/.env.test`) — never both at once.

## Everyday commands

| Command                              | Does                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| `yarn workspace api prisma studio`   | Opens Prisma Studio against `public` (uses `DIRECT_URL`) |
| `yarn workspace api prisma validate` | Validates `schema.prisma` without touching the database  |
| `yarn workspace api prisma generate` | Regenerates the Prisma Client from the schema            |

## Authoring a migration

**Never run a bare `prisma migrate dev` against this database** — it can decide the schema has
drifted and offer to reset it, which is fine against a throwaway local database and not acceptable
against the only one there is.

```sh
yarn workspace api prisma migrate dev --create-only --name <meaningful_name>   # writes SQL, applies nothing
# read the generated SQL under apps/api/prisma/migrations/<timestamp>_<name>/migration.sql
yarn workspace api prisma migrate deploy                                       # applies it to `public`, forward-only
```

Then apply the same migration to the `test` schema so it tracks the same history:

```sh
yarn workspace api dotenv -e .env.test -- yarn exec prisma migrate deploy
```

Rules: forward-only (no down-migrations), never edit a migration that has already run anywhere
(the checksum diverges and `migrate deploy` fails — add a new migration instead), meaningful names
(`add_projects`, not `migration_2`).

## Seeding

Not added until Phase 4 (roles seeded at org-creation time) and Phase 9 (`prisma/seed.ts` fixtures).
Once it exists: `yarn workspace api prisma db seed`.

## Tests

```sh
yarn test               # unit — mocks, no database
yarn workspace api test:e2e   # e2e — real Postgres via the `test` schema, maxWorkers 1
```

`apps/api/test/truncate.ts` truncates every table the suite can see before each test. This is why
tests must never point at `public` — confirm `apps/api/.env.test` has `?schema=test` before running
anything destructive.

## Recovery

If the `test` schema gets into a bad state, the safe reset is:

```sh
yarn workspace api dotenv -e .env.test -- yarn exec prisma migrate reset
```

There is no data worth protecting in `test` — it exists to be truncated. Never run `migrate reset`
against `public`.
