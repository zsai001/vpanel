import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePermissionsStore } from './permissions';

interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  role: string;
  avatar?: string;
  mfa_enabled: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (username: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  checkAuth: () => Promise<boolean>;
}

// Prevent concurrent refresh attempts
let refreshPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username: string, password: string, mfaCode?: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, mfa_code: mfaCode }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || data.message || 'Login failed');
          }

          // Handle MFA required case (HTTP 200 but success: false)
          if (data.mfa_required) {
            set({ isLoading: false });
            throw new Error('MFA_REQUIRED');
          }

          // Check for success flag
          if (!data.success) {
            throw new Error(data.message || 'Login failed');
          }

          // Ensure user data exists
          if (!data.user) {
            throw new Error('Invalid response: missing user data');
          }

          set({
            user: data.user,
            token: data.token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        // Call logout endpoint
        const token = get().token;
        if (token) {
          fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }

        // Clear permissions
        usePermissionsStore.getState().clearPermissions();

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAuth: async () => {
        // If a refresh is already in progress, wait for it
        if (refreshPromise) {
          return refreshPromise;
        }

        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          get().logout();
          return;
        }

        // Create the refresh promise
        refreshPromise = (async () => {
          try {
            const response = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: currentRefreshToken }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error('Token refresh failed');
            }

            if (!data.success) {
              throw new Error('Token refresh failed');
            }

            set({
              token: data.token,
              refreshToken: data.refresh_token,
            });
          } catch {
            get().logout();
          } finally {
            refreshPromise = null;
          }
        })();

        return refreshPromise;
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          return false;
        }

        try {
          const response = await fetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) {
            if (response.status === 401) {
              // Try to refresh
              await get().refreshAuth();
              return get().isAuthenticated;
            }
            return false;
          }

          const data = await response.json();
          if (!data.success || !data.data) {
            return false;
          }
          set({ user: data.data, isAuthenticated: true });
          return true;
        } catch {
          return false;
        }
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'vpanel-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
