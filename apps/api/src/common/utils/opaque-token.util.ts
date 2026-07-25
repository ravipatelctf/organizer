import { createHash } from 'node:crypto';

// A fast, deterministic hash — unlike bcrypt, this needs to support an exact-match lookup
// by a unique column, not a slow brute-force-resistant comparison. The tokens being hashed
// are already high-entropy random bytes, so speed isn't a liability here.
export function hashOpaqueToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
