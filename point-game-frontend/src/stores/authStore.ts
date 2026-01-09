import {create} from 'zustand';
import {persist} from 'zustand/middleware';

import type {User} from '../types/user';

interface AuthState {
  user: User|null;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({user, isAuthenticated: true}),
      logout: () => set({user: null, isAuthenticated: false}),
    }),
    {
      name: 'auth-storage',
    }));