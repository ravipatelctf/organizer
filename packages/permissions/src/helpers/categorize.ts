import { FEATURES, PERMS } from '../registry';
import { EditorCategory, FeatureDefinition, PermissionId } from '../types';

export function featuresByEditorCategory(): Record<EditorCategory, FeatureDefinition[]> {
  const result: Record<EditorCategory, FeatureDefinition[]> = {
    Workspace: [],
    Delivery: [],
    People: [],
    Admin: [],
  };

  for (const feature of Object.values(FEATURES)) {
    result[feature.editorCategory].push(feature);
  }

  return result;
}

export interface PermissionDependency {
  readonly id: PermissionId;
  readonly implies?: readonly PermissionId[]; // auto-added when id is selected
  readonly impliesOneOf?: readonly PermissionId[]; // if none present, add the first
}

// Dependency rules: every create/edit/delete implies the matching view; where a feature
// has a view pair, use impliesOneOf: [view, viewOwn].
export const DEPENDENCIES: readonly PermissionDependency[] = [
  { id: PERMS.project.create.id, impliesOneOf: [PERMS.project.view.id, PERMS.project.viewOwn.id] },
  { id: PERMS.project.edit.id, impliesOneOf: [PERMS.project.view.id, PERMS.project.viewOwn.id] },
  {
    id: PERMS.project.archive.id,
    impliesOneOf: [PERMS.project.view.id, PERMS.project.viewOwn.id],
  },
  {
    id: PERMS.project.delete.id,
    impliesOneOf: [PERMS.project.view.id, PERMS.project.viewOwn.id],
  },
  {
    id: PERMS.project.manageMembers.id,
    impliesOneOf: [PERMS.project.view.id, PERMS.project.viewOwn.id],
  },
  { id: PERMS.task.create.id, impliesOneOf: [PERMS.task.view.id, PERMS.task.viewOwn.id] },
  { id: PERMS.task.edit.id, impliesOneOf: [PERMS.task.view.id, PERMS.task.viewOwn.id] },
  { id: PERMS.task.delete.id, impliesOneOf: [PERMS.task.view.id, PERMS.task.viewOwn.id] },
  { id: PERMS.task.assign.id, impliesOneOf: [PERMS.task.view.id, PERMS.task.viewOwn.id] },
  { id: PERMS.member.invite.id, implies: [PERMS.member.view.id] },
  { id: PERMS.member.edit.id, implies: [PERMS.member.view.id] },
  { id: PERMS.member.suspend.id, implies: [PERMS.member.view.id] },
  { id: PERMS.member.remove.id, implies: [PERMS.member.view.id] },
  { id: PERMS.role.create.id, implies: [PERMS.role.view.id] },
  { id: PERMS.role.edit.id, implies: [PERMS.role.view.id] },
  { id: PERMS.role.delete.id, implies: [PERMS.role.view.id] },
  { id: PERMS.organization.edit.id, implies: [PERMS.organization.view.id] },
  { id: PERMS.organization.delete.id, implies: [PERMS.organization.view.id] },
  { id: PERMS.invitation.revoke.id, implies: [PERMS.invitation.view.id] },
];

export function applyDependencies(newlyAdded: PermissionId, scopes: Set<string>): void {
  const dependency = DEPENDENCIES.find((d) => d.id === newlyAdded);
  if (!dependency) return;

  if (dependency.implies) {
    for (const impliedId of dependency.implies) scopes.add(impliedId);
  }

  const [firstAlternative] = dependency.impliesOneOf ?? [];
  if (firstAlternative) {
    const alreadyHasOne = dependency.impliesOneOf!.some((impliedId) => scopes.has(impliedId));
    if (!alreadyHasOne) scopes.add(firstAlternative);
  }
}
