import { FeatureDefinition, id } from '../types';

const viewMembers = {
  id: id('view-members'),
  feature: 'member' as const,
  label: 'View members',
  kind: 'view' as const,
};

const inviteMembers = {
  id: id('invite-members'),
  feature: 'member' as const,
  label: 'Invite members',
  kind: 'custom' as const,
};

const editMembers = {
  id: id('edit-members'),
  feature: 'member' as const,
  label: 'Edit member roles',
  kind: 'edit' as const,
};

const suspendMembers = {
  id: id('suspend-members'),
  feature: 'member' as const,
  label: 'Suspend members',
  kind: 'custom' as const,
};

const removeMembers = {
  id: id('remove-members'),
  feature: 'member' as const,
  label: 'Remove members',
  kind: 'delete' as const,
};

const allMember = {
  id: id('all-member'),
  feature: 'member' as const,
  label: 'All member permissions',
  kind: 'all' as const,
  grants: [viewMembers.id, inviteMembers.id, editMembers.id, suspendMembers.id, removeMembers.id],
};

export const memberFeature: FeatureDefinition = {
  key: 'member',
  title: 'Members',
  iconName: 'users',
  editorCategory: 'People',
  all: allMember,
  permissions: {
    [allMember.id]: allMember,
    [viewMembers.id]: viewMembers,
    [inviteMembers.id]: inviteMembers,
    [editMembers.id]: editMembers,
    [suspendMembers.id]: suspendMembers,
    [removeMembers.id]: removeMembers,
  },
};
