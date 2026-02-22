import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    if (formatStr === 'h:mm a') return '1:00 PM';
    if (formatStr === ':ss') return ':00';
    return date.toISOString ? date.toISOString() : String(date);
  }),
}));

// Mock helpers
vi.mock('../utils/helpers', () => ({
  parseDatabaseDate: vi.fn((date) => {
    if (typeof date === 'string') return new Date(date);
    return date;
  }),
}));

const defaultActivityStoreMock = () => ({
  logs: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  fetchActivity: vi.fn().mockResolvedValue([]),
  loadMoreActivity: vi.fn(),
  filters: {
    startDate: null,
    endDate: null,
    event_type: null,
    severity: null,
    agentId: null,
    source: null,
    job_id: null,
    session_key: null,
  },
  setFilters: vi.fn(),
  resetFilters: vi.fn(),
  liveSessions: [],
  isLoadingSessions: false,
  fetchLiveSessions: vi.fn(),
});

function makeLog(overrides = {}) {
  return {
    id: '1',
    title: 'Test Event',
    description: 'Test description',
    event_type: 'system',
    severity: 'info',
    source: 'system',
    timestamp: new Date().toISOString(),
    task_id: null,
    task_title: null,
    agent_id: null,
    agent_name: null,
    session_key: null,
    job_id: null,
    workspace_path: null,
    meta: null,
    ...overrides,
  };
}

describe('Log', () => {
  const mockFetchActivity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchActivity.mockResolvedValue([]);
    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      fetchActivity: mockFetchActivity,
    });
  });

  it('renders the activity log page', () => {
    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
  });

  it('displays loading state when isLoading is true', () => {
    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
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
    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
    expect(screen.getByText('Agent activity will appear here as it works')).toBeInTheDocument();
  });

  it('displays activity logs grouped by day', async () => {
    const mockLogs = [
      makeLog({ id: '1', title: 'Task Created', description: 'Created a new task', event_type: 'task_executed' }),
      makeLog({ id: '2', title: 'Task Updated', description: 'Updated task details', event_type: 'task_executed' }),
    ];

    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: mockLogs,
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

  it('displays task link pill when task_id is present', async () => {
    const mockLogs = [
      makeLog({
        id: '1',
        title: 'Task Executed',
        description: 'Task done',
        event_type: 'task_executed',
        task_id: '123e4567-e89b-12d3-a456-426614174000',
        task_title: 'My Task',
      }),
    ];

    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: mockLogs,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      const taskLink = screen.getByText('My Task');
      expect(taskLink).toBeInTheDocument();
      expect(taskLink.closest('a')).toHaveAttribute('href', '/task/123e4567-e89b-12d3-a456-426614174000');
    });
  });

  it('displays Monitor pill when session_key is present', async () => {
    const mockLogs = [
      makeLog({
        id: '1',
        title: 'Cron Run',
        event_type: 'cron_run',
        session_key: 'agent:coo:cron:my-job:run:abc123',
      }),
    ];

    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: mockLogs,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      const monitorLink = screen.getByText('Monitor');
      expect(monitorLink).toBeInTheDocument();
      expect(monitorLink.closest('a')).toHaveAttribute(
        'href',
        '/monitor?sessionKey=agent%3Acoo%3Acron%3Amy-job%3Arun%3Aabc123'
      );
    });
  });

  it('displays Scheduler pill when job_id is present', async () => {
    const mockLogs = [
      makeLog({
        id: '1',
        title: 'Cron Run',
        event_type: 'cron_run',
        job_id: 'my-job-id',
      }),
    ];

    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: mockLogs,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      const schedulerLink = screen.getByText('Scheduler');
      expect(schedulerLink).toBeInTheDocument();
      expect(schedulerLink.closest('a')).toHaveAttribute('href', '/scheduler?jobId=my-job-id');
    });
  });

  it('displays Projects pill for /shared/projects workspace paths', async () => {
    const mockLogs = [
      makeLog({
        id: '1',
        title: 'File Created',
        event_type: 'workspace_file_created',
        workspace_path: '/shared/projects/foo/plan.md',
      }),
    ];

    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: mockLogs,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      const projectsLink = screen.getByText('Projects');
      expect(projectsLink).toBeInTheDocument();
      expect(projectsLink.closest('a')).toHaveAttribute('href', '/projects');
    });
  });

  it('renders event_type badge for cron_run entries', async () => {
    const mockLogs = [
      makeLog({ id: '1', title: 'Cron Run', event_type: 'cron_run' }),
    ];

    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: mockLogs,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Cron')).toBeInTheDocument();
    });
  });

  it('renders heartbeat_attention badge with severity indicator', async () => {
    const mockLogs = [
      makeLog({
        id: '1',
        title: 'Heartbeat attention required: coo',
        event_type: 'heartbeat_attention',
        severity: 'attention',
      }),
    ];

    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: mockLogs,
      fetchActivity: mockFetchActivity,
    });

    render(
      <BrowserRouter>
        <Log />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Both the event badge and severity badge render "Attention" for heartbeat_attention
      const attentionElements = screen.getAllByText('Attention');
      expect(attentionElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays entry count in subtitle', () => {
    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: [makeLog()],
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
    useActivityStore.mockReturnValue({
      ...defaultActivityStoreMock(),
      logs: [makeLog({ id: '1' }), makeLog({ id: '2' })],
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
