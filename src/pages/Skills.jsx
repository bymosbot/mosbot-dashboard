import { useParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import Header from '../components/Header';
import WorkspaceExplorer from '../components/WorkspaceExplorer';
import SkillsGroupedList from '../components/SkillsGroupedList';
import { useAgentStore } from '../stores/agentStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/client';

const AGENT_ID = 'skills';
const ROOT_PATH = '/skills';

export default function Skills() {
  const { '*': filePathParam } = useParams();
  const { fetchAgents, agents } = useAgentStore();
  const { createDirectory, setWorkspaceRootPath, listings } = useWorkspaceStore();
  const { isAdmin } = useAuthStore();
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [ensureComplete, setEnsureComplete] = useState(false);
  const [agentSkills, setAgentSkills] = useState({}); // { agentId: { files: [], loading: boolean } }
  const [isLoadingAgentSkills, setIsLoadingAgentSkills] = useState(false);
  // Children cache for agent-only skill directories (keyed by absolute path)
  const [agentChildrenCache, setAgentChildrenCache] = useState({});
  const [agentLoadingPaths, setAgentLoadingPaths] = useState(new Set());

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const ensureDir = async () => {
      if (isEnsuring || ensureComplete) return;
      setIsEnsuring(true);
      setWorkspaceRootPath(ROOT_PATH);

      // Try to create directory if admin, but don't block on errors
      if (isAdmin()) {
        try {
          await createDirectory({ path: '/', agentId: AGENT_ID });
          // Success - directory created or already exists
        } catch (error) {
          // Only log unexpected errors (not 409/file exists or 404/not found)
          const errorMessage = error.message || String(error);
          const isExpectedError =
            errorMessage.includes('already exists') ||
            errorMessage.includes('not found') ||
            error.response?.status === 404;

          if (!isExpectedError) {
            console.warn('Failed to ensure skills directory:', errorMessage);
          }
        }
      }

      // Always mark as complete regardless of creation success
      setIsEnsuring(false);
      setEnsureComplete(true);
    };

    ensureDir();
  }, [createDirectory, setWorkspaceRootPath, isAdmin, isEnsuring, ensureComplete]);

  // Fetch agent-only skills from /workspace-<id>/skills/ for each agent
  useEffect(() => {
    if (!ensureComplete || !agents.length) return;

    const fetchAgentSkills = async () => {
      setIsLoadingAgentSkills(true);
      const skillsByAgent = {};

      // Fetch skills from each agent's workspace
      // Only fetch from agents with allowed workspace paths (e.g., /workspace-<id>)
      const fetchPromises = agents
        .filter((agent) => {
          // Exclude the skills agent itself
          if (agent.id === 'skills') return false;

          // Check if the workspace path is allowed by the API
          const workspacePath = agent.workspaceRootPath || `/workspace-${agent.id}`;

          // Skip main workspace agent - shared skills are handled separately via ROOT_PATH
          if (workspacePath === '/workspace') return false;

          // API allows: /workspace/, /workspace-<lowercase-letters>
          const isAllowed =
            workspacePath.startsWith('/workspace/') ||
            /^\/workspace-[a-z]+(\/|$)/.test(workspacePath);

          return isAllowed;
        })
        .map(async (agent) => {
          const workspacePath = agent.workspaceRootPath || `/workspace-${agent.id}`;
          const skillsPath = `${workspacePath}/skills`;

          try {
            const response = await api.get('/openclaw/workspace/files', {
              params: { path: skillsPath, recursive: 'false' },
            });

            const files = (response.data.data?.files || []).map((file) => ({
              ...file,
              fullPath: file.path, // Preserve full absolute path for grouping logic
              // Store agentId so FilePreview can use it when fetching content
              agentId: agent.id,
            }));

            skillsByAgent[agent.id] = { files, loading: false };
          } catch (error) {
            // If directory doesn't exist (404) or path not allowed (403), that's fine
            // Agent just has no skills or workspace path is not accessible
            if (error.response?.status !== 404 && error.response?.status !== 403) {
              console.error(`Failed to fetch skills for ${agent.id}:`, error);
            }
            skillsByAgent[agent.id] = { files: [], loading: false };
          }
        });

      await Promise.all(fetchPromises);
      setAgentSkills(skillsByAgent);
      setIsLoadingAgentSkills(false);
    };

    fetchAgentSkills();
  }, [ensureComplete, agents]);

  // Fetch children for agent-only skill directories using their absolute path directly
  const handleAgentFetchChildren = useMemo(
    () => async (absolutePath) => {
      if (agentChildrenCache[absolutePath] || agentLoadingPaths.has(absolutePath)) return;

      setAgentLoadingPaths((prev) => new Set([...prev, absolutePath]));
      try {
        const response = await api.get('/openclaw/workspace/files', {
          params: { path: absolutePath, recursive: 'false' },
        });
        // Extract agentId from the absolute path (e.g., /workspace-<agentId>/skills/subfolder)
        const workspaceMatch = absolutePath.match(/^\/workspace-([^/]+)\//);
        const extractedAgentId = workspaceMatch ? workspaceMatch[1] : null;

        const files = (response.data.data?.files || []).map((file) => ({
          ...file,
          fullPath: file.path,
          // Store agentId for child files so they can be fetched correctly
          agentId: extractedAgentId,
        }));
        setAgentChildrenCache((prev) => ({ ...prev, [absolutePath]: files }));
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error(`Failed to fetch children for ${absolutePath}:`, error);
        }
        setAgentChildrenCache((prev) => ({ ...prev, [absolutePath]: [] }));
      } finally {
        setAgentLoadingPaths((prev) => {
          const next = new Set(prev);
          next.delete(absolutePath);
          return next;
        });
      }
    },
    [agentChildrenCache, agentLoadingPaths],
  );

  // Combine shared skills with agent-only skills
  const allFiles = useMemo(() => {
    const sharedFiles = listings[`${AGENT_ID}:/:false`]?.files || [];
    try {
      const combined = [...sharedFiles];

      // Add agent-only skills with fullPath preserved
      if (agentSkills && typeof agentSkills === 'object') {
        Object.values(agentSkills).forEach(({ files }) => {
          if (Array.isArray(files)) {
            combined.push(...files);
          }
        });
      }

      return combined;
    } catch (error) {
      console.error('Error combining skills files:', error);
      return sharedFiles;
    }
  }, [listings, agentSkills]);

  return (
    <div className="flex flex-col h-full">
      <Header title="Skills" subtitle="Shared and agent-specific skills" />

      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden">
        {ensureComplete ? (
          <WorkspaceExplorer
            agentId={AGENT_ID}
            agent={{
              id: AGENT_ID,
              name: 'Skills',
              workspaceRootPath: ROOT_PATH,
              icon: '🧠',
            }}
            initialFilePath={filePathParam || null}
            routeBase="/skills"
            showAgentSelector={false}
            workspaceRootPath={ROOT_PATH}
            customFileListRenderer={({
              selectedFile,
              onSelectFile,
              onContextMenu,
              onFetchChildren,
              childrenCache,
              loadingPaths,
              searchQuery,
              expandedPaths,
              onToggleExpand,
            }) => {
              // Route fetch to the right handler based on whether the path is an
              // agent workspace path (absolute) or a shared /skills/ path (relative)
              const handleFetchChildren = (path) => {
                if (/^\/workspace/.test(path)) {
                  handleAgentFetchChildren(path);
                } else {
                  onFetchChildren(path);
                }
              };

              // For agent-only files, rewrite path to fullPath so the store uses
              // the absolute path (rawPath:true in FilePreview skips root prefix)
              // Also extract the agentId from the path for proper API routing
              const handleSelectFile = (file) => {
                if (file?.fullPath) {
                  // Extract agentId from paths like /workspace-<agentId>/skills/file.md
                  const workspaceMatch = file.fullPath.match(/^\/workspace-([^/]+)\//);
                  const extractedAgentId = workspaceMatch ? workspaceMatch[1] : null;

                  onSelectFile({
                    ...file,
                    path: file.fullPath,
                    // Store the agentId for this file so FilePreview can use it
                    agentId: extractedAgentId || file.agentId || AGENT_ID,
                  });
                } else {
                  onSelectFile(file);
                }
              };

              // Merge the workspace store's children cache with the agent-only cache
              const mergedChildrenCache = { ...childrenCache, ...agentChildrenCache };
              const mergedLoadingPaths = new Set([...(loadingPaths || []), ...agentLoadingPaths]);

              return (
                <SkillsGroupedList
                  files={allFiles || []}
                  selectedFile={selectedFile}
                  onSelectFile={handleSelectFile}
                  onContextMenu={onContextMenu}
                  onFetchChildren={handleFetchChildren}
                  childrenCache={mergedChildrenCache}
                  loadingPaths={mergedLoadingPaths}
                  searchQuery={searchQuery || ''}
                  isLoading={isLoadingAgentSkills}
                  expandedPaths={expandedPaths || new Set()}
                  onToggleExpand={onToggleExpand}
                />
              );
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-dark-400">Setting up skills space...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
