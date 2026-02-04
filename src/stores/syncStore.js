import { create } from 'zustand';

export const useSyncStore = create((set, get) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncTime: null,
  cloudConfigured: false,

  // Update network status
  setOnline: (online) => set({ isOnline: online }),

  // Update sync status
  setSyncing: (syncing) => set({ isSyncing: syncing }),

  // Update pending count
  setPendingCount: (count) => set({ pendingCount: count }),

  // Update last sync time
  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  // Fetch current sync status
  fetchStatus: async () => {
    try {
      const status = await window.electronAPI.invoke('sync:status');
      set({
        isOnline: status.online,
        isSyncing: status.syncing,
        pendingCount: status.pendingCount,
        cloudConfigured: status.cloudConfigured,
      });
      return status;
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
      return null;
    }
  },

  // Force sync
  forceSync: async () => {
    try {
      const result = await window.electronAPI.invoke('sync:forceSync');
      if (result.success) {
        set({ lastSyncTime: new Date().toISOString() });
        await get().fetchStatus();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Initialize listeners
  initializeListeners: () => {
    // Listen for sync status changes
    window.electronAPI.on('sync:statusChanged', (data) => {
      set({ isSyncing: data.syncing });
      if (!data.syncing) {
        set({ lastSyncTime: new Date().toISOString() });
        get().fetchStatus();
      }
    });

    // Listen for network status changes
    window.electronAPI.on('network:statusChanged', (data) => {
      set({ isOnline: data.online });
    });

    // Initial fetch
    get().fetchStatus();
  },
}));
