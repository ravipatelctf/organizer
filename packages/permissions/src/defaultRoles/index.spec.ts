import { ALL_PERMISSION_IDS } from '../helpers/lookup';
import { PERMS } from '../registry';
import { DEFAULT_ROLES } from './index';

describe('DEFAULT_ROLES', () => {
  it('defines exactly the four seeded roles, ranked 1 through 4', () => {
    expect(DEFAULT_ROLES.map((r) => r.title)).toEqual([
      'Owner',
      'Admin',
      'Project Manager',
      'Member',
    ]);
    expect(DEFAULT_ROLES.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });

  it('Owner holds every permission in the registry', () => {
    const owner = DEFAULT_ROLES.find((r) => r.title === 'Owner')!;
    expect(new Set(owner.scopes)).toEqual(ALL_PERMISSION_IDS);
    expect(owner.isOrgAdmin).toBe(true);
  });

  it('Admin holds everything except delete-organization', () => {
    const admin = DEFAULT_ROLES.find((r) => r.title === 'Admin')!;
    expect(admin.scopes).not.toContain(PERMS.organization.delete.id);
    expect(admin.scopes.length).toBe(ALL_PERMISSION_IDS.size - 1);
    expect(admin.isOrgAdmin).toBe(true);
  });

  it('Project Manager and Member are not org admins', () => {
    const projectManager = DEFAULT_ROLES.find((r) => r.title === 'Project Manager')!;
    const member = DEFAULT_ROLES.find((r) => r.title === 'Member')!;
    expect(projectManager.isOrgAdmin).toBe(false);
    expect(member.isOrgAdmin).toBe(false);
  });
});
