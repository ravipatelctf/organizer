# Organizer

A multi-tenant project management system with strict data isolation between organizations and
between projects. Three access levels — superadmin, org admin, project member — share a single
enforcement point rather than per-endpoint discipline. See `docs/architecture.md` for the full
design and `AGENTS.md` for repository conventions.

## Architecture at a glance

```
Platform
 └── Organization (tenant, addressed as /orgs/:slug)   ← isolation boundary #1
      ├── OrgMembership (user ↔ org) ─< MembershipRole >─ Role ─< RolePermission
      └── Project                                       ← isolation boundary #2
           ├── ProjectMember (org membership ↔ project)
           └── Task
```

Two Vercel projects from this one monorepo — `apps/web` (Next.js) and `apps/api` (NestJS) — share
one hosted Neon PostgreSQL database. `apps/web` rewrites `/api/*` to `apps/api`'s deployment so the
pair is same-origin in production; see `docs/deployment.md`.

```
Browser → shiksha.ravipatelctf.com
            ├─ /*      → apps/web   (Next.js, Vercel)
            └─ /api/*  → apps/api   (NestJS, Vercel, rewritten same-origin)
                            └─ Neon PostgreSQL (pooled + direct)
```

## Getting started

```sh
yarn install
yarn dev          # web on :3000, api on :8000 (Swagger at :8000/api)
```

Requires `apps/api/.env` and `apps/web/.env`, each populated from their `.env.example` — the API
talks to hosted Neon PostgreSQL, there is no local database and no Docker for development.

### Run from a fresh clone

1. Create a free [Neon](https://neon.tech) project and copy its pooled connection string.
2. `cp apps/api/.env.example apps/api/.env` and fill in `DATABASE_URL` (the pooled string) and
   `DIRECT_URL` (the same host with `-pooler` removed) — see `docs/data-model.md` for why both
   exist. Generate `AT_SECRET` and `RT_SECRET` with `openssl rand -hex 64` each.
3. `cp apps/web/.env.example apps/web/.env` — its default, `http://localhost:8000`, is used as-is
   for local dev, so the web app talks to the api directly.
4. Apply migrations and seed demo data:
   ```sh
   yarn workspace api prisma migrate deploy
   yarn workspace api prisma db seed
   ```
5. `yarn dev` and sign in with one of the credentials below.

## Demo credentials

Seeded by `apps/api/prisma/seed.ts` — every account shares one password.

| Email                 | Organization      | Role                    | Sees               |
| --------------------- | ----------------- | ----------------------- | ------------------ |
| `super@organizer.dev` | —                 | superadmin (`/admin/*`) | every organization |
| `owner@acme.test`     | Acme (`acme`)     | Owner                   | Apollo + Borealis  |
| `admin@acme.test`     | Acme (`acme`)     | Admin                   | Apollo + Borealis  |
| `alice@acme.test`     | Acme (`acme`)     | Member                  | Apollo only        |
| `bob@acme.test`       | Acme (`acme`)     | Member                  | Borealis only      |
| `owner@globex.test`   | Globex (`globex`) | Owner                   | Cosmos             |
| `carol@globex.test`   | Globex (`globex`) | Member                  | Cosmos             |

Password for all of the above: `password123`.

## Documentation

| Doc                       | Contents                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `docs/architecture.md`    | Domain model, permissions, API and web design, infrastructure |
| `docs/permissions.md`     | The permission registry                                       |
| `docs/data-model.md`      | Schema walkthrough                                            |
| `docs/isolation-model.md` | The isolation guarantee in depth                              |
| `docs/deployment.md`      | Vercel + Neon deployment runbook                              |
