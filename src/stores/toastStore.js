import { create } from 'zustand';

export const useToastStore = create((set) => ({
  toasts: [],
  
  showToast: (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, show: true }],
    }));
    
    // Auto-hide after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.map((toast) =>
          toast.id === id ? { ...toast, show: false } : toast
        ),
      }));
      
      // Remove from array after animation completes
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      }, 300);
    }, duration);
  },
  
  hideToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, show: false } : toast
      ),
    }));
    
    // Remove from array after animation completes
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== id),
      }));
    }, 300);
  },
}));
