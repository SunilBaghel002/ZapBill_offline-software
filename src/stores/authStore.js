import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      sessionId: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login with username and password
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await window.electronAPI.invoke('auth:login', { 
            username, 
            password 
          });
          
          if (result.success) {
            set({
              user: result.user,
              sessionId: result.sessionId,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return { success: true };
          } else {
            set({ 
              isLoading: false, 
              error: result.error 
            });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Login failed. Please try again.' 
          });
          return { success: false, error: error.message };
        }
      },

      // Quick login with PIN
      loginWithPin: async (pin) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await window.electronAPI.invoke('auth:loginWithPin', { pin });
          
          if (result.success) {
            set({
              user: result.user,
              sessionId: result.sessionId,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return { success: true };
          } else {
            set({ 
              isLoading: false, 
              error: result.error 
            });
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'Login failed. Please try again.' 
          });
          return { success: false, error: error.message };
        }
      },

      // Logout
      logout: async () => {
        const { user } = get();
        
        try {
          await window.electronAPI.invoke('auth:logout', { 
            userId: user?.id 
          });
        } catch (error) {
          console.error('Logout error:', error);
        }
        
        set({
          user: null,
          sessionId: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Check if user has role
      hasRole: (role) => {
        const { user } = get();
        return user?.role === role;
      },

      // Check if user is admin
      isAdmin: () => {
        const { user } = get();
        return user?.role === 'admin';
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        sessionId: state.sessionId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
