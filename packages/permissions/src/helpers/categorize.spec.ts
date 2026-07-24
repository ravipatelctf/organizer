import { PERMS } from '../registry';
import { applyDependencies, featuresByEditorCategory } from './categorize';

describe('featuresByEditorCategory', () => {
  it('buckets every feature into one of the four editor categories', () => {
    const byCategory = featuresByEditorCategory();
    const total = Object.values(byCategory).reduce((sum, features) => sum + features.length, 0);
    expect(total).toBe(8);
    expect(byCategory.Delivery.map((f) => f.key)).toEqual(
      expect.arrayContaining(['project', 'task']),
    );
  });
});

describe('applyDependencies', () => {
  it('adds the implied view permission when a create permission is selected', () => {
    const scopes = new Set<string>([PERMS.project.create.id]);
    applyDependencies(PERMS.project.create.id, scopes);
    expect(scopes.has(PERMS.project.view.id) || scopes.has(PERMS.project.viewOwn.id)).toBe(true);
  });

  it('does not duplicate an already-held alternative from impliesOneOf', () => {
    const scopes = new Set<string>([PERMS.project.create.id, PERMS.project.viewOwn.id]);
    applyDependencies(PERMS.project.create.id, scopes);
    expect(scopes.has(PERMS.project.view.id)).toBe(false);
    expect(scopes.has(PERMS.project.viewOwn.id)).toBe(true);
  });

  it('is a no-op for a permission with no declared dependency', () => {
    const scopes = new Set<string>([PERMS.project.view.id]);
    applyDependencies(PERMS.project.view.id, scopes);
    expect(scopes.size).toBe(1);
  });
});
