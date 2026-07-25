export const PROJECT_MEMBER_ROLES = ['LEAD', 'CONTRIBUTOR', 'VIEWER'] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];
