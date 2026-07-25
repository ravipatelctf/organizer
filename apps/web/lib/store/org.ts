import { create } from 'zustand';

interface OrgState {
  currentOrgSlug: string | null;
  setCurrentOrgSlug: (slug: string | null) => void;
}

// Tracks which org slug the current access token was minted for, so the axios
// interceptor can tell a stale-token org mismatch apart from a real permission 403.
export const useOrgStore = create<OrgState>((set) => ({
  currentOrgSlug: null,
  setCurrentOrgSlug: (slug) => set({ currentOrgSlug: slug }),
}));
