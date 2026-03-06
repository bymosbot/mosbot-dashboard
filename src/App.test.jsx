import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';
import { useAuthStore } from './stores/authStore';
import { useAgentStore } from './stores/agentStore';

// Mock stores
vi.mock('./stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('./stores/agentStore', () => ({
  useAgentStore: vi.fn(),
}));

// Mock components that are lazy loaded or complex
vi.mock('./pages/OpenClawConfigSettings', () => ({
  default: () => <div>OpenClaw Config Settings</div>,
}));

// Mock react-syntax-highlighter to avoid ES module issues
vi.mock('react-syntax-highlighter', () => ({
  default: () => <div>Syntax Highlighter</div>,
  Prism: {
    default: () => <div>Prism</div>,
  },
}));

// Mock ErrorBoundary to avoid class component issues in tests
vi.mock('./components/ErrorBoundary', () => ({
  default: ({ children }) => <>{children}</>,
}));

describe('App', () => {
  const mockInitialize = vi.fn();
  const mockFetchAgents = vi.fn();
  const mockGetDefaultAgent = vi.fn(() => ({ id: 'coo', name: 'MosBot' }));
  let authState;
  let agentState;

  beforeEach(() => {
    vi.clearAllMocks();
    authState = {
      initialize: mockInitialize,
      isInitialized: true,
      isAuthenticated: false,
      isLoading: false,
    };
    agentState = {
      fetchAgents: mockFetchAgents,
      getDefaultAgent: mockGetDefaultAgent,
      agents: [],
    };

    useAuthStore.mockImplementation((selector) =>
      typeof selector === 'function' ? selector(authState) : authState,
    );
    useAgentStore.mockImplementation((selector) =>
      typeof selector === 'function' ? selector(agentState) : agentState,
    );
  });

  it('renders app component', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it('handles uninitialized auth store state', () => {
    authState.isInitialized = false;

    const { container } = render(<App />);

    // Component should render even when not initialized
    // (ProtectedRoute handles the loading state)
    expect(container).toBeTruthy();
    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });

  it('does not initialize auth store when already initialized', () => {
    render(<App />);
    expect(mockInitialize).not.toHaveBeenCalled();
  });

  it('fetches agents on mount when agents list is empty', () => {
    authState.isAuthenticated = true;
    render(<App />);
    expect(mockFetchAgents).toHaveBeenCalled();
  });

  it('does not fetch agents when agents list is not empty', () => {
    authState.isAuthenticated = true;
    agentState.agents = [{ id: 'coo', name: 'MosBot' }];

    render(<App />);
    expect(mockFetchAgents).not.toHaveBeenCalled();
  });

  it('handles missing default agent by falling back to coo workspace id', () => {
    mockGetDefaultAgent.mockReturnValue(undefined);

    const { container } = render(<App />);

    expect(container).toBeTruthy();
    expect(mockGetDefaultAgent).toHaveBeenCalled();
  });
});
