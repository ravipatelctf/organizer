import { PERMS } from '../registry';
import { ALL_PERMISSION_IDS, ID_TO_ENTRY, isValidPermissionId } from './lookup';

describe('lookup', () => {
  it('recognizes every registered id as valid', () => {
    expect(isValidPermissionId(PERMS.project.create.id)).toBe(true);
  });

  it('rejects an unregistered id', () => {
    expect(isValidPermissionId('not-a-real-permission')).toBe(false);
  });

  it('maps every id back to its entry', () => {
    expect(ID_TO_ENTRY.get(PERMS.project.create.id)).toBe(PERMS.project.create);
  });

  it('has a flat set matching the map size', () => {
    expect(ALL_PERMISSION_IDS.size).toBe(ID_TO_ENTRY.size);
  });
});
