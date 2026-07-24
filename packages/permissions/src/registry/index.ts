import { FeatureDefinition, FeatureKey, PermissionEntry } from '../types';
import { auditFeature } from './audit';
import { dashboardFeature } from './dashboard';
import { invitationFeature } from './invitation';
import { memberFeature } from './member';
import { organizationFeature } from './organization';
import { projectFeature } from './project';
import { roleFeature } from './role';
import { taskFeature } from './task';

export const FEATURES: Readonly<Record<FeatureKey, FeatureDefinition>> = {
  dashboard: dashboardFeature,
  organization: organizationFeature,
  project: projectFeature,
  task: taskFeature,
  member: memberFeature,
  role: roleFeature,
  invitation: invitationFeature,
  audit: auditFeature,
};

// Looks the entry up by its id and throws at module load if it is missing, so registry
// drift fails loudly at boot rather than silently at runtime.
function p(feature: FeatureKey, permissionId: string): PermissionEntry {
  const entry = FEATURES[feature].permissions[permissionId];
  if (!entry) {
    throw new Error(
      `Registry drift: unknown permission id "${permissionId}" for feature "${feature}"`,
    );
  }
  return entry;
}

export const PERMS = {
  dashboard: {
    all: FEATURES.dashboard.all,
    view: p('dashboard', 'view-dashboard'),
    viewOwn: p('dashboard', 'view-own-dashboard'),
  },
  organization: {
    all: FEATURES.organization.all,
    view: p('organization', 'view-organization'),
    edit: p('organization', 'edit-organization'),
    delete: p('organization', 'delete-organization'),
  },
  project: {
    all: FEATURES.project.all,
    view: p('project', 'view-projects'),
    viewOwn: p('project', 'view-own-projects'),
    create: p('project', 'create-projects'),
    edit: p('project', 'edit-projects'),
    archive: p('project', 'archive-projects'),
    delete: p('project', 'delete-projects'),
    manageMembers: p('project', 'manage-project-members'),
  },
  task: {
    all: FEATURES.task.all,
    view: p('task', 'view-tasks'),
    viewOwn: p('task', 'view-own-tasks'),
    create: p('task', 'create-tasks'),
    edit: p('task', 'edit-tasks'),
    delete: p('task', 'delete-tasks'),
    assign: p('task', 'assign-tasks'),
  },
  member: {
    all: FEATURES.member.all,
    view: p('member', 'view-members'),
    invite: p('member', 'invite-members'),
    edit: p('member', 'edit-members'),
    suspend: p('member', 'suspend-members'),
    remove: p('member', 'remove-members'),
  },
  role: {
    all: FEATURES.role.all,
    view: p('role', 'view-roles'),
    create: p('role', 'create-roles'),
    edit: p('role', 'edit-roles'),
    delete: p('role', 'delete-roles'),
  },
  invitation: {
    all: FEATURES.invitation.all,
    view: p('invitation', 'view-invitations'),
    revoke: p('invitation', 'revoke-invitations'),
  },
  audit: {
    all: FEATURES.audit.all,
    view: p('audit', 'view-audit-logs'),
  },
} as const;
