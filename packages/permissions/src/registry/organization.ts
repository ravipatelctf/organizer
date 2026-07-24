import { FeatureDefinition, id } from '../types';

const viewOrganization = {
  id: id('view-organization'),
  feature: 'organization' as const,
  label: 'View organization',
  kind: 'view' as const,
};

const editOrganization = {
  id: id('edit-organization'),
  feature: 'organization' as const,
  label: 'Edit organization',
  kind: 'edit' as const,
};

const deleteOrganization = {
  id: id('delete-organization'),
  feature: 'organization' as const,
  label: 'Delete organization',
  kind: 'delete' as const,
};

const allOrganization = {
  id: id('all-organization'),
  feature: 'organization' as const,
  label: 'All organization permissions',
  kind: 'all' as const,
  grants: [viewOrganization.id, editOrganization.id, deleteOrganization.id],
};

export const organizationFeature: FeatureDefinition = {
  key: 'organization',
  title: 'Organization',
  iconName: 'building-2',
  editorCategory: 'Admin',
  all: allOrganization,
  permissions: {
    [allOrganization.id]: allOrganization,
    [viewOrganization.id]: viewOrganization,
    [editOrganization.id]: editOrganization,
    [deleteOrganization.id]: deleteOrganization,
  },
};
