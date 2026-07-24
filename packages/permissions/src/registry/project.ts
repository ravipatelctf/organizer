import { FeatureDefinition, id } from '../types';

const viewProjects = {
  id: id('view-projects'),
  feature: 'project' as const,
  label: 'View all projects',
  kind: 'view' as const,
  ownership: 'all' as const,
  ownershipFor: 'project',
};

const viewOwnProjects = {
  id: id('view-own-projects'),
  feature: 'project' as const,
  label: 'View own projects',
  kind: 'view-own' as const,
  ownership: 'own' as const,
  ownershipFor: 'project',
};

const createProjects = {
  id: id('create-projects'),
  feature: 'project' as const,
  label: 'Create projects',
  kind: 'create' as const,
};

const editProjects = {
  id: id('edit-projects'),
  feature: 'project' as const,
  label: 'Edit projects',
  kind: 'edit' as const,
};

const archiveProjects = {
  id: id('archive-projects'),
  feature: 'project' as const,
  label: 'Archive projects',
  kind: 'custom' as const,
};

const deleteProjects = {
  id: id('delete-projects'),
  feature: 'project' as const,
  label: 'Delete projects',
  kind: 'delete' as const,
};

const manageProjectMembers = {
  id: id('manage-project-members'),
  feature: 'project' as const,
  label: 'Manage project members',
  kind: 'custom' as const,
};

const allProject = {
  id: id('all-project'),
  feature: 'project' as const,
  label: 'All project permissions',
  kind: 'all' as const,
  grants: [
    viewProjects.id,
    viewOwnProjects.id,
    createProjects.id,
    editProjects.id,
    archiveProjects.id,
    deleteProjects.id,
    manageProjectMembers.id,
  ],
};

export const projectFeature: FeatureDefinition = {
  key: 'project',
  title: 'Projects',
  iconName: 'folder-kanban',
  editorCategory: 'Delivery',
  all: allProject,
  permissions: {
    [allProject.id]: allProject,
    [viewProjects.id]: viewProjects,
    [viewOwnProjects.id]: viewOwnProjects,
    [createProjects.id]: createProjects,
    [editProjects.id]: editProjects,
    [archiveProjects.id]: archiveProjects,
    [deleteProjects.id]: deleteProjects,
    [manageProjectMembers.id]: manageProjectMembers,
  },
};
