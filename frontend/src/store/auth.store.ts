import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../lib/api';

interface User {
  id:           string;
  email:        string;
  fullName:     string;
  role:         string;
  businessId:   string;
  businessName: string;
}

interface AuthState {
  user:    User | null;
  token:   string | null;
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => void;
  isAuth:  () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:  null,
      token: null,

      login: async (email, password) => {
        const { data } = await authApi.login(email, password);
        localStorage.setItem('token', data.access_token);
        set({ user: data.user, token: data.access_token });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
        window.location.href = '/login';
      },

      isAuth: () => !!get().token,
    }),
    { name: 'auth' },
  ),
);
