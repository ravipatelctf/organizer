export type {
  DefaultRoleDefinition,
  EditorCategory,
  FeatureDefinition,
  FeatureKey,
  PermissionEntry,
  PermissionId,
  PermissionKind,
  PermissionLevel,
} from './types';

export { FEATURES, PERMS } from './registry';

export { DEFAULT_ROLES } from './defaultRoles';

export { DEPENDENCIES, applyDependencies, featuresByEditorCategory } from './helpers/categorize';
export type { PermissionDependency } from './helpers/categorize';
export { expandScopes, userHasAnyPermission, userHasPermission } from './helpers/expand';
export { ALL_PERMISSION_IDS, ID_TO_ENTRY, isValidPermissionId } from './helpers/lookup';
export { getViewScope } from './helpers/viewScope';
export type { ViewScope } from './helpers/viewScope';
