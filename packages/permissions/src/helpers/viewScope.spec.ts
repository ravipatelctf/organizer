import { PERMS } from '../registry';
import { getViewScope } from './viewScope';

describe('getViewScope', () => {
  it('short-circuits to all for an admin regardless of scopes', () => {
    expect(getViewScope([], 'project', { isAdmin: true })).toBe('all');
  });

  it('returns all when holding the view-all permission', () => {
    expect(getViewScope([PERMS.project.view.id], 'project')).toBe('all');
  });

  it('returns all when holding the feature superset (superset expansion)', () => {
    expect(getViewScope([PERMS.project.all.id], 'project')).toBe('all');
  });

  it('returns own when holding only the view-own permission', () => {
    expect(getViewScope([PERMS.project.viewOwn.id], 'project')).toBe('own');
  });

  it('returns none when holding neither', () => {
    expect(getViewScope([PERMS.task.view.id], 'project')).toBe('none');
  });

  it('returns none for an entity with no registered ownership pair', () => {
    expect(getViewScope([], 'member')).toBe('none');
  });

  it('resolves the task pair independently of the project pair', () => {
    expect(getViewScope([PERMS.task.viewOwn.id], 'task')).toBe('own');
    expect(getViewScope([PERMS.task.viewOwn.id], 'project')).toBe('none');
  });
});
