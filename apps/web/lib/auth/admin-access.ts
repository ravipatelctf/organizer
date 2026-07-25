export function canAccessAdmin(claims: { isSuperAdmin?: boolean } | null | undefined): boolean {
  return claims?.isSuperAdmin === true;
}
