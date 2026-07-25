// Mirrors apps/api/src/common/types/jwt-payload.type.ts — the token is the contract.
export type JwtPayload = {
  sub: string;
  email: string;
  orgId?: string;
  membershipId?: string;
  scopes: string[];
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type TokenResponse = {
  accessToken: string;
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
