import { canAccessAdmin } from './admin-access';

describe('canAccessAdmin', () => {
  it('allows a superadmin', () => {
    expect(canAccessAdmin({ isSuperAdmin: true })).toBe(true);
  });

  it('refuses a non-superadmin', () => {
    expect(canAccessAdmin({ isSuperAdmin: false })).toBe(false);
  });

  it('refuses claims with no isSuperAdmin field', () => {
    expect(canAccessAdmin({})).toBe(false);
  });

  it('refuses a missing session', () => {
    expect(canAccessAdmin(null)).toBe(false);
    expect(canAccessAdmin(undefined)).toBe(false);
  });
});
