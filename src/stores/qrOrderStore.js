import { create } from 'zustand';

export const useQROrderStore = create((set, get) => ({
  pendingOrders: [],
  pendingCount: 0,
  serverStatus: { running: false, ip: '', port: 3000 },
  newOrderAlert: null, // { order } - for notification toast

  fetchServerStatus: async () => {
    try {
      const status = await window.electronAPI.invoke('qr:getServerStatus');
      set({ serverStatus: status || { running: false } });
    } catch (e) {
      console.error('Failed to fetch QR server status:', e);
    }
  },

  fetchPendingOrders: async () => {
    try {
      const orders = await window.electronAPI.invoke('qr:getPendingOrders');
      set({
        pendingOrders: Array.isArray(orders) ? orders : [],
        pendingCount: Array.isArray(orders) ? orders.length : 0,
      });
    } catch (e) {
      console.error('Failed to fetch pending QR orders:', e);
    }
  },

  confirmOrder: async (id, userId) => {
    try {
      const result = await window.electronAPI.invoke('qr:confirmOrder', { id, userId });
      if (result.success) {
        // Refresh pending orders
        get().fetchPendingOrders();
      }
      return result;
    } catch (e) {
      console.error('Failed to confirm QR order:', e);
      return { success: false, error: e.message };
    }
  },

  rejectOrder: async (id) => {
    try {
      const result = await window.electronAPI.invoke('qr:rejectOrder', { id });
      if (result.success) {
        get().fetchPendingOrders();
      }
      return result;
    } catch (e) {
      console.error('Failed to reject QR order:', e);
      return { success: false, error: e.message };
    }
  },

  setNewOrderAlert: (order) => set({ newOrderAlert: order }),
  clearNewOrderAlert: () => set({ newOrderAlert: null }),

  // Called when real-time notification arrives from main process
  handleNewOrder: (order) => {
    set({ newOrderAlert: order });
    get().fetchPendingOrders();
  },
}));
