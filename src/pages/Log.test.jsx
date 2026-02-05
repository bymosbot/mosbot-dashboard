import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Log from './Log';
import { useActivityStore } from '../stores/activityStore';

// Mock the activity store
vi.mock('../stores/activityStore', () => ({
  useActivityStore: vi.fn(),
}));

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === 'h:mm a') {
      return '1:00 PM';
    }
    return date.toISOString();
  }),
}));

// Mock helpers
vi.mock('../utils/helpers', () => ({
  parseDatabaseDate: vi.fn((date) => {
    if (typeof date === 'string') {
      return new Date(date);
    }
    return date;
  }),
}));

describe('Log', () => {
  const mockFetchActivity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchActivity.mockResolvedValue([]);
  });

  it('renders the activity log page', () => {
    useActivityStore.mockReturnValue({
      logs: [],
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    expect(screen.getByText('Activity Log')).toBeInTheDocument();
  });

  it('displays loading state when isLoading is true', () => {
    useActivityStore.mockReturnValue({
      logs: [],
      isLoading: true,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('displays empty state when no logs are available', () => {
    useActivityStore.mockReturnValue({
      logs: [],
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
    expect(screen.getByText('Bot activity will appear here as it works')).toBeInTheDocument();
  });

  it('displays activity logs grouped by day', async () => {
    const mockLogs = [
      {
        id: 1,
        title: 'Task Created',
        description: 'Created a new task',
        category: 'task',
        task_id: 1,
        task_title: 'Test Task',
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Task Updated',
        description: 'Updated task details',
        category: 'task',
        task_id: 1,
        task_title: 'Test Task',
        timestamp: new Date().toISOString(),
      },
    ];

    useActivityStore.mockReturnValue({
      logs: mockLogs,
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Task Created')).toBeInTheDocument();
      expect(screen.getByText('Task Updated')).toBeInTheDocument();
      expect(screen.getByText('Created a new task')).toBeInTheDocument();
      expect(screen.getByText('Updated task details')).toBeInTheDocument();
    });
  });

  it('displays task links when task_id is present', async () => {
    const mockLogs = [
      {
        id: 1,
        title: 'Task Created',
        description: 'Created a new task',
        category: 'task',
        task_id: 123,
        task_title: 'Test Task',
        timestamp: new Date().toISOString(),
      },
    ];

    useActivityStore.mockReturnValue({
      logs: mockLogs,
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      const taskLink = screen.getByText('Test Task');
      expect(taskLink).toBeInTheDocument();
      expect(taskLink.closest('a')).toHaveAttribute('href', '/task/123');
    });
  });

  it('displays entry count in subtitle', () => {
    const mockLogs = [
      {
        id: 1,
        title: 'Task Created',
        description: 'Created a new task',
        category: 'task',
        task_id: 1,
        task_title: 'Test Task',
        timestamp: new Date().toISOString(),
      },
    ];

    useActivityStore.mockReturnValue({
      logs: mockLogs,
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    expect(screen.getByText(/1 entry/)).toBeInTheDocument();
  });

  it('displays plural entry count when multiple logs', () => {
    const mockLogs = [
      {
        id: 1,
        title: 'Task Created',
        description: 'Created a new task',
        category: 'task',
        task_id: 1,
        task_title: 'Test Task',
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Task Updated',
        description: 'Updated task details',
        category: 'task',
        task_id: 1,
        task_title: 'Test Task',
        timestamp: new Date().toISOString(),
      },
    ];

    useActivityStore.mockReturnValue({
      logs: mockLogs,
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    expect(screen.getByText(/2 entries/)).toBeInTheDocument();
  });

  it('calls fetchActivity on mount', () => {
    useActivityStore.mockReturnValue({
      logs: [],
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    expect(mockFetchActivity).toHaveBeenCalled();
  });

  it('handles fetchActivity errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetchActivity.mockRejectedValue(new Error('Failed to fetch'));

    useActivityStore.mockReturnValue({
      logs: [],
      isLoading: false,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockFetchActivity).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
