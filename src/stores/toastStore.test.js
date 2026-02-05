import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastStore } from './toastStore';

describe('toastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useToastStore.setState({ toasts: [] });
  });

  it('should add a toast when showToast is called', () => {
    const { showToast } = useToastStore.getState();
    
    showToast('Test message', 'success');
    
    const currentToasts = useToastStore.getState().toasts;
    expect(currentToasts).toHaveLength(1);
    expect(currentToasts[0].message).toBe('Test message');
    expect(currentToasts[0].type).toBe('success');
    expect(currentToasts[0].show).toBe(true);
  });

  it('should support different toast types', () => {
    const { showToast } = useToastStore.getState();
    
    showToast('Success message', 'success');
    showToast('Error message', 'error');
    showToast('Info message', 'info');
    
    const currentToasts = useToastStore.getState().toasts;
    expect(currentToasts).toHaveLength(3);
    expect(currentToasts[0].type).toBe('success');
    expect(currentToasts[1].type).toBe('error');
    expect(currentToasts[2].type).toBe('info');
  });

  it('should auto-hide toast after duration', () => {
    const { showToast } = useToastStore.getState();
    
    showToast('Test message', 'success', 1000);
    
    let currentToasts = useToastStore.getState().toasts;
    expect(currentToasts[0].show).toBe(true);
    
    // Fast-forward time by 1000ms
    vi.advanceTimersByTime(1000);
    
    currentToasts = useToastStore.getState().toasts;
    expect(currentToasts[0].show).toBe(false);
  });

  it('should remove toast from array after animation completes', () => {
    const { showToast } = useToastStore.getState();
    
    showToast('Test message', 'success', 1000);
    
    expect(useToastStore.getState().toasts).toHaveLength(1);
    
    // Fast-forward time by 1000ms (duration) + 300ms (animation)
    vi.advanceTimersByTime(1300);
    
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('should hide toast manually when hideToast is called', () => {
    const { showToast, hideToast } = useToastStore.getState();
    
    showToast('Test message', 'success');
    
    const toastId = useToastStore.getState().toasts[0].id;
    hideToast(toastId);
    
    const currentToasts = useToastStore.getState().toasts;
    expect(currentToasts[0].show).toBe(false);
  });

  it('should handle multiple toasts', () => {
    const { showToast } = useToastStore.getState();
    
    showToast('Message 1', 'success');
    showToast('Message 2', 'error');
    showToast('Message 3', 'info');
    
    const currentToasts = useToastStore.getState().toasts;
    expect(currentToasts).toHaveLength(3);
    expect(currentToasts[0].message).toBe('Message 1');
    expect(currentToasts[1].message).toBe('Message 2');
    expect(currentToasts[2].message).toBe('Message 3');
  });
});
