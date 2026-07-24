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

| Command                         | Does                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `yarn workspace api test:e2e`   | Runs the e2e suite against the Neon `test` schema (real DB)  |
| `yarn workspace api prisma ...` | Any Prisma CLI command, config-driven via `prisma.config.ts` |

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

Added in Phase 6, once `common/scope/` exists. This will be the most important section in this
file — read it before touching anything that queries `Project` or `Task`.

---

_Amended at phases 0, 2, 6, 9, 13._
