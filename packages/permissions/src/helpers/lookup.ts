import { FEATURES } from '../registry';
import { PermissionEntry, PermissionId } from '../types';

function allEntries(): readonly PermissionEntry[] {
  return Object.values(FEATURES).flatMap((feature) => Object.values(feature.permissions));
}

export const ALL_PERMISSION_IDS: ReadonlySet<PermissionId> = new Set(
  allEntries().map((entry) => entry.id),
);

export const ID_TO_ENTRY: ReadonlyMap<PermissionId, PermissionEntry> = new Map(
  allEntries().map((entry) => [entry.id, entry]),
);

export function isValidPermissionId(value: string): boolean {
  return ALL_PERMISSION_IDS.has(value as PermissionId);
}
