import { FEATURES } from '../registry';
import { PermissionEntry, PermissionId } from '../types';

function allEntries(): readonly PermissionEntry[] {
  return Object.values(FEATURES).flatMap((feature) => Object.values(feature.permissions));
}

// entry.id -> Set(entry.id, ...grants), closed over transitively in case a granted id
// itself declares further grants.
const expansionMap: ReadonlyMap<PermissionId, ReadonlySet<PermissionId>> = (() => {
  const map = new Map<PermissionId, Set<PermissionId>>();

  for (const entry of allEntries()) {
    if (!entry.grants) continue;
    const set = new Set<PermissionId>([entry.id]);
    const queue = [...entry.grants];
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (set.has(next)) continue;
      set.add(next);
      const nested = allEntries().find((e) => e.id === next)?.grants;
      if (nested) queue.push(...nested);
    }
    map.set(entry.id, set);
  }

  return map;
})();

export function expandScopes(userScopes: readonly string[]): ReadonlySet<PermissionId> {
  const result = new Set<PermissionId>();

  for (const raw of userScopes) {
    const scope = raw as PermissionId;
    result.add(scope);
    const expanded = expansionMap.get(scope);
    if (expanded) {
      for (const granted of expanded) result.add(granted);
    }
  }

  return result;
}

function toPermissionId(required: PermissionEntry | PermissionId | string): PermissionId {
  return (typeof required === 'string' ? required : required.id) as PermissionId;
}

// True if userScopes contains the target id OR any parent granting it.
// A user holding 'all-project' therefore passes any project.* check.
// Unknown ids fall back to literal matching.
export function userHasPermission(
  userScopes: readonly string[],
  required: PermissionEntry | PermissionId | string,
): boolean {
  const target = toPermissionId(required);
  return expandScopes(userScopes).has(target);
}

// OR semantics.
export function userHasAnyPermission(
  userScopes: readonly string[],
  required: ReadonlyArray<PermissionEntry | PermissionId | string>,
): boolean {
  return required.some((entry) => userHasPermission(userScopes, entry));
}
