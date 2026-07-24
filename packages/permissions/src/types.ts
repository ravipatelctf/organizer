// Branded string: callers cannot pass arbitrary strings where a PermissionId is required.
// The brand is erased at runtime — these are plain strings in the DB and on the wire.
export type PermissionId = string & { readonly __brand: 'PermissionId' };

export type FeatureKey =
  'dashboard' | 'organization' | 'project' | 'task' | 'member' | 'role' | 'invitation' | 'audit';

export type EditorCategory = 'Workspace' | 'Delivery' | 'People' | 'Admin';

export type PermissionLevel = 'platform' | 'org' | 'project';

export type PermissionKind = 'all' | 'view' | 'view-own' | 'create' | 'edit' | 'delete' | 'custom';

export interface PermissionEntry {
  readonly id: PermissionId;
  readonly feature: FeatureKey;
  readonly label: string;
  readonly description?: string;
  readonly kind: PermissionKind;
  readonly level?: PermissionLevel; // default 'org'
  // Present on superset entries ('all-*'). Holding this grants every listed child at runtime.
  readonly grants?: readonly PermissionId[];
  // View-pair metadata. When both 'all' and 'own' entries share an ownershipFor value,
  // getViewScope() derives their relationship from the registry rather than a hardcoded map.
  readonly ownership?: 'all' | 'own';
  readonly ownershipFor?: string;
}

export interface FeatureDefinition {
  readonly key: FeatureKey;
  readonly title: string;
  readonly iconName: string; // token; the frontend maps it to a component
  readonly editorCategory: EditorCategory;
  readonly permissions: Readonly<Record<string, PermissionEntry>>;
  readonly all: PermissionEntry; // convenience pointer to the all-* entry
}

export interface DefaultRoleDefinition {
  readonly title: string;
  readonly isOrgAdmin: boolean;
  readonly rank: number;
  readonly scopes: readonly PermissionId[];
}

// Cast helper so feature files stay terse. Deliberately NOT re-exported from the
// package barrel — keeping it module-internal preserves the brand at the package
// boundary, so consumers can only obtain a PermissionId via PERMS.* or ID_TO_ENTRY.
export function id(s: string): PermissionId {
  return s as PermissionId;
}
