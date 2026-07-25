# Deployment

`organizer` deploys as two Vercel projects from this one monorepo, both reading the same Neon
database, behind a rewrite that makes the pair same-origin. This is the runbook for doing that by
hand from a clone with an empty Vercel account. Nothing here has been run against a live
deployment yet — treat every command as untested until you've run it once.

## Prerequisites

- A GitHub remote for this repo (`origin` → `ravipatelctf/organizer`) — Vercel deploys from a Git
  provider, not a local push.
- A Vercel account with access to create two projects.
- The Neon connection string. `brainstorm/.env` holds the pooled URL (`NEON_DB_URL`) for local
  development; it is intentionally excluded from git via `.git/info/exclude`, not `.gitignore` —
  confirm with `git check-ignore -v brainstorm/.env` before copying anything out of it, and never
  paste its contents anywhere but the Vercel dashboard's env var fields.

## 1. Create the two Vercel projects

Both from the same GitHub repo, distinguished by root directory:

| Project | Root directory | Build command                                                             | Domain                     |
| ------- | -------------- | ------------------------------------------------------------------------- | -------------------------- |
| `web`   | `apps/web`     | (framework default → Next.js)                                             | `shiksha.ravipatelctf.com` |
| `api`   | `apps/api`     | (framework default; Vercel auto-detects `vercel-build` in `package.json`) | default `*.vercel.app`     |

The `api` project needs no custom domain — the `web` project reaches it only through the rewrite
in `apps/web/vercel.ts`, never directly.

## 2. Environment variables

Set these in each project's Vercel dashboard (Settings → Environment Variables), scoped to
Production (and Preview, for `api`, if you want preview deploys to boot at all — see the
migration-guard note below before doing that).

| Variable                    | Value                                                              | Project |
| --------------------------- | ------------------------------------------------------------------ | ------- |
| `DATABASE_URL`              | Neon **pooled** connection string                                  | `api`   |
| `DIRECT_URL`                | Same host with `-pooler` removed                                   | `api`   |
| `AT_SECRET`                 | `openssl rand -hex 64` — generate once                             | `api`   |
| `RT_SECRET`                 | `openssl rand -hex 64` — generate once, different from `AT_SECRET` | `api`   |
| `WEB_ORIGIN`                | `https://shiksha.ravipatelctf.com`                                 | `api`   |
| `PORT`                      | Not needed — Vercel supplies its own                               | —       |
| `NEXT_PUBLIC_API_BASE_PATH` | `/api`                                                             | `web`   |

`AT_SECRET` and `RT_SECRET` must be generated once and kept identical across the project's
environments — rotating either invalidates every outstanding token and session.

## 3. Point the rewrite at the real api URL

`apps/web/vercel.ts` ships with a placeholder:

```ts
routes.rewrite('/api/(.*)', 'https://<api-project>.vercel.app/$1');
```

Once the `api` project exists, replace `<api-project>.vercel.app` with its actual `*.vercel.app`
production URL and redeploy `web`. This is what makes the pair same-origin from the browser's
point of view — no CORS configuration, and the refresh-token cookie never crosses a site boundary.

## 4. The migration guard

`apps/api/package.json` defines a `vercel-build` script, which Vercel runs instead of `build`
whenever present:

```sh
prisma generate && (if [ "$VERCEL_ENV" = production ]; then prisma migrate deploy; fi) && nest build
```

Vercel sets `VERCEL_ENV` to `production`, `preview`, or `development` depending on which kind of
deployment is running. Without the guard, opening a pull request would trigger a preview build that
migrates the one production database before the PR has even been reviewed — there is no staging
database to isolate that from. The guard means only a deploy that lands on the `production`
environment (the default branch, typically `main`) runs `prisma migrate deploy`; every preview
build still runs `prisma generate` and `nest build` so type-checking and the build itself are still
verified.

## 5. DNS

One record, at whatever registrar/DNS provider controls `ravipatelctf.com`:

```
CNAME shiksha → cname.vercel-dns.com
```

Vercel's dashboard shows this exact value once you add `shiksha.ravipatelctf.com` as a domain on
the `web` project — add the domain there first, then add the record, then wait for Vercel to
report it verified.

## 6. Post-deploy verification

1. Check the `api` project's build log for the `prisma migrate deploy` step — it should list the
   migrations it applied (or say there's nothing to do, on a redeploy).
2. `curl -s https://<api-project>.vercel.app/health` — expect `200`.
3. Seed the database once, from your machine, against the **direct** Neon URL (not through
   Vercel — this is a one-shot operation, not part of the deploy):
   ```sh
   yarn workspace api prisma db seed
   ```
4. Visit `https://shiksha.ravipatelctf.com`, log in with one of the demo credentials in the root
   `README.md`, and confirm the request round-trips through `/api/*` (check the network tab — the
   request should stay on `shiksha.ravipatelctf.com`, not go to the `api` project's own domain).
5. Re-run the isolation matrix by hand against the live URL — this is the phase's actual
   acceptance check. Reproduce each row from
   `brainstorm/implementation-phases.md` §11 with the seeded fixtures:

   | Actor               | Request                                    | Expect                         |
   | ------------------- | ------------------------------------------ | ------------------------------ |
   | superadmin          | `GET /admin/projects`                      | every org's projects           |
   | superadmin          | `GET /orgs/acme/projects`                  | 403 — pointed at `/admin/*`    |
   | Acme owner          | `GET /orgs/acme/projects`                  | Apollo + Borealis              |
   | Acme owner          | `GET /orgs/acme/projects/:globexProjectId` | 404                            |
   | Acme owner          | `GET /orgs/globex/projects` (Acme token)   | 403                            |
   | alice (Acme member) | `GET /orgs/acme/projects`                  | Apollo only                    |
   | alice               | `GET /orgs/acme/projects/:borealisId`      | 404                            |
   | alice               | `GET /orgs/acme/tasks/:borealisTaskId`     | 404                            |
   | alice               | `POST /orgs/acme/projects`                 | 403 (no `create-projects`)     |
   | carol (Globex)      | any `/orgs/acme/*` resource                | 403 (token is Globex-bound)    |
   | any                 | request body containing `organizationId`   | 400 (DTO whitelist rejects it) |

   A full local run of the same matrix as an automated test lives at
   `apps/api/test/isolation.e2e-spec.ts`; this checklist is the same claims, done by hand against
   the deployed instance instead of the local one.

## Honest notes

- **Isolation is logical, not database-enforced.** Every project/task read goes through
  `projectWhere`/`taskWhere` (see `docs/isolation-model.md`), but the database itself will still
  answer an unfiltered query if application code were ever wrong. Postgres row-level security
  closes that gap and is scoped as optional Phase 14 — not done here.
- **Permission changes lag up to 15 minutes.** Scopes are baked into the access token at login/
  refresh, not re-read per request, so revoking a permission takes effect at the holder's next
  token refresh rather than immediately. The alternative — a database read on every authenticated
  request — was traded away for latency.
- **Cold starts.** Neon's free tier scales the compute to zero after a period of inactivity; the
  first request after idle pays roughly 500ms extra while it wakes. If a demo's first request feels
  slow, that's this, not a performance regression.
- **Superadmin is a standing privilege, not break-glass.** `users.is_super_admin` is always-on for
  whoever holds it, with no time-boxing or elevation workflow. Every request it makes is audited
  (`audit_logs`, see `docs/isolation-model.md`), which gives visibility after the fact but not
  prevention — a deliberate scope cut for a project this size, not an oversight.
