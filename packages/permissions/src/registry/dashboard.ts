import { FeatureDefinition, id } from '../types';

const viewDashboard = {
  id: id('view-dashboard'),
  feature: 'dashboard' as const,
  label: 'View dashboard',
  kind: 'view' as const,
  ownership: 'all' as const,
  ownershipFor: 'dashboard',
};

const viewOwnDashboard = {
  id: id('view-own-dashboard'),
  feature: 'dashboard' as const,
  label: 'View own dashboard',
  kind: 'view-own' as const,
  ownership: 'own' as const,
  ownershipFor: 'dashboard',
};

const allDashboard = {
  id: id('all-dashboard'),
  feature: 'dashboard' as const,
  label: 'All dashboard permissions',
  kind: 'all' as const,
  grants: [viewDashboard.id, viewOwnDashboard.id],
};

export const dashboardFeature: FeatureDefinition = {
  key: 'dashboard',
  title: 'Dashboard',
  iconName: 'layout-dashboard',
  editorCategory: 'Workspace',
  all: allDashboard,
  permissions: {
    [allDashboard.id]: allDashboard,
    [viewDashboard.id]: viewDashboard,
    [viewOwnDashboard.id]: viewOwnDashboard,
  },
};
