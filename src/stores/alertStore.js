import { create } from 'zustand';

export const useAlertStore = create((set) => ({
  isOpen: false,
  message: '',
  type: 'info',
  onConfirm: null,
  
  showAlert: (message, type = 'info', onConfirm = null) => {
    set({
      isOpen: true,
      message,
      type,
      onConfirm
    });
  },
  
  hideAlert: () => {
    set({
      isOpen: false,
      message: '',
      type: 'info',
      onConfirm: null
    });
  }
}));
