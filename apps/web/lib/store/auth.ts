import { jwtDecode } from 'jwt-decode';
import { create } from 'zustand';

import type { AuthUser, JwtPayload } from '@/lib/types/auth';

interface AuthState {
  accessToken: string | null;
  claims: JwtPayload | null;
  user: AuthUser | null;
  isBootstrapping: boolean;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser | null) => void;
  setBootstrapping: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  claims: null,
  user: null,
  isBootstrapping: true,
  setAccessToken: (token) => set({ accessToken: token, claims: jwtDecode<JwtPayload>(token) }),
  setUser: (user) => set({ user }),
  setBootstrapping: (value) => set({ isBootstrapping: value }),
  clear: () => set({ accessToken: null, claims: null, user: null }),
}));
