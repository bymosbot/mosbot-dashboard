import { useMemo } from 'react';
import {
  DocumentTextIcon,
  DocumentIcon,
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../utils/helpers';
import { useAgentStore } from '../stores/agentStore';
import { useUIStore } from '../stores/uiStore';

/**
 * Groups skills into Shared Skills and Agent-Only Skills sections.
 */
function groupSkills(files, agents = []) {
  const shared = [];
  const agentOnlyByAgent = {};

  const workspaceToAgentId = {};
  agents.forEach((agent) => {
    if (agent.id !== 'skills') {
      const workspacePath = agent.workspaceRootPath || `/workspace-${agent.id}`;
      workspaceToAgentId[workspacePath] = agent.id;
    }
  });

  files.forEach((file) => {
    const path = file.path;
    const fullPath = file.fullPath || path;
    const workspaceMatch = fullPath.match(/^(\/workspace-[^/]+)\/skills/);

    if (workspaceMatch) {
      const workspacePath = workspaceMatch[1];
      const agentId = workspaceToAgentId[workspacePath];
      if (agentId) {
        if (!agentOnlyByAgent[agentId]) agentOnlyByAgent[agentId] = [];
        agentOnlyByAgent[agentId].push(file);
      }
    } else {
      shared.push(file);
    }
  });

  return { shared, agentOnlyByAgent };
}

function SkillItem({
  file,
  selectedFile,
  onClick,
  onContextMenu,
  onFetchChildren,
  childrenCache,
  loadingPaths,
  depth = 0,
  expandedPaths,
  onToggleExpand,
}) {
  const isDirectory = file.type === 'directory';
  const isMarkdown = file.name.endsWith('.md');
  const isSymlink = file.isSymlink === true;
  const isLoading = loadingPaths?.has(file.path);
  const isExpanded = expandedPaths.has(file.path);

  const { showHiddenFiles } = useUIStore();

  const children = useMemo(() => {
    if (!isDirectory || !isExpanded || !childrenCache) return [];
    const cached = childrenCache[file.path];
    if (!cached) return [];
    const visible = showHiddenFiles ? cached : cached.filter((f) => !f.name.startsWith('.'));
    return [...visible].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [isDirectory, isExpanded, childrenCache, file.path, showHiddenFiles]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDirectory) {
      const next = !isExpanded;
      onToggleExpand(file.path, next);
      if (next && onFetchChildren && !childrenCache?.[file.path]) {
        onFetchChildren(file.path);
      }
      // Don't call onClick for directories - expansion/collapse is handled above
      return;
    }
    if (onClick) onClick(file);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) onContextMenu(e, file);
  };

  const filePath = file.fullPath || file.path;
  const isFileSelected =
    selectedFile &&
    ((selectedFile.fullPath && selectedFile.fullPath === filePath) ||
      selectedFile.path === filePath ||
      selectedFile.path === file.path);

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={classNames(
          'flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md transition-colors',
          isFileSelected ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-dark-800 text-dark-200',
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.75}rem` }}
      >
        {isDirectory ? (
          isExpanded ? (
            <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0 text-dark-400" />
          ) : (
            <ChevronRightIcon className="w-3.5 h-3.5 flex-shrink-0 text-dark-400" />
          )
        ) : (
          <div className="w-3.5 flex-shrink-0" />
        )}

        <div className="relative flex-shrink-0">
          {isDirectory ? (
            isExpanded ? (
              <FolderOpenIcon
                className={classNames('w-4 h-4', isSymlink ? 'text-cyan-400' : 'text-yellow-500')}
              />
            ) : (
              <FolderIcon
                className={classNames('w-4 h-4', isSymlink ? 'text-cyan-400' : 'text-yellow-500')}
              />
            )
          ) : isMarkdown ? (
            <DocumentTextIcon
              className={classNames('w-4 h-4', isSymlink ? 'text-cyan-400' : 'text-blue-400')}
            />
          ) : (
            <DocumentIcon
              className={classNames('w-4 h-4', isSymlink ? 'text-cyan-400' : 'text-dark-400')}
            />
          )}
          {isSymlink && (
            <ArrowTopRightOnSquareIcon
              className="w-2 h-2 absolute -bottom-0.5 -right-0.5 text-cyan-400 bg-dark-900 rounded-sm"
              title={file.symlinkTarget ? `Symlink → ${file.symlinkTarget}` : 'Symlink'}
            />
          )}
        </div>

        <span className={classNames('text-sm truncate', isSymlink && 'italic')}>{file.name}</span>

        {isLoading && (
          <div className="ml-auto">
            <div className="animate-spin h-3 w-3 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {isDirectory && isExpanded && (
        <div>
          {children.length > 0 ? (
            children.map((child) => (
              <SkillItem
                key={child.fullPath || child.path}
                file={child}
                selectedFile={selectedFile}
                onClick={onClick}
                onContextMenu={onContextMenu}
                onFetchChildren={onFetchChildren}
                childrenCache={childrenCache}
                loadingPaths={loadingPaths}
                depth={depth + 1}
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
              />
            ))
          ) : !isLoading ? (
            <div
              className="text-dark-500 text-xs py-1"
              style={{ paddingLeft: `${(depth + 2) * 1.25 + 0.75}rem` }}
            >
              Empty folder
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SkillSection({
  title,
  files,
  selectedFile,
  onSelectFile,
  onContextMenu,
  onFetchChildren,
  childrenCache,
  loadingPaths,
  expandedPaths,
  onToggleExpand,
}) {
  if (files.length === 0) return null;

  const sortedFiles = [...files].sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mb-6">
      <div className="px-3 py-2 mb-2 border-b border-dark-800">
        <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-0.5">
        {sortedFiles.map((file) => (
          <SkillItem
            key={file.fullPath || file.path}
            file={file}
            selectedFile={selectedFile}
            onClick={onSelectFile}
            onContextMenu={onContextMenu}
            onFetchChildren={onFetchChildren}
            childrenCache={childrenCache}
            loadingPaths={loadingPaths}
            expandedPaths={expandedPaths}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </div>
    </div>
  );
}

export default function SkillsGroupedList({
  files = [],
  selectedFile,
  onSelectFile,
  onContextMenu,
  onFetchChildren,
  childrenCache,
  loadingPaths,
  searchQuery = '',
  isLoading = false,
  expandedPaths = new Set(),
  onToggleExpand,
}) {
  const { agents } = useAgentStore();
  const { showHiddenFiles } = useUIStore();

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (!showHiddenFiles && file.name.startsWith('.')) return false;
      if (!searchQuery.trim()) return true;
      return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [files, searchQuery, showHiddenFiles]);

  const { shared, agentOnlyByAgent } = useMemo(() => {
    return groupSkills(filteredFiles, agents);
  }, [filteredFiles, agents]);

  const agentMap = useMemo(() => {
    const map = {};
    agents.forEach((agent) => {
      map[agent.id] = agent;
    });
    return map;
  }, [agents]);

  const hasShared = shared.length > 0;
  const hasAgentOnly = Object.keys(agentOnlyByAgent).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-dark-400 text-sm">Loading skills...</p>
        </div>
      </div>
    );
  }

  if (!hasShared && !hasAgentOnly) {
    return (
      <div className="text-center py-8 text-dark-400">
        <p className="text-sm">{searchQuery ? 'No skills match your search' : 'No skills found'}</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {hasShared && (
        <SkillSection
          title="Shared Skills"
          files={shared}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onContextMenu={onContextMenu}
          onFetchChildren={onFetchChildren}
          childrenCache={childrenCache}
          loadingPaths={loadingPaths}
          expandedPaths={expandedPaths}
          onToggleExpand={onToggleExpand}
        />
      )}

      {hasAgentOnly && (
        <div className="mb-6">
          <div className="px-3 py-2 mb-2 border-b border-dark-800">
            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
              Agent-Only Skills
            </h3>
          </div>
          {Object.entries(agentOnlyByAgent)
            .sort(([idA], [idB]) => {
              const agentA = agentMap[idA];
              const agentB = agentMap[idB];
              return (agentA?.name || idA).localeCompare(agentB?.name || idB);
            })
            .map(([agentId, agentFiles]) => {
              const agent = agentMap[agentId];
              const agentName = agent?.name || agentId.toUpperCase();
              return (
                <div key={agentId} className="mb-4">
                  <div className="px-3 py-1.5 mb-1">
                    <h4 className="text-xs font-medium text-dark-300">{agentName}</h4>
                  </div>
                  <div className="space-y-0.5 pl-3">
                    {[...agentFiles]
                      .sort((a, b) => {
                        if (a.type === 'directory' && b.type !== 'directory') return -1;
                        if (a.type !== 'directory' && b.type === 'directory') return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((file) => (
                        <SkillItem
                          key={file.fullPath || file.path}
                          file={file}
                          selectedFile={selectedFile}
                          onClick={onSelectFile}
                          onContextMenu={onContextMenu}
                          onFetchChildren={onFetchChildren}
                          childrenCache={childrenCache}
                          loadingPaths={loadingPaths}
                          expandedPaths={expandedPaths}
                          onToggleExpand={onToggleExpand}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
