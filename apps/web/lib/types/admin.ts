// Mirrors apps/api/src/admin/admin.service.ts response shapes — the wire format is the contract.

import type { Project } from '@/lib/types/org';

export type AdminStats = {
  organizations: number;
  projects: number;
  users: number;
  tasks: number;
};

export type AdminProject = Project & {
  organization: { id: string; name: string; slug: string };
};

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
  updatedAt: string;
};
