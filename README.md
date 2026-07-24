# Organizer

A multi-tenant project management system with strict data isolation between organizations and
between projects. Three access levels — superadmin, org admin, project member — share a single
enforcement point rather than per-endpoint discipline.

**Status:** under active development, built in phases. See `docs/architecture.md` for the full
design and `AGENTS.md` for repository conventions.

## Getting started

```sh
yarn install
yarn dev          # web on :3000, api on :8000 (Swagger at :8000/api)
```

Requires `apps/api/.env` populated from `.env.example` — the API talks to hosted Neon PostgreSQL,
there is no local database.

## Documentation

| Doc                       | Contents                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `docs/architecture.md`    | Domain model, permissions, API and web design, infrastructure |
| `docs/permissions.md`     | The permission registry — added in Phase 1                    |
| `docs/data-model.md`      | Schema walkthrough — added in Phase 2                         |
| `docs/isolation-model.md` | The isolation guarantee in depth — added in Phase 9           |
| `docs/deployment.md`      | Vercel + Neon runbook — added in Phase 13                     |

A full README with demo credentials and a deployment walkthrough lands in Phase 13.
