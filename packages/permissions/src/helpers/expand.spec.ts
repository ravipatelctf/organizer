import { PERMS } from '../registry';
import { expandScopes, userHasAnyPermission, userHasPermission } from './expand';

describe('expandScopes / userHasPermission', () => {
  it('expands a superset scope to every permission it grants', () => {
    const expanded = expandScopes([PERMS.project.all.id]);
    expect(expanded.has(PERMS.project.view.id)).toBe(true);
    expect(expanded.has(PERMS.project.create.id)).toBe(true);
    expect(expanded.has(PERMS.project.manageMembers.id)).toBe(true);
  });

  it('does not leak a superset from an unrelated feature', () => {
    const expanded = expandScopes([PERMS.task.all.id]);
    expect(expanded.has(PERMS.project.view.id)).toBe(false);
  });

  it('userHasPermission passes when holding the superset', () => {
    expect(userHasPermission([PERMS.project.all.id], PERMS.project.create)).toBe(true);
  });

  it('userHasPermission fails without the leaf permission or its superset', () => {
    expect(userHasPermission([PERMS.task.all.id], PERMS.project.create)).toBe(false);
  });

  it('falls back to literal matching for unknown ids', () => {
    expect(userHasPermission(['some-unregistered-scope'], 'some-unregistered-scope')).toBe(true);
    expect(userHasPermission(['some-unregistered-scope'], 'another-scope')).toBe(false);
  });

  it('userHasAnyPermission is OR semantics', () => {
    expect(
      userHasAnyPermission([PERMS.project.viewOwn.id], [PERMS.project.view, PERMS.project.viewOwn]),
    ).toBe(true);
    expect(
      userHasAnyPermission([PERMS.task.viewOwn.id], [PERMS.project.view, PERMS.project.viewOwn]),
    ).toBe(false);
  });
});
