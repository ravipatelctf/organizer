export type JwtPayload = {
  sub: string;
  email: string;
  orgId?: string;
  membershipId?: string;
  scopes: string[];
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
};
