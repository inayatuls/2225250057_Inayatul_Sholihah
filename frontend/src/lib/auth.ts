import { create } from 'zustand';
import type { User } from './types';

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  clear: () => void;
  markReady: () => void;
}

/** Access token disimpan di memori saja; refresh token ada di cookie httpOnly. */
export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  ready: false,
  setSession: (token, user) => set({ token, user }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, token: null }),
  markReady: () => set({ ready: true }),
}));

export function homePathFor(user: User | null): string {
  if (!user) return '/masuk';
  if (user.must_change_password) return '/ganti-sandi';
  return user.role === 'student' ? '/beranda' : '/guru';
}
