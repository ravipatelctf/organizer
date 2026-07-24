import { FeatureDefinition, id } from '../types';

const viewInvitations = {
  id: id('view-invitations'),
  feature: 'invitation' as const,
  label: 'View invitations',
  kind: 'view' as const,
};

const revokeInvitations = {
  id: id('revoke-invitations'),
  feature: 'invitation' as const,
  label: 'Revoke invitations',
  kind: 'custom' as const,
};

const allInvitation = {
  id: id('all-invitation'),
  feature: 'invitation' as const,
  label: 'All invitation permissions',
  kind: 'all' as const,
  grants: [viewInvitations.id, revokeInvitations.id],
};

export const invitationFeature: FeatureDefinition = {
  key: 'invitation',
  title: 'Invitations',
  iconName: 'mail',
  editorCategory: 'People',
  all: allInvitation,
  permissions: {
    [allInvitation.id]: allInvitation,
    [viewInvitations.id]: viewInvitations,
    [revokeInvitations.id]: revokeInvitations,
  },
};
