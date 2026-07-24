import { FeatureDefinition, id } from '../types';

const viewAuditLogs = {
  id: id('view-audit-logs'),
  feature: 'audit' as const,
  label: 'View audit logs',
  kind: 'view' as const,
};

const allAudit = {
  id: id('all-audit'),
  feature: 'audit' as const,
  label: 'All audit permissions',
  kind: 'all' as const,
  grants: [viewAuditLogs.id],
};

export const auditFeature: FeatureDefinition = {
  key: 'audit',
  title: 'Audit log',
  iconName: 'scroll-text',
  editorCategory: 'Admin',
  all: allAudit,
  permissions: {
    [allAudit.id]: allAudit,
    [viewAuditLogs.id]: viewAuditLogs,
  },
};
