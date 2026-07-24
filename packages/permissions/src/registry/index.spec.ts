import { FEATURES } from './index';

describe('registry shape', () => {
  it('gives every feature an all-* superset entry', () => {
    for (const feature of Object.values(FEATURES)) {
      expect(feature.all.kind).toBe('all');
      expect(feature.all.id.startsWith('all-')).toBe(true);
      expect(feature.permissions[feature.all.id]).toBe(feature.all);
    }
  });

  it('resolves every id listed in a grants array to a real entry', () => {
    const allIds = new Set(
      Object.values(FEATURES).flatMap((feature) =>
        Object.values(feature.permissions).map((p) => p.id),
      ),
    );

    for (const feature of Object.values(FEATURES)) {
      for (const grantedId of feature.all.grants ?? []) {
        expect(allIds.has(grantedId)).toBe(true);
      }
    }
  });

  it('has globally unique ids', () => {
    const allIds = Object.values(FEATURES).flatMap((feature) =>
      Object.values(feature.permissions).map((p) => p.id),
    );
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('gives project and task an ownership: all | own pair', () => {
    for (const key of ['project', 'task'] as const) {
      const entries = Object.values(FEATURES[key].permissions);
      const allEntry = entries.find((entry) => entry.ownership === 'all');
      const ownEntry = entries.find((entry) => entry.ownership === 'own');
      expect(allEntry?.ownershipFor).toBe(key);
      expect(ownEntry?.ownershipFor).toBe(key);
    }
  });
});
