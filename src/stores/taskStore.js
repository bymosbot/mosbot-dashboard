import { create } from 'zustand';
import { api } from '../api/client';
import logger from '../utils/logger';

export const useTaskStore = create((set, get) => ({
  tasks: [],
  isLoading: false,
  isRefreshing: false, // Separate flag for background refresh
  error: null,
  searchQuery: '',
  lastFetchedAt: null, // Track when data was last fetched
  
  // Fetch all tasks
  fetchTasks: async (options = {}) => {
    const { silent = false } = options; // Silent mode for background refresh
    
    // Use isRefreshing for silent updates, isLoading for user-initiated
    if (silent) {
      set({ isRefreshing: true, error: null });
    } else {
      set({ isLoading: true, error: null });
    }
    
    try {
      const response = await api.get('/tasks');
      // API returns { data: [...], pagination: {...} }
      set({ 
        tasks: response.data.data || [], 
        isLoading: false,
        isRefreshing: false,
        lastFetchedAt: Date.now(),
        error: null,
      });
    } catch (error) {
      set({ 
        error: error.message, 
        isLoading: false,
        isRefreshing: false,
      });
      logger.error('Failed to fetch tasks', error);
    }
  },
  
  // Refresh tasks (alias for silent fetch)
  refreshTasks: async () => {
    await get().fetchTasks({ silent: true });
  },
  
  // Fetch a single task by ID or key (supports both UUID and TASK-1234 format)
  fetchTaskById: async (identifier) => {
    set({ isLoading: true, error: null });
    let errorAlreadyHandled = false;
    try {
      // Determine if identifier is a task key (TASK-1234) or UUID
      const isTaskKey = /^TASK-\d+$/i.test(identifier);
      const endpoint = isTaskKey ? `/tasks/key/${identifier}` : `/tasks/${identifier}`;
      
      let response;
      try {
        response = await api.get(endpoint);
      } catch (keyError) {
        // If task key endpoint fails (e.g., 404), fallback to UUID endpoint
        if (isTaskKey && (keyError.response?.status === 404 || keyError.response?.status === 400)) {
          logger.warn(`Task key endpoint failed for ${identifier}, falling back to UUID endpoint`, keyError);
          // Try UUID endpoint as fallback
          try {
            response = await api.get(`/tasks/${identifier}`);
          } catch (fallbackError) {
            // Both endpoints failed - set custom error message
            errorAlreadyHandled = true;
            set({ error: `Task not found: ${identifier}`, isLoading: false });
            logger.error('Failed to fetch task (both key and UUID endpoints failed)', fallbackError);
            throw fallbackError;
          }
        } else {
          // Re-throw if it's not a 404/400 or if we're already using UUID endpoint
          throw keyError;
        }
      }
      
      // API returns { data: {...} }
      const task = response.data.data;
      
      // Update the task in the store if it exists, otherwise add it
      set((state) => {
        const existingIndex = state.tasks.findIndex(t => t.id === task.id);
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
      // Only set error message if it wasn't already handled (e.g., both endpoints failed)
      if (!errorAlreadyHandled) {
        set({ error: error.message, isLoading: false });
      }
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
      
      // Refresh to get latest data after creation
      setTimeout(() => get().refreshTasks(), 500);
      
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
      
      // Refresh to get latest data after update
      setTimeout(() => get().refreshTasks(), 500);
      
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
      
      // Refresh to get latest data after deletion
      setTimeout(() => get().refreshTasks(), 500);
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
      
      // Re-throw 409 errors for dependency blocking
      if (error.response?.status === 409) {
        throw error;
      }
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
      const taskKey = task.task_number ? `task-${task.task_number}` : '';
      return title.includes(query) || description.includes(query) || taskKey.includes(query);
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
