import { create } from 'zustand';
import { api } from '../api/client';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  // Fetch all tasks
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/tasks');
      set({ tasks: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to fetch tasks:', error);
    }
  },
  
  // Create a new task
  createTask: async (taskData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/tasks', taskData);
      set((state) => ({
        tasks: [...state.tasks, response.data],
        isLoading: false,
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to create task:', error);
      throw error;
    }
  },
  
  // Update a task
  updateTask: async (taskId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/tasks/${taskId}`, updates);
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? response.data : task
        ),
        isLoading: false,
      }));
      return response.data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to update task:', error);
      throw error;
    }
  },
  
  // Delete a task
  deleteTask: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/tasks/${taskId}`);
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== taskId),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoading: false });
      console.error('Failed to delete task:', error);
      throw error;
    }
  },
  
  // Move task to different column (update status)
  moveTask: async (taskId, newStatus) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    
    // Optimistic update
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      ),
    }));
    
    try {
      await api.patch(`/tasks/${taskId}`, { status: newStatus });
    } catch (error) {
      // Revert on error
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, status: task.status } : t
        ),
        error: error.message,
      }));
      console.error('Failed to move task:', error);
    }
  },
  
  // Get tasks by status
  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },
}));
