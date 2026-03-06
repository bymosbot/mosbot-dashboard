import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgentStore } from './agentStore';
import { api, getAgents } from '../api/client';
import logger from '../utils/logger';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
  getAgents: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('agentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAgentStore.getState().reset();
  });

  it('fetchAgents returns cached agents when loading or initialized', async () => {
    useAgentStore.setState({
      agents: [{ id: 'coo' }],
      isLoading: true,
      isInitialized: false,
    });
    await expect(useAgentStore.getState().fetchAgents()).resolves.toEqual([{ id: 'coo' }]);
    expect(getAgents).not.toHaveBeenCalled();

    useAgentStore.setState({
      agents: [{ id: 'cto' }],
      isLoading: false,
      isInitialized: true,
    });
    await expect(useAgentStore.getState().fetchAgents()).resolves.toEqual([{ id: 'cto' }]);
    expect(getAgents).not.toHaveBeenCalled();
  });

  it('fetchAgents transforms workspace paths and appends archived only when path exists', async () => {
    getAgents.mockResolvedValueOnce([
      { id: 'coo', workspace: '/home/node/.openclaw/workspace', isDefault: true },
      { id: 'cto', workspace: '/custom/workspace-cto' },
      { id: 'cmo' },
      { id: 'archived', workspace: '/home/node/.openclaw/workspace-old' },
    ]);
    api.get.mockResolvedValueOnce({ data: { data: { files: [] } } });

    const result = await useAgentStore.getState().fetchAgents();

    expect(result.map((a) => a.id)).toEqual(['coo', 'cto', 'cmo', 'archived']);
    expect(result.find((a) => a.id === 'coo')?.workspaceRootPath).toBe('/workspace');
    expect(result.find((a) => a.id === 'cto')?.workspaceRootPath).toBe('/custom/workspace-cto');
    expect(result.find((a) => a.id === 'cmo')?.workspaceRootPath).toBe('/workspace-cmo');

    const state = useAgentStore.getState();
    expect(state.isInitialized).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.agents[state.agents.length - 1].id).toBe('archived');
  });

  it('fetchAgents does not append archived when archived path returns 404', async () => {
    getAgents.mockResolvedValueOnce([
      { id: 'coo', workspace: '/home/node/.openclaw/workspace', isDefault: true },
      { id: 'cto', workspace: '/custom/workspace-cto' },
    ]);
    api.get.mockRejectedValueOnce({ response: { status: 404 }, message: 'Path not found' });

    const result = await useAgentStore.getState().fetchAgents();

    expect(result.map((a) => a.id)).toEqual(['coo', 'cto']);
    expect(result.some((a) => a.id === 'archived')).toBe(false);
  });

  it('fetchAgents logs warning and hides archived when probe fails with non-404', async () => {
    getAgents.mockResolvedValueOnce([{ id: 'coo', workspace: '/home/node/.openclaw/workspace' }]);
    api.get.mockRejectedValueOnce({ response: { status: 500 }, message: 'Internal error' });

    const result = await useAgentStore.getState().fetchAgents();

    expect(result.map((a) => a.id)).toEqual(['coo']);
    expect(logger.warn).toHaveBeenCalledWith(
      'Archived workspace probe failed, hiding archived agent',
      expect.objectContaining({ status: 500 }),
    );
  });

  it('fetchAgents uses fallback list and includes archived only when probe confirms it exists', async () => {
    getAgents.mockResolvedValueOnce([]);
    api.get.mockResolvedValueOnce({ data: { data: { files: [] } } });

    const result = await useAgentStore.getState().fetchAgents();

    expect(result.map((a) => a.id)).toEqual(['coo', 'cto', 'cmo', 'cpo', 'archived']);
  });

  it('fetchAgents falls back when API fails', async () => {
    getAgents.mockRejectedValueOnce(new Error('fetch failed'));

    const result = await useAgentStore.getState().fetchAgents();
    const state = useAgentStore.getState();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch agents, using fallback',
      expect.any(Error),
    );
    expect(state.isInitialized).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('fetch failed');
    expect(result.length).toBeGreaterThan(1);
    expect(result.some((agent) => agent.id === 'archived')).toBe(false);
  });

  it('getAgentById returns requested agent, default agent, or first agent', () => {
    useAgentStore.setState({
      agents: [
        { id: 'coo', isDefault: false },
        { id: 'cto', isDefault: true },
      ],
    });

    expect(useAgentStore.getState().getAgentById('coo')?.id).toBe('coo');
    expect(useAgentStore.getState().getAgentById('missing')?.id).toBe('cto');

    useAgentStore.setState({
      agents: [
        { id: 'first', isDefault: false },
        { id: 'second', isDefault: false },
      ],
    });
    expect(useAgentStore.getState().getAgentById('missing')?.id).toBe('first');
  });

  it('getDefaultAgent, isValidAgentId, and reset work as expected', () => {
    useAgentStore.setState({
      agents: [
        { id: 'coo', isDefault: false },
        { id: 'cto', isDefault: true },
      ],
      isLoading: true,
      error: 'x',
      isInitialized: true,
    });

    expect(useAgentStore.getState().getDefaultAgent()?.id).toBe('cto');
    expect(useAgentStore.getState().isValidAgentId('coo')).toBe(true);
    expect(useAgentStore.getState().isValidAgentId('nope')).toBe(false);

    useAgentStore.getState().reset();
    expect(useAgentStore.getState()).toMatchObject({
      agents: [],
      isLoading: false,
      error: null,
      isInitialized: false,
    });
  });
});
