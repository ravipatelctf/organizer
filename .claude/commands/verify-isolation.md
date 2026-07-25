Run the cross-boundary isolation matrix and the unscoped-query guardrail, and report both as a
table. Use this to confirm the isolation guarantee still holds after touching anything under
`apps/api/src/{projects,tasks,project-members,admin}` or `common/scope/`.

## Commands

```sh
yarn workspace api test:e2e -- isolation   # the matrix — apps/api/test/isolation.e2e-spec.ts
yarn test                                  # includes the guardrail — common/scope/guardrail.spec.ts
```

## Reading the matrix

`apps/api/test/isolation.e2e-spec.ts` is one `it.each` table plus two standalone cases (the
whitelist rejection and the suspended-member refresh). Each row name states the actor, the route,
and the expected status — a failing row names exactly which boundary broke, e.g. `alice gets 404 on
a same-org project she is not on` failing means either `projectWhere`'s `members: { some: … }`
filter or `ProjectAccessService.assertVisible` regressed.

Report the result as:

| Row                                            | Result  |
| ---------------------------------------------- | ------- |
| ... one per `it.each` entry, in file order ... | ✅ / ❌ |

If the guardrail fails, its output already names the offending `file:line` and the raw call —
report that line directly rather than re-deriving it; don't add the file to the guardrail's
exclusion list without confirming the absent filter is deliberate the way `admin/`'s is (see
`docs/isolation-model.md`).

## What this does not replace

`projects.e2e-spec.ts`, `tasks.e2e-spec.ts`, and `admin.e2e-spec.ts` cover permission edge cases and
lifecycle behavior (archive/delete, duplicate keys, concurrent task numbering) that the isolation
matrix intentionally leaves out — run the full `yarn workspace api test:e2e` suite for those.
