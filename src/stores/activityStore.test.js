import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActivityStore } from './activityStore';
import { api } from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('activityStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useActivityStore.setState({
      logs: [],
      isLoading: false,
      isLoadingMore: false,
      error: null,
      hasMore: true,
      currentOffset: 0,
      pageSize: 50,
    });
  });

  describe('fetchActivity', () => {
    it('successfully fetches activity logs with default parameters', async () => {
      const mockLogs = [
        { id: 1, action: 'created', task_id: 1, timestamp: '2024-01-01T00:00:00Z' },
        { id: 2, action: 'updated', task_id: 1, timestamp: '2024-01-02T00:00:00Z' },
      ];

      api.get.mockResolvedValue({
        data: {
          data: mockLogs,
        },
      });

      const result = await useActivityStore.getState().fetchActivity();

      expect(api.get).toHaveBeenCalledWith('/activity', { params: { limit: 50 } });
      expect(result).toEqual(mockLogs);
      expect(useActivityStore.getState().logs).toEqual(mockLogs);
      expect(useActivityStore.getState().isLoading).toBe(false);
      expect(useActivityStore.getState().error).toBe(null);
    });

    it('successfully fetches activity logs with custom parameters', async () => {
      const mockLogs = [{ id: 1, action: 'created', task_id: 1 }];

      api.get.mockResolvedValue({
        data: {
          data: mockLogs,
        },
      });

      const params = {
        limit: 50,
        offset: 10,
        category: 'task',
        taskId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      await useActivityStore.getState().fetchActivity(params);

      expect(api.get).toHaveBeenCalledWith('/activity', {
        params: {
          limit: 50,
          offset: 10,
          category: 'task',
          task_id: 1,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      });
      expect(useActivityStore.getState().logs).toEqual(mockLogs);
    });

    it('sets loading state during fetch', async () => {
      api.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: [] }
        }), 100))
      );

      const fetchPromise = useActivityStore.getState().fetchActivity();

      expect(useActivityStore.getState().isLoading).toBe(true);

      await fetchPromise;
      expect(useActivityStore.getState().isLoading).toBe(false);
    });

    it('handles API errors correctly', async () => {
      const errorMessage = 'Failed to fetch activity logs';
      api.get.mockRejectedValue(new Error(errorMessage));

      await expect(useActivityStore.getState().fetchActivity()).rejects.toThrow(errorMessage);
      expect(useActivityStore.getState().isLoading).toBe(false);
      expect(useActivityStore.getState().error).toBe(errorMessage);
    });

    it('handles empty response data', async () => {
      api.get.mockResolvedValue({
        data: {
          data: null,
        },
      });

      const result = await useActivityStore.getState().fetchActivity();

      expect(result).toEqual([]);
      expect(useActivityStore.getState().logs).toEqual([]);
    });
  });

  describe('fetchTaskActivity', () => {
    it('successfully fetches activity logs for a specific task', async () => {
      const mockLogs = [
        { id: 1, action: 'created', task_id: 1 },
        { id: 2, action: 'updated', task_id: 1 },
      ];

      api.get.mockResolvedValue({
        data: {
          data: mockLogs,
        },
      });

      const result = await useActivityStore.getState().fetchTaskActivity(1);

      expect(api.get).toHaveBeenCalledWith('/tasks/1/activity', {
        params: { limit: 100, offset: 0 },
      });
      expect(result).toEqual(mockLogs);
    });

    it('successfully fetches task activity with custom limit and offset', async () => {
      const mockLogs = [{ id: 1, action: 'created', task_id: 1 }];

      api.get.mockResolvedValue({
        data: {
          data: mockLogs,
        },
      });

      const result = await useActivityStore.getState().fetchTaskActivity(1, {
        limit: 50,
        offset: 10,
      });

      expect(api.get).toHaveBeenCalledWith('/tasks/1/activity', {
        params: { limit: 50, offset: 10 },
      });
      expect(result).toEqual(mockLogs);
    });

    it('handles API errors correctly', async () => {
      const errorMessage = 'Failed to fetch task activity logs';
      api.get.mockRejectedValue(new Error(errorMessage));

      await expect(
        useActivityStore.getState().fetchTaskActivity(1)
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('createActivity', () => {
    it('successfully creates a new activity log entry', async () => {
      const newActivity = {
        action: 'created',
        task_id: 1,
        description: 'Task created',
      };

      const mockResponse = {
        id: 1,
        ...newActivity,
        timestamp: '2024-01-01T00:00:00Z',
      };

      api.post.mockResolvedValue({
        data: {
          data: mockResponse,
        },
      });

      const result = await useActivityStore.getState().createActivity(newActivity);

      expect(api.post).toHaveBeenCalledWith('/activity', newActivity);
      expect(result).toEqual(mockResponse);
      expect(useActivityStore.getState().logs).toContain(mockResponse);
      expect(useActivityStore.getState().logs[0]).toEqual(mockResponse); // Should be prepended
      expect(useActivityStore.getState().isLoading).toBe(false);
    });

    it('sets loading state during creation', async () => {
      const mockResponse = {
        id: 1,
        action: 'created',
        task_id: 1,
      };

      api.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: mockResponse }
        }), 100))
      );

      const createPromise = useActivityStore.getState().createActivity({
        action: 'created',
        task_id: 1,
      });

      expect(useActivityStore.getState().isLoading).toBe(true);

      await createPromise;
      expect(useActivityStore.getState().isLoading).toBe(false);
    });

    it('prepends new activity to existing logs', async () => {
      const existingLogs = [
        { id: 1, action: 'created', task_id: 1 },
        { id: 2, action: 'updated', task_id: 1 },
      ];

      useActivityStore.setState({ logs: existingLogs });

      const newActivity = {
        id: 3,
        action: 'deleted',
        task_id: 1,
      };

      api.post.mockResolvedValue({
        data: {
          data: newActivity,
        },
      });

      await useActivityStore.getState().createActivity(newActivity);

      expect(useActivityStore.getState().logs).toHaveLength(3);
      expect(useActivityStore.getState().logs[0]).toEqual(newActivity);
      expect(useActivityStore.getState().logs.slice(1)).toEqual(existingLogs);
    });

    it('handles API errors correctly', async () => {
      const errorMessage = 'Failed to create activity log';
      api.post.mockRejectedValue(new Error(errorMessage));

      await expect(
        useActivityStore.getState().createActivity({ action: 'created', task_id: 1 })
      ).rejects.toThrow(errorMessage);
      expect(useActivityStore.getState().isLoading).toBe(false);
      expect(useActivityStore.getState().error).toBe(errorMessage);
    });
  });

  describe('loadMoreActivity', () => {
    it('successfully loads more activity logs and appends to existing logs', async () => {
      const existingLogs = [
        { id: 1, action: 'created', task_id: 1, timestamp: '2024-01-01T00:00:00Z' },
        { id: 2, action: 'updated', task_id: 1, timestamp: '2024-01-02T00:00:00Z' },
      ];

      const newLogs = [
        { id: 3, action: 'deleted', task_id: 2, timestamp: '2024-01-03T00:00:00Z' },
        { id: 4, action: 'created', task_id: 3, timestamp: '2024-01-04T00:00:00Z' },
      ];

      useActivityStore.setState({
        logs: existingLogs,
        currentOffset: 0,
        pageSize: 50,
        hasMore: true,
      });

      api.get.mockResolvedValue({
        data: {
          data: newLogs,
          pagination: { total: 100 },
        },
      });

      const result = await useActivityStore.getState().loadMoreActivity();

      expect(api.get).toHaveBeenCalledWith('/activity', {
        params: { limit: 50, offset: 50 },
      });
      expect(result).toEqual(newLogs);
      expect(useActivityStore.getState().logs).toEqual([...existingLogs, ...newLogs]);
      expect(useActivityStore.getState().currentOffset).toBe(50);
      expect(useActivityStore.getState().isLoadingMore).toBe(false);
    });

    it('sets hasMore to false when all logs are loaded', async () => {
      const existingLogs = [
        { id: 1, action: 'created', task_id: 1 },
        { id: 2, action: 'updated', task_id: 1 },
      ];

      const newLogs = [
        { id: 3, action: 'deleted', task_id: 2 },
      ];

      useActivityStore.setState({
        logs: existingLogs,
        currentOffset: 0,
        pageSize: 50,
        hasMore: true,
      });

      api.get.mockResolvedValue({
        data: {
          data: newLogs,
          pagination: { total: 3 },
        },
      });

      await useActivityStore.getState().loadMoreActivity();

      expect(useActivityStore.getState().hasMore).toBe(false);
    });

    it('does not load more if already loading', async () => {
      useActivityStore.setState({
        isLoadingMore: true,
        hasMore: true,
      });

      await useActivityStore.getState().loadMoreActivity();

      expect(api.get).not.toHaveBeenCalled();
    });

    it('does not load more if no more logs available', async () => {
      useActivityStore.setState({
        hasMore: false,
      });

      await useActivityStore.getState().loadMoreActivity();

      expect(api.get).not.toHaveBeenCalled();
    });

    it('handles API errors correctly', async () => {
      const errorMessage = 'Failed to load more activity logs';
      useActivityStore.setState({
        logs: [{ id: 1, action: 'created', task_id: 1 }],
        currentOffset: 0,
        pageSize: 50,
        hasMore: true,
      });

      api.get.mockRejectedValue(new Error(errorMessage));

      await expect(useActivityStore.getState().loadMoreActivity()).rejects.toThrow(errorMessage);
      expect(useActivityStore.getState().isLoadingMore).toBe(false);
      expect(useActivityStore.getState().error).toBe(errorMessage);
    });
  });

  describe('clearLogs', () => {
    it('clears all logs and error state', () => {
      useActivityStore.setState({
        logs: [
          { id: 1, action: 'created', task_id: 1 },
          { id: 2, action: 'updated', task_id: 1 },
        ],
        error: 'Some error',
      });

      useActivityStore.getState().clearLogs();

      expect(useActivityStore.getState().logs).toEqual([]);
      expect(useActivityStore.getState().error).toBe(null);
    });
  });
});
