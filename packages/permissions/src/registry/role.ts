import { FeatureDefinition, id } from '../types';

const viewRoles = {
  id: id('view-roles'),
  feature: 'role' as const,
  label: 'View roles',
  kind: 'view' as const,
};

const createRoles = {
  id: id('create-roles'),
  feature: 'role' as const,
  label: 'Create roles',
  kind: 'create' as const,
};

const editRoles = {
  id: id('edit-roles'),
  feature: 'role' as const,
  label: 'Edit roles',
  kind: 'edit' as const,
};

const deleteRoles = {
  id: id('delete-roles'),
  feature: 'role' as const,
  label: 'Delete roles',
  kind: 'delete' as const,
};

const allRole = {
  id: id('all-role'),
  feature: 'role' as const,
  label: 'All role permissions',
  kind: 'all' as const,
  grants: [viewRoles.id, createRoles.id, editRoles.id, deleteRoles.id],
};

export const roleFeature: FeatureDefinition = {
  key: 'role',
  title: 'Roles',
  iconName: 'shield',
  editorCategory: 'Admin',
  all: allRole,
  permissions: {
    [allRole.id]: allRole,
    [viewRoles.id]: viewRoles,
    [createRoles.id]: createRoles,
    [editRoles.id]: editRoles,
    [deleteRoles.id]: deleteRoles,
  },
};
