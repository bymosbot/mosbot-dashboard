// Agent Workspaces Configuration (FALLBACK ONLY)
//
// ⚠️ This file is now used only as a fallback in agentStore.js
// ⚠️ Agents are auto-discovered from OpenClaw configuration via API
//
// To add new agents:
// 1. Add them to OpenClaw config via your OpenClaw configmap (e.g. in your GitOps overlay)
// 2. They will automatically appear in the dashboard without code changes
//
// This static configuration is kept as a fallback if the API fails

export const agentWorkspaces = [
  {
    id: 'coo',
    name: 'COO',
    label: 'Chief Operating Officer',
    description: 'Operations and workflow management',
    workspaceRootPath: '/workspace',
    icon: '📊',
  },
  {
    id: 'cto',
    name: 'CTO',
    label: 'Chief Technology Officer',
    description: 'Technical architecture and innovation',
    workspaceRootPath: '/workspace-cto',
    icon: '💼',
  },
  {
    id: 'cmo',
    name: 'CMO',
    label: 'Chief Marketing Officer',
    description: 'Marketing and communications',
    workspaceRootPath: '/workspace-cmo',
    icon: '📢',
  },
  {
    id: 'cpo',
    name: 'CPO',
    label: 'Chief Product Officer',
    description: 'Product strategy and development',
    workspaceRootPath: '/workspace-cpo',
    icon: '💡',
  },
];

// Helper to get agent by ID
export const getAgentById = (id) => {
  return agentWorkspaces.find((agent) => agent.id === id) || agentWorkspaces[0];
};

// Helper to get default agent
export const getDefaultAgent = () => {
  return agentWorkspaces[0];
};

// Helper to check if agent ID is valid
export const isValidAgentId = (id) => {
  return agentWorkspaces.some((agent) => agent.id === id);
};
