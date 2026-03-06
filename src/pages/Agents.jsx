import { useEffect, useState, useRef } from 'react';
import {
  UserGroupIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import Header from '../components/Header';
import { getActiveSubagentSessions, getAgentsConfig } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import AgentEditModal from '../components/AgentEditModal';
import logger from '../utils/logger';

const POLLING_INTERVAL = 30000; // 30 seconds (reduced from 10s to minimize load)

// Color palette for agent cards — assigned by hash of agent id
const AGENT_COLORS = [
  { border: 'border-blue-500/70', bg: 'from-blue-600/20 to-blue-900/10' },
  { border: 'border-green-500/70', bg: 'from-green-600/20 to-green-900/10' },
  { border: 'border-purple-500/70', bg: 'from-purple-600/20 to-purple-900/10' },
  { border: 'border-pink-500/70', bg: 'from-pink-600/20 to-pink-900/10' },
  { border: 'border-yellow-500/70', bg: 'from-yellow-600/20 to-yellow-900/10' },
  { border: 'border-orange-500/70', bg: 'from-orange-600/20 to-orange-900/10' },
  { border: 'border-cyan-500/70', bg: 'from-cyan-600/20 to-cyan-900/10' },
  { border: 'border-rose-500/70', bg: 'from-rose-600/20 to-rose-900/10' },
];

function getAgentColor(agentId) {
  const hash = Math.abs(
    (agentId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0),
  );
  return AGENT_COLORS[hash % AGENT_COLORS.length];
}

export default function Agents() {
  const [subagents, setSubagents] = useState([]);
  const [agentsConfig, setAgentsConfig] = useState(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [, setIsLoadingSessions] = useState(true);
  const [configError, setConfigError] = useState(null);
  const [, setSessionError] = useState(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [agentModalMode, setAgentModalMode] = useState('edit'); // 'edit' or 'create'
  const pollingRef = useRef(null);
  const { isAdmin } = useAuthStore();

  // Fetch agents config
  const loadConfig = async () => {
    try {
      const config = await getAgentsConfig();
      setAgentsConfig(config);
      setConfigError(null);
    } catch (err) {
      logger.warn('Failed to fetch agents config', err);
      setConfigError(err.message);
      setAgentsConfig(null);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch subagents
  const loadSubagents = async () => {
    try {
      const data = await getActiveSubagentSessions();
      setSubagents(data || []);
      setSessionError(null);
    } catch (err) {
      logger.error('Failed to fetch subagents', err);
      setSessionError(err.message);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadConfig();
    loadSubagents();
  }, []);

  // Polling (only when tab is visible)
  useEffect(() => {
    const startPolling = () => {
      if (pollingRef.current) return; // Already polling
      pollingRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          loadSubagents();
        }
      }, POLLING_INTERVAL);
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    // Start polling immediately
    startPolling();

    // Stop polling when tab is hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadSubagents(); // Refresh immediately when tab becomes visible
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = async () => {
    setIsLoadingConfig(true);
    setIsLoadingSessions(true);
    await Promise.all([loadConfig(), loadSubagents()]);
  };

  const handleAgentModalSave = async () => {
    // Reload config after agent modal saves
    await loadConfig();
  };

  const handleEditAgent = (agentId) => {
    setSelectedAgentId(agentId);
    setAgentModalMode('edit');
    setShowAgentModal(true);
  };

  const handleAddAgent = () => {
    setSelectedAgentId(null);
    setAgentModalMode('create');
    setShowAgentModal(true);
  };

  // Check if a node is active based on running sessions
  // Uses the configured label field to match against live session data
  const getNodeStatus = (nodeLabel) => {
    if (!nodeLabel) return 'scaffolded';

    // Check if there's a live running session with this label
    const session = subagents.find((s) => s.label === nodeLabel && s.status === 'running');
    if (session) return 'active';

    // Otherwise, try to find the node in the config and return its status
    // First check leadership
    if (agentsConfig?.leadership) {
      const leader = agentsConfig.leadership.find((l) => l.label === nodeLabel);
      if (leader?.status) return leader.status;
    }

    // Then check departments/subagents
    if (agentsConfig?.departments) {
      for (const dept of agentsConfig.departments) {
        const agent = dept.subagents?.find((a) => a.label === nodeLabel);
        if (agent?.status) return agent.status;
      }
    }

    return 'scaffolded';
  };

  // Render status badge (compact version)
  const StatusBadge = ({ status }) => {
    const config = {
      active: {
        icon: CheckCircleIcon,
        className: 'bg-green-600/10 text-green-400 border-green-500/20',
        label: 'Active',
        dotColor: 'bg-green-500',
      },
      human: {
        icon: CheckCircleIcon,
        className: 'bg-blue-600/10 text-blue-400 border-blue-500/20',
        label: 'You',
        dotColor: 'bg-blue-500',
      },
      scaffolded: {
        icon: ClockIcon,
        className: 'bg-yellow-600/10 text-yellow-400 border-yellow-500/20',
        label: 'Scaffolded',
        dotColor: 'bg-yellow-500',
      },
      deprecated: {
        icon: XCircleIcon,
        className: 'bg-red-600/10 text-red-400 border-red-500/20',
        label: 'Deprecated',
        dotColor: 'bg-red-500',
      },
    };

    const { className, label, dotColor } = config[status] || config.scaffolded;

    return (
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium whitespace-nowrap ${className}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
        <span>{label}</span>
      </div>
    );
  };

  // Render agent card with tree styling
  const AgentCard = ({ leader, large = false }) => {
    const status = getNodeStatus(leader.label);
    const { border: borderColor, bg: bgColor } = getAgentColor(leader.id);
    const canEdit = isAdmin();

    return (
      <div className={`relative ${large ? 'w-[400px]' : 'w-[300px]'} group`}>
        <div
          className={`bg-gradient-to-br ${bgColor} border-2 ${borderColor} rounded-xl ${large ? 'p-7' : 'p-5'} shadow-lg hover:shadow-xl transition-all h-full`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              {leader.title && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-dark-800/50 rounded">
                    <UserGroupIcon className="w-4 h-4 text-dark-300" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider text-dark-400 font-bold">
                    {leader.title}
                  </span>
                </div>
              )}
              <h3 className={`${large ? 'text-xl' : 'text-lg'} font-bold text-dark-50 mb-1`}>
                {leader.emoji && <span className="mr-2">{leader.emoji}</span>}
                {leader.displayName || leader.label}
              </h3>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {canEdit && (
                <button
                  onClick={() => handleEditAgent(leader.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-[21px] px-1.5 bg-dark-800/70 hover:bg-dark-700 rounded border border-dark-600 hover:border-dark-500 flex items-center justify-center"
                  title="Edit agent"
                >
                  <PencilIcon className="w-3 h-3 text-dark-300" />
                </button>
              )}
              <StatusBadge status={status} />
            </div>
          </div>
          <p className={`${large ? 'text-sm' : 'text-xs'} text-dark-300 leading-relaxed mb-3`}>
            {leader.description}
          </p>
          {leader.model && (
            <div className="flex items-center gap-1.5 pt-2">
              <span className="px-2 py-0.5 bg-orange-600/20 text-orange-400 border border-orange-500/30 rounded text-[10px] font-medium">
                {leader.model.replace('openrouter/', '').split('/').pop()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render subagent card
  const SubagentCard = ({ agent }) => {
    const status = getNodeStatus(agent.label);
    const name = agent.displayName || agent.label;

    return (
      <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 hover:border-dark-600 hover:bg-dark-900/80 transition-all group">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-dark-800 rounded-lg flex-shrink-0">
            <CpuChipIcon className="w-4 h-4 text-dark-400 group-hover:text-dark-300 transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-dark-100">{name}</p>
              <StatusBadge status={status} />
            </div>
            <p className="text-[11px] text-dark-400 leading-relaxed mb-2">{agent.description}</p>
            {agent.badges && agent.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {agent.badges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-green-600/15 text-green-400 border border-green-500/30 font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render department section
  const DepartmentSection = ({ department }) => {
    const subagents = department.subagents || [];

    return (
      <div className="bg-dark-800 border-2 border-dark-700 rounded-lg p-5 shadow-md">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-dark-700/70">
          <div>
            <h3 className="text-sm font-bold text-dark-100 mb-0.5">{department.name}</h3>
            <p className="text-[10px] text-dark-500">
              {subagents.length} agent{subagents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <UserGroupIcon className="w-5 h-5 text-dark-600" />
        </div>

        {department.description && (
          <p className="text-xs text-dark-400 mb-4 leading-relaxed">{department.description}</p>
        )}

        <div className="space-y-3">
          {subagents.map((agent) => (
            <SubagentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    );
  };

  // Show loading state while config is loading
  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-dark-400">Loading agents...</p>
        </div>
      </div>
    );
  }

  // Compute KPIs from the agents config
  const leadership = agentsConfig?.leadership || [];
  const departments = agentsConfig?.departments || [];

  // Count all subagents across all departments
  const allSubagents = departments.flatMap((dept) => dept.subagents || []);

  // Total counts
  const totalAgents = leadership.length;
  const totalSubagents = allSubagents.length;

  // Count by status (resolve with live data)
  const allNodes = [...leadership, ...allSubagents];
  const activeCount = allNodes.filter((n) => getNodeStatus(n.label) === 'active').length;
  const scaffoldedCount = allNodes.filter((n) => getNodeStatus(n.label) === 'scaffolded').length;
  const deprecatedCount = allNodes.filter((n) => getNodeStatus(n.label) === 'deprecated').length;

  // Build hierarchy from reportsTo relationships
  const hasReportsTo = leadership.some((l) => l.reportsTo);

  let topLevelLeaders = [];
  let secondLevelLeaders = [];
  let thirdLevelLeaders = [];

  if (hasReportsTo) {
    // Use reportsTo to build tree
    // Level 1: Leaders with no reportsTo (root nodes)
    topLevelLeaders = leadership.filter((l) => !l.reportsTo);

    // Level 2: Leaders who report to a Level 1 leader
    const topIds = new Set(topLevelLeaders.map((l) => l.id));
    secondLevelLeaders = leadership.filter((l) => topIds.has(l.reportsTo));

    // Level 3: Leaders who report to a Level 2 leader
    const secondIds = new Set(secondLevelLeaders.map((l) => l.id));
    thirdLevelLeaders = leadership.filter((l) => secondIds.has(l.reportsTo));
  } else {
    // Flat leadership list — no hierarchy
    thirdLevelLeaders = leadership;
  }

  // Group departments by their lead (support both leadId and lead fields)
  const departmentsByLead = {};
  departments.forEach((dept) => {
    const leadKey = dept.leadId || dept.lead;
    if (!leadKey) return;
    if (!departmentsByLead[leadKey]) {
      departmentsByLead[leadKey] = [];
    }
    departmentsByLead[leadKey].push(dept);
  });

  // Determine view mode
  const isEmpty = leadership.length === 0 && departments.length === 0;
  const isSingleAgent = leadership.length === 1 && departments.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Agents"
        subtitle="Your agent team and status overview"
        onRefresh={handleRefresh}
      >
        {isAdmin() && (
          <button onClick={handleAddAgent} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add Agent
          </button>
        )}
      </Header>

      {/* Agent Edit/Create Modal */}
      <AgentEditModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onSave={handleAgentModalSave}
        agentId={selectedAgentId}
        mode={agentModalMode}
      />

      <div className="flex-1 p-3 md:p-6 overflow-auto">
        <div className="space-y-6">
          {/* Error Notice */}
          {configError && (
            <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-500">
                  Could not load agent configuration
                </p>
                <p className="text-xs text-dark-400 mt-1">{configError}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {isEmpty && !configError && (
            <div className="text-center py-16">
              <UserGroupIcon className="w-12 h-12 text-dark-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-dark-200 mb-2">No agents configured</h2>
              <p className="text-sm text-dark-400 max-w-md mx-auto mb-6">
                Add agents to the <code className="text-dark-300">agents.list</code> in your{' '}
                <code className="text-dark-300">openclaw.json</code> and they will appear here
                automatically. For custom hierarchy, create an{' '}
                <code className="text-dark-300">agents.json</code> file.
              </p>
              {isAdmin() && (
                <button
                  onClick={handleAddAgent}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Your First Agent
                </button>
              )}
            </div>
          )}

          {/* Single Agent View */}
          {isSingleAgent && (
            <div className="flex flex-col items-center py-8">
              <div className="mb-4">
                <StatusBadge status={getNodeStatus(leadership[0].label)} />
              </div>
              <AgentCard leader={leadership[0]} large={true} />
              {isAdmin() && (
                <button
                  onClick={handleAddAgent}
                  className="mt-8 btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Another Agent
                </button>
              )}
            </div>
          )}

          {/* Multi-agent View */}
          {!isEmpty && !isSingleAgent && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <UserGroupIcon className="w-5 h-5 text-primary-500" />
                    <p className="text-xs font-medium text-dark-400">Total Agents</p>
                  </div>
                  <p className="text-2xl font-bold text-dark-100">{totalAgents}</p>
                </div>
                <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CpuChipIcon className="w-5 h-5 text-blue-500" />
                    <p className="text-xs font-medium text-dark-400">Total Subagents</p>
                  </div>
                  <p className="text-2xl font-bold text-dark-100">{totalSubagents}</p>
                </div>
                <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <p className="text-xs font-medium text-dark-400">Active</p>
                  </div>
                  <p className="text-2xl font-bold text-dark-100">{activeCount}</p>
                </div>
                <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <ClockIcon className="w-5 h-5 text-yellow-500" />
                    <p className="text-xs font-medium text-dark-400">Scaffolded</p>
                  </div>
                  <p className="text-2xl font-bold text-dark-100">{scaffoldedCount}</p>
                </div>
                <div className="bg-dark-800 border border-dark-700 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                    <p className="text-xs font-medium text-dark-400">Deprecated</p>
                  </div>
                  <p className="text-2xl font-bold text-dark-100">{deprecatedCount}</p>
                </div>
              </div>

              {/* Hierarchical Tree Diagram */}
              <div className="relative py-8 px-4">
                {/* Level 1: Root agents (top of hierarchy) */}
                {topLevelLeaders.length > 0 && (
                  <div className="flex justify-center mb-16">
                    <div className="relative inline-block">
                      <AgentCard leader={topLevelLeaders[0]} />
                      {/* Vertical line down to direct reports */}
                      {secondLevelLeaders.length > 0 && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 bg-dark-500/60"
                          style={{ top: '100%', width: '3px', height: '64px' }}
                        ></div>
                      )}
                    </div>
                  </div>
                )}

                {/* Level 2: Direct reports to root agent */}
                {secondLevelLeaders.length > 0 && (
                  <div className="flex justify-center gap-8 mb-16">
                    {secondLevelLeaders.map((leader) => (
                      <div key={leader.id} className="relative inline-block">
                        <AgentCard leader={leader} />
                        {/* Vertical line down to next level */}
                        {thirdLevelLeaders.length > 0 && (
                          <div
                            className="absolute left-1/2 -translate-x-1/2 bg-dark-500/60"
                            style={{ top: '100%', width: '3px', height: '64px' }}
                          ></div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Level 3: Third-level agents with connecting lines */}
                {thirdLevelLeaders.length > 0 && (
                  <div className="relative">
                    {/* Connecting lines container (only on large screens) */}
                    {thirdLevelLeaders.length > 1 &&
                      (secondLevelLeaders.length > 0 || topLevelLeaders.length > 0) && (
                        <div
                          className="hidden lg:block absolute w-full"
                          style={{ top: '-32px', height: '32px' }}
                        >
                          {/* Horizontal line across all positions */}
                          <div
                            className="absolute bg-dark-500/60"
                            style={{
                              top: '0',
                              left: `${100 / (thirdLevelLeaders.length * 2)}%`,
                              right: `${100 / (thirdLevelLeaders.length * 2)}%`,
                              height: '3px',
                            }}
                          ></div>

                          {/* Vertical drops to each position */}
                          {thirdLevelLeaders.map((_, idx) => {
                            const center = ((idx + 0.5) / thirdLevelLeaders.length) * 100;
                            return (
                              <div
                                key={`drop-${idx}`}
                                className="absolute bg-dark-500/60"
                                style={{
                                  top: '0',
                                  left: `${center}%`,
                                  width: '3px',
                                  height: '100%',
                                  transform: 'translateX(-50%)',
                                }}
                              ></div>
                            );
                          })}
                        </div>
                      )}

                    {/* Agents in columns */}
                    <div
                      className={`grid grid-cols-1 gap-8 lg:gap-12 ${
                        thirdLevelLeaders.length === 2
                          ? 'lg:grid-cols-2'
                          : thirdLevelLeaders.length === 3
                            ? 'lg:grid-cols-3'
                            : thirdLevelLeaders.length >= 4
                              ? 'lg:grid-cols-4'
                              : ''
                      }`}
                    >
                      {thirdLevelLeaders.map((leader) => (
                        <div key={leader.id} className="flex flex-col">
                          {/* Agent card centered */}
                          <div className="flex justify-center mb-8">
                            <div className="relative">
                              <AgentCard leader={leader} />
                              {/* Vertical line down to departments */}
                              {departmentsByLead[leader.id] &&
                                departmentsByLead[leader.id].length > 0 && (
                                  <div
                                    className="absolute left-1/2 -translate-x-1/2 bg-gradient-to-b from-dark-500/60 to-dark-500/20"
                                    style={{ top: '100%', width: '3px', height: '40px' }}
                                  ></div>
                                )}
                            </div>
                          </div>

                          {/* Departments stacked vertically */}
                          {departmentsByLead[leader.id] &&
                            departmentsByLead[leader.id].length > 0 && (
                              <div className="space-y-4">
                                {departmentsByLead[leader.id].map((department) => (
                                  <DepartmentSection key={department.id} department={department} />
                                ))}
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback: show all departments if no clear hierarchy */}
                {thirdLevelLeaders.length === 0 &&
                  topLevelLeaders.length === 0 &&
                  departments.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-bold text-dark-100 mb-4">Departments</h2>
                      {departments.map((department) => (
                        <DepartmentSection key={department.id} department={department} />
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
