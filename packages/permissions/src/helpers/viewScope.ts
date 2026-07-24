import { FEATURES } from '../registry';
import { PermissionEntry, PermissionId } from '../types';
import { userHasPermission } from './expand';

export type ViewScope = 'all' | 'own' | 'none';

interface ViewPair {
  all?: PermissionId;
  own?: PermissionId;
}

// At module load, scan every feature for entries carrying ownership/ownershipFor and
// build entity → { all, own } pairs. Throw if one feature declares conflicting
// ownershipFor values — that is a registry bug, and it should not boot.
const viewPairs: ReadonlyMap<string, ViewPair> = (() => {
  const pairs = new Map<string, ViewPair>();

  function allEntries(): readonly PermissionEntry[] {
    return Object.values(FEATURES).flatMap((feature) => Object.values(feature.permissions));
  }

  for (const entry of allEntries()) {
    if (!entry.ownership || !entry.ownershipFor) continue;

    const pair = pairs.get(entry.ownershipFor) ?? {};
    const existing = entry.ownership === 'all' ? pair.all : pair.own;
    if (existing && existing !== entry.id) {
      throw new Error(
        `Registry drift: conflicting ownershipFor "${entry.ownershipFor}" — both "${existing}" and "${entry.id}" declare ownership "${entry.ownership}".`,
      );
    }

    if (entry.ownership === 'all') pair.all = entry.id;
    else pair.own = entry.id;
    pairs.set(entry.ownershipFor, pair);
  }

  return pairs;
})();

// isAdmin short-circuits to 'all'.
// Otherwise: holds the pair's 'all' entry → 'all'; holds 'own' → 'own'; neither → 'none'.
// Note userHasPermission expands supersets, so holding all-project also yields 'all'.
export function getViewScope(
  userScopes: readonly string[],
  entity: string,
  options?: { isAdmin?: boolean },
): ViewScope {
  if (options?.isAdmin) return 'all';

  const pair = viewPairs.get(entity);
  if (!pair) return 'none';

  if (pair.all && userHasPermission(userScopes, pair.all)) return 'all';
  if (pair.own && userHasPermission(userScopes, pair.own)) return 'own';
  return 'none';
}
