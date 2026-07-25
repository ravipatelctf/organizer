// Mirrors the Prisma row shapes returned by apps/api's projects/tasks/members/roles
// controllers — the wire format is the contract.

export type ProjectStatus = 'ACTIVE' | 'ARCHIVED' | 'COMPLETED';

export type Project = {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  taskSequence: number;
  startDate: string | null;
  dueDate: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectMemberRole = 'LEAD' | 'CONTRIBUTOR' | 'VIEWER';

export type MemberUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
};

export type ProjectMember = {
  id: string;
  organizationId: string;
  projectId: string;
  orgMembershipId: string;
  role: ProjectMemberRole;
  addedById: string | null;
  createdAt: string;
  updatedAt: string;
  membership?: { user: MemberUser };
};

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type Task = {
  id: string;
  organizationId: string;
  projectId: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
  createdById: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED';

export type MembershipRole = {
  id: string;
  orgMembershipId: string;
  roleId: string;
  assignedById: string | null;
  createdAt: string;
  role: Role;
};

export type OrgMembership = {
  id: string;
  organizationId: string;
  userId: string;
  status: MembershipStatus;
  joinedAt: string | null;
  lastActiveAt: string | null;
  invitedById: string | null;
  invitationExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: MemberUser;
  roles: MembershipRole[];
};

export type Invitation = OrgMembership & { token?: string };

export type RolePermission = {
  roleId: string;
  permissionId: string;
  createdAt: string;
};

export type Role = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  rank: number;
  isOrgAdmin: boolean;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
  permissions?: RolePermission[];
};
