import { create } from 'zustand';
import { getAgents } from '../api/client';
import logger from '../utils/logger';

// Archived workspace agent - temporary access to archived files
const archivedAgent = {
  id: 'archived',
  name: 'Archived',
  label: 'Archived (Old Main)',
  description: 'Archived workspace files from previous iteration',
  workspaceRootPath: '/_archived_workspace_main',
  icon: '📦',
  isDefault: false
};

// Fallback agents if API fails or returns empty
const fallbackAgents = [
  {
    id: 'coo',
    name: 'MosBot',
    label: 'MosBot (COO)',
    description: 'Chief Operating Officer and Task Orchestrator',
    workspaceRootPath: '/workspace',
    icon: '📊',
    isDefault: false
  },
  {
    id: 'cto',
    name: 'Elon',
    label: 'Elon (CTO)',
    description: 'Tech Architect',
    workspaceRootPath: '/workspace-cto',
    icon: '💼',
    isDefault: false
  },
  {
    id: 'cmo',
    name: 'Gary',
    label: 'Gary (CMO)',
    description: 'Marketing Strategist',
    workspaceRootPath: '/workspace-cmo',
    icon: '📢',
    isDefault: false
  },
  {
    id: 'cpo',
    name: 'Alex',
    label: 'Alex (CPO)',
    description: 'Product Strategist',
    workspaceRootPath: '/workspace-cpo',
    icon: '💡',
    isDefault: false
  },
  archivedAgent,
];

export const useAgentStore = create((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,
  isInitialized: false,

  // Fetch agents from API (auto-discovery)
  fetchAgents: async () => {
    const state = get();
    
    // Don't fetch if already loading or already loaded
    if (state.isLoading || (state.isInitialized && state.agents.length > 0)) {
      return state.agents;
    }

    set({ isLoading: true, error: null });

    try {
      const agentsData = await getAgents();
      
      // Transform workspace paths to workspaceRootPath format for consistency
      // Derive workspaceRootPath from agent.workspace by stripping /home/node/.openclaw/ prefix
      // Examples:
      //   /home/node/.openclaw/workspace -> /workspace
      //   /home/node/.openclaw/workspace-cto -> /workspace-cto
      let agents = agentsData.map(agent => {
        let workspaceRootPath = `/workspace-${agent.id}`; // fallback
        if (agent.workspace) {
          // Strip /home/node/.openclaw/ prefix if present
          const prefix = '/home/node/.openclaw/';
          if (agent.workspace.startsWith(prefix)) {
            workspaceRootPath = '/' + agent.workspace.substring(prefix.length);
          } else {
            workspaceRootPath = agent.workspace;
          }
        }
        return {
          ...agent,
          workspaceRootPath,
        };
      });

      // Filter out API version if present, use our constant
      agents = agents.filter(a => a.id !== 'archived');
      
      // Append Archived at the end
      agents = [...agents, archivedAgent];

      set({ 
        agents: agents.length > 0 ? agents : fallbackAgents, 
        isLoading: false, 
        error: null,
        isInitialized: true 
      });

      return agents;
    } catch (error) {
      logger.error('Failed to fetch agents, using fallback', error);
      
      set({ 
        agents: fallbackAgents, 
        isLoading: false, 
        error: error.message,
        isInitialized: true 
      });

      return fallbackAgents;
    }
  },

  // Get agent by ID
  getAgentById: (id) => {
    const { agents } = get();
    return agents.find(agent => agent.id === id) || agents.find(a => a.isDefault) || agents[0];
  },

  // Get default agent
  getDefaultAgent: () => {
    const { agents } = get();
    return agents.find(agent => agent.isDefault) || agents[0];
  },

  // Check if agent ID is valid
  isValidAgentId: (id) => {
    const { agents } = get();
    return agents.some(agent => agent.id === id);
  },

  // Reset store
  reset: () => {
    set({ 
      agents: [], 
      isLoading: false, 
      error: null, 
      isInitialized: false 
    });
  },
}));
