import { create } from 'zustand';
import { api } from '../api/client';
import logger from '../utils/logger';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  
  // Fetch all tasks
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/tasks');
      // API returns { data: [...], pagination: {...} }
      set({ tasks: response.data.data || [], isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
      logger.error('Failed to fetch tasks', error);
    }
  },
  
  // Fetch a single task by ID
  fetchTaskById: async (taskId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/tasks/${taskId}`);
      // API returns { data: {...} }
      const task = response.data.data;
      
      // Update the task in the store if it exists, otherwise add it
      set((state) => {
        const existingIndex = state.tasks.findIndex(t => t.id === taskId);
        if (existingIndex >= 0) {
          const updatedTasks = [...state.tasks];
          updatedTasks[existingIndex] = task;
          return { tasks: updatedTasks, isLoading: false };
        } else {
          return { tasks: [...state.tasks, task], isLoading: false };
        }
      });
      
      return task;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      logger.error('Failed to fetch task', error);
      throw error;
    }
  },
  
  // Create a new task
  createTask: async (taskData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/tasks', taskData);
      // API returns { data: {...} }
      const newTask = response.data.data;
      set((state) => ({
        tasks: [...state.tasks, newTask],
        isLoading: false,
      }));
      return newTask;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      logger.error('Failed to create task', error);
      throw error;
    }
  },
  
  // Update a task
  updateTask: async (taskId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.patch(`/tasks/${taskId}`, updates);
      // API returns { data: {...} }
      const updatedTask = response.data.data;
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId ? updatedTask : task
        ),
        isLoading: false,
      }));
      return updatedTask;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      logger.error('Failed to update task', error);
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
      logger.error('Failed to delete task', error);
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
      logger.error('Failed to move task', error);
    }
  },
  
  // Get tasks by status
  getTasksByStatus: (status) => {
    return get().tasks.filter((task) => task.status === status);
  },
  
  // Set search query
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
  
  // Filter tasks by search query
  getFilteredTasks: () => {
    const { tasks, searchQuery } = get();
    if (!searchQuery.trim()) {
      return tasks;
    }
    const query = searchQuery.toLowerCase();
    return tasks.filter((task) => {
      const title = (task.title || '').toLowerCase();
      const description = (task.description || '').toLowerCase();
      return title.includes(query) || description.includes(query);
    });
  },
  
  // Fetch task history
  fetchTaskHistory: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}/history`);
      // API returns { data: [...], pagination: {...} }
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to fetch task history', error);
      throw error;
    }
  },
}));
