import { ALL_PERMISSION_IDS } from '../helpers/lookup';
import { PERMS } from '../registry';
import { DefaultRoleDefinition, PermissionId } from '../types';

const everyPermissionId: readonly PermissionId[] = [...ALL_PERMISSION_IDS];

const owner: DefaultRoleDefinition = {
  title: 'Owner',
  isOrgAdmin: true,
  rank: 1,
  scopes: everyPermissionId,
};

const admin: DefaultRoleDefinition = {
  title: 'Admin',
  isOrgAdmin: true,
  rank: 2,
  scopes: everyPermissionId.filter((permissionId) => permissionId !== PERMS.organization.delete.id),
};

const projectManager: DefaultRoleDefinition = {
  title: 'Project Manager',
  isOrgAdmin: false,
  rank: 3,
  scopes: [
    PERMS.project.viewOwn.id,
    PERMS.project.create.id,
    PERMS.project.edit.id,
    PERMS.project.manageMembers.id,
    PERMS.task.all.id,
    PERMS.member.view.id,
  ],
};

const member: DefaultRoleDefinition = {
  title: 'Member',
  isOrgAdmin: false,
  rank: 4,
  scopes: [
    PERMS.project.viewOwn.id,
    PERMS.task.viewOwn.id,
    PERMS.task.create.id,
    PERMS.task.edit.id,
    PERMS.dashboard.viewOwn.id,
  ],
};

// Superadmin is deliberately not a role here — it is the `users.is_super_admin` column,
// checked before RBAC runs.
export const DEFAULT_ROLES: readonly DefaultRoleDefinition[] = [
  owner,
  admin,
  projectManager,
  member,
];
