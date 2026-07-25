import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Every findMany/findFirst/count against Project or Task must spread projectWhere(ctx) /
// taskWhere(ctx) — that spread is the one place tenant isolation is enforced for list-shaped
// queries, since ProjectScopeGuard has no id to check on a route like GET /projects. This test
// fails a PR the moment a call site forgets it, rather than waiting for a human to notice.
//
// admin/ is the one deliberate exception: AdminService serves /admin/*, where an absent
// organizationId filter is the documented, visible point of that surface (see its own
// module-level comment), not an oversight.
describe('Guardrail — every Project/Task read is tenant-scoped', () => {
  const srcRoot = path.resolve(__dirname, '../../');
  const excludedDirs = new Set(['admin']);
  const readCallPattern = /prisma\.(project|task)\.(findMany|findFirst|count)\(/g;
  const scopeCallPattern = /\b(projectWhere|taskWhere)\(/;

  function collectFiles(dir: string, relativeTo: string): string[] {
    const entries = readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(relativeTo, fullPath);

      if (entry.isDirectory()) {
        if (excludedDirs.has(entry.name)) continue;
        files.push(...collectFiles(fullPath, relativeTo));
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        files.push(relativePath);
      }
    }

    return files;
  }

  it('spreads projectWhere/taskWhere at every project or task read', () => {
    const violations: string[] = [];

    for (const relativePath of collectFiles(srcRoot, srcRoot)) {
      const filePath = path.join(srcRoot, relativePath);
      const contents = readFileSync(filePath, 'utf8');
      const lines = contents.split('\n');

      for (const match of contents.matchAll(readCallPattern)) {
        const upToMatch = contents.slice(0, match.index);
        const lineNumber = upToMatch.split('\n').length;

        // The call's `where` argument can span several lines — look at a window around the
        // call site rather than just the matched line.
        const windowEnd = Math.min(lineNumber + 6, lines.length);
        const window = lines.slice(lineNumber - 1, windowEnd).join('\n');

        if (!scopeCallPattern.test(window)) {
          violations.push(
            `${relativePath}:${lineNumber} — ${match[0]} without projectWhere/taskWhere`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
