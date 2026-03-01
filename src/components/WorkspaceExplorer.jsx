import { useEffect, useState, useMemo, useCallback, Fragment, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  ArrowPathIcon,
  Squares2X2Icon,
  QueueListIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  DocumentPlusIcon,
  FolderPlusIcon,
  ArrowUpIcon,
  FolderIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import WorkspaceTree from './WorkspaceTree';
import FilePreview from './FilePreview';
import ContextMenu from './ContextMenu';
import CreateFileModal from './CreateFileModal';
import CreateFolderModal from './CreateFolderModal';
import RenameModal from './RenameModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import { classNames, isPathInsideSymlink, isFileOrPathInsideSymlink } from '../utils/helpers';
import { useAgentStore } from '../stores/agentStore';

/**
 * Normalize a URL path segment to a workspace path.
 * - Files: "/tasks/012-subagents-page/PRD.md" (no trailing slash)
 * - Directories: "/skills/" (trailing slash) - used when navigating via breadcrumb
 * @param {string|null} pathParam - Splat from URL
 * @returns {{ path: string, isDirectory: boolean }|null}
 */
function normalizeFilePathParam(pathParam) {
  if (!pathParam || typeof pathParam !== 'string') return null;
  const trimmed = pathParam.trim();
  if (!trimmed) return null;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const isDirectory = path.endsWith('/') || path === '/';
  return { path: path.replace(/\/+$/, '') || '/', isDirectory };
}

export default function WorkspaceExplorer({
  agentId = 'coo',
  agent,
  initialFilePath = null,
  routeBase = null, // If null, defaults to `/workspaces/${agentId}`
  showAgentSelector = true,
  workspaceRootPath: workspaceRootPathOverride = null,
  leftPaneTop = null, // Optional slot rendered above the file tree in the left pane
  customFileListRenderer = null, // Optional custom renderer for file list (receives { files, selectedFile, onSelectFile, onContextMenu, searchQuery, currentPath })
}) {
  const navigate = useNavigate();
  const { agents } = useAgentStore();

  // Compute actual routeBase
  const actualRouteBase = routeBase || `/workspaces/${agentId}`;
  const {
    listings,
    isLoadingListing,
    listingError,
    listingErrors,
    selectedFile,
    currentPath,
    fetchListing,
    setSelectedFile,
    setCurrentPath,
    setWorkspaceRootPath,
    clearErrors,
    moveFile,
  } = useWorkspaceStore();

  const { isAdmin } = useAuthStore();
  const { showToast } = useToastStore();

  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'flat'
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPaths, setLoadingPaths] = useState(new Set());
  const [treeKey, setTreeKey] = useState(0); // Key to force tree remount on refresh
  const [justSwitchedWorkspace, setJustSwitchedWorkspace] = useState(false);

  // Controlled expansion state for the tree — a Set of folder paths that are open.
  // Lifting this out of TreeNode allows us to programmatically expand ancestor folders
  // when a file is selected (either by click or via URL navigation).
  const [expandedPaths, setExpandedPaths] = useState(new Set());

  // Modal states
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalTargetPath, setModalTargetPath] = useState('/');
  const [modalTargetFile, setModalTargetFile] = useState(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  const canModify = isAdmin();

  // Track previous agentId to detect workspace changes
  const prevAgentIdRef = useRef(agentId);

  // Synchronously reset stale store state on the very first render of this instance,
  // and gate the initial-load effect so it never fires with stale values.
  //
  // workspaceRootPath and currentPath are single global values shared across all
  // WorkspaceExplorer instances. When navigating between pages (e.g. /projects →
  // /workspaces/coo), the new WorkspaceExplorer mounts with the store still holding
  // values from the previous page. All useEffect hooks fire *after* the first render
  // and capture the stale values from that render's closure — so any effect-based
  // reset races with the initial-load effect.
  //
  // Strategy:
  // 1. Synchronously update the store during the first render so subsequent renders
  //    and effects see the correct values.
  // 2. Use `initialSyncDoneRef` as a gate: the initial-load effect skips the first
  //    render (where the closure still holds stale values) and only runs from the
  //    second render onward, after the store update has caused a re-render with
  //    correct currentPath and workspaceRootPath.
  const initialSyncDoneRef = useRef(false);
  if (!initialSyncDoneRef.current) {
    const rootPath = workspaceRootPathOverride || agent?.workspaceRootPath;
    if (rootPath) {
      useWorkspaceStore.getState().setWorkspaceRootPath(rootPath);
    }
    if (!normalizeFilePathParam(initialFilePath)) {
      useWorkspaceStore.getState().clearErrors();
      useWorkspaceStore.getState().setCurrentPath('/');
      useWorkspaceStore.getState().setSelectedFile(null);
    }
    // Mark done AFTER the store is updated so the initial-load effect skips
    // the first render's stale closure and waits for the re-render.
    initialSyncDoneRef.current = true;
  }

  // Initialize workspace root path when agent changes
  useEffect(() => {
    const rootPath = workspaceRootPathOverride || agent?.workspaceRootPath;
    if (rootPath) {
      setWorkspaceRootPath(rootPath);
    }
  }, [workspaceRootPathOverride, agent?.workspaceRootPath, setWorkspaceRootPath]);

  // Sync URL path to selection on mount or when navigating via link
  // IMPORTANT: Must be declared before any useEffect that references it
  const normalizedPath = useMemo(() => normalizeFilePathParam(initialFilePath), [initialFilePath]);

  // Clear state when switching between workspaces (agentId changes)
  // This must run synchronously before other effects to prevent stale state issues
  useEffect(() => {
    const prevAgentId = prevAgentIdRef.current;

    // Detect workspace change
    if (prevAgentId !== agentId) {
      // Set flag to suppress error banners during transition
      setJustSwitchedWorkspace(true);

      // Clear all errors, cached data, and expansion state from previous workspace
      clearErrors();
      setExpandedPaths(new Set());
      useWorkspaceStore.getState().clearAllListingCache();
      useWorkspaceStore.getState().clearAllContentCache();

      // Reset to root path and navigate to base URL if no specific file path
      if (!normalizedPath) {
        setCurrentPath('/');
        setSelectedFile(null);
        // Force navigation to base route to clear any stale file paths from URL
        navigate(actualRouteBase, { replace: true });
      }

      // Update ref for next comparison
      prevAgentIdRef.current = agentId;

      // Clear the flag after a short delay to allow state to settle
      setTimeout(() => {
        setJustSwitchedWorkspace(false);
      }, 100);
    }
  }, [
    agentId,
    clearErrors,
    setCurrentPath,
    setSelectedFile,
    normalizedPath,
    navigate,
    actualRouteBase,
  ]);

  // Always fetch non-recursively (one level at a time)
  const recursive = false;
  const cacheKey = `${agentId}:${currentPath}:${recursive}`;
  const currentListing = listings[cacheKey];
  const currentListingError = listingErrors?.[cacheKey] || listingError;

  // Build children cache from all loaded listings for current agent
  const childrenCache = useMemo(() => {
    const cache = {};
    Object.entries(listings).forEach(([key, listing]) => {
      // Extract agentId and path from cache key (format: "agentId:path:recursive")
      const parts = key.split(':');
      const keyAgentId = parts[0];
      const path = parts[1];

      // Only cache listings for current agent
      if (keyAgentId === agentId) {
        cache[path] = listing.files || [];
      }
    });
    return cache;
  }, [listings, agentId]);

  // Check if current path is inside a symlink directory (must be after childrenCache)
  const isCurrentPathInsideSymlink = useMemo(() => {
    return isPathInsideSymlink(currentPath, childrenCache, agentId);
  }, [currentPath, childrenCache, agentId]);

  // Toggle a single folder's expanded state
  const handleToggleExpand = useCallback((folderPath, expanded) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (expanded) next.add(folderPath);
      else next.delete(folderPath);
      return next;
    });
  }, []);

  // Expand all ancestor folders of a given file/folder path and fetch their listings.
  // e.g. for "/live-streaming-ai/README.md" this expands "/" and "/live-streaming-ai".
  const expandAncestors = useCallback(
    async (filePath) => {
      if (!filePath || filePath === '/') return;
      const parts = filePath.split('/').filter(Boolean);
      const ancestors = parts.slice(0, -1).map((_, i) => '/' + parts.slice(0, i + 1).join('/'));
      // Always include root
      const pathsToExpand = ['/', ...ancestors];

      setExpandedPaths((prev) => {
        const next = new Set(prev);
        pathsToExpand.forEach((p) => next.add(p));
        return next;
      });

      // Fetch listings for any ancestors not yet cached
      const state = useWorkspaceStore.getState();
      for (const p of pathsToExpand) {
        const ancestorCacheKey = `${agentId}:${p}:false`;
        if (!state.listings[ancestorCacheKey]) {
          try {
            await fetchListing({ path: p, recursive: false, agentId });
          } catch {
            // Ignore — tree will show what it can
          }
        }
      }
    },
    [agentId, fetchListing],
  );

  useEffect(() => {
    if (!normalizedPath) return;

    const { path, isDirectory } = normalizedPath;

    if (isDirectory) {
      setCurrentPath(path);
      setSelectedFile(null);
      // Expand the directory and all its ancestors in the tree
      expandAncestors(path + '/__placeholder__');
      handleToggleExpand(path, true);
      fetchListing({ path, recursive: false, agentId }).catch((error) => {
        if (error.response?.status === 404) {
          setCurrentPath('/');
          setSelectedFile(null);
          navigate(actualRouteBase, { replace: true });
        }
      });
    } else {
      const lastSlash = path.lastIndexOf('/');
      const parentPath = lastSlash <= 0 ? '/' : path.slice(0, lastSlash);
      const fileName = lastSlash < 0 ? path : path.slice(lastSlash + 1);

      setCurrentPath(parentPath);
      setSelectedFile({ path, name: fileName, type: 'file' });

      // Expand all ancestor folders so the file is visible in the tree
      expandAncestors(path);

      fetchListing({ path: parentPath, recursive: false, agentId }).catch((error) => {
        if (error.response?.status === 404) {
          setCurrentPath('/');
          setSelectedFile(null);
          navigate(actualRouteBase, { replace: true });
        }
      });
    }
  }, [
    normalizedPath,
    setCurrentPath,
    setSelectedFile,
    fetchListing,
    agentId,
    navigate,
    actualRouteBase,
    expandAncestors,
    handleToggleExpand,
  ]);

  // Initial load
  useEffect(() => {
    // If the store was synchronously reset during this render (new mount with stale
    // store state), currentPath in this closure may differ from what's now in the
    // store. Skip this invocation — the store update will trigger a re-render with
    // the correct currentPath, and this effect will run again with the right value.
    if (currentPath !== useWorkspaceStore.getState().currentPath) return;

    // Avoid infinite retry loops: if this path/view already failed, wait for user action (refresh).
    if (!currentListing && !isLoadingListing && !currentListingError) {
      fetchListing({ path: currentPath, recursive, agentId }).catch((error) => {
        // Only show toast if it's not a 404 (404s are handled by redirect logic)
        if (error.response?.status !== 404) {
          showToast(error.response?.data?.error?.message || 'Failed to load workspace', 'error');
        }
      });
    }
  }, [
    agentId,
    currentPath,
    recursive,
    currentListing,
    isLoadingListing,
    currentListingError,
    fetchListing,
    showToast,
  ]);

  const handleRefresh = async () => {
    clearErrors();
    try {
      // Clear all cached listings to ensure fresh data throughout the tree
      useWorkspaceStore.getState().clearAllListingCache();

      // Clear all cached file contents to ensure fresh data when reopening files
      useWorkspaceStore.getState().clearAllContentCache();

      // Collapse all folders and force tree remount
      setExpandedPaths(new Set());
      setTreeKey((prev) => prev + 1);

      // Clear selected file to force refetch when reselected
      setSelectedFile(null);
      navigate(actualRouteBase, { replace: true });

      // Fetch root level (or current path in flat view)
      await fetchListing({ path: currentPath, recursive, force: true, agentId });
      showToast('Workspace refreshed', 'success');
    } catch (error) {
      showToast(error.response?.data?.error?.message || 'Failed to refresh workspace', 'error');
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (file.type === 'directory') {
      // In flat view, navigate into the folder
      if (viewMode === 'flat') {
        setCurrentPath(file.path);
      }
      // In tree view, folder expansion/collapse is handled by TreeNode.handleClick
      // so we don't interfere with the toggle behavior here
    } else {
      // Expand all ancestor folders so the selected file is visible in context
      expandAncestors(file.path);
    }
    // Update URL so the link is shareable
    if (file.type === 'file') {
      const urlPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      navigate(`${actualRouteBase}${urlPath}`, { replace: true });
    } else if (file.type === 'directory' && viewMode === 'flat') {
      // Trailing slash for directories so URL sync treats as directory view
      const urlPath = file.path === '/' ? '' : `${file.path}/`;
      navigate(`${actualRouteBase}${urlPath}`, { replace: true });
    }
  };

  const handleBreadcrumbClick = (path) => {
    setCurrentPath(path);
    setSelectedFile(null);
    // Use trailing slash for directories so URL sync treats it as directory view, not file
    const urlPath = path === '/' ? '' : `${path}/`;
    navigate(`${actualRouteBase}${urlPath}`, { replace: true });
  };

  const handleGoUpOneLevel = () => {
    if (currentPath === '/') return;
    const lastSlash = currentPath.lastIndexOf('/');
    const parentPath = lastSlash <= 0 ? '/' : currentPath.slice(0, lastSlash);
    handleBreadcrumbClick(parentPath);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedFile(null);
    navigate(actualRouteBase, { replace: true });
  };

  // Fetch children for a folder (on-demand loading for tree view)
  const handleFetchChildren = async (folderPath) => {
    setLoadingPaths((prev) => new Set([...prev, folderPath]));
    try {
      await fetchListing({ path: folderPath, recursive: false, agentId });
    } catch (error) {
      showToast(error.response?.data?.error?.message || `Failed to load ${folderPath}`, 'error');
    } finally {
      setLoadingPaths((prev) => {
        const next = new Set(prev);
        next.delete(folderPath);
        return next;
      });
    }
  };

  // Get breadcrumbs from current path, prefixed with the workspace root path
  const { workspaceRootPath: storeRootPath } = useWorkspaceStore();
  const effectiveRootPath = workspaceRootPathOverride || storeRootPath || '';
  const rootSegments = effectiveRootPath.split('/').filter(Boolean);

  const breadcrumbs = useMemo(() => {
    const crumbs = [];

    // Build root-path breadcrumbs from the workspace root path.
    // All segments except the last are non-clickable context; the last
    // segment is clickable and navigates to "/" (workspace root).
    rootSegments.forEach((seg, i) => {
      const isLast = i === rootSegments.length - 1;
      crumbs.push({
        name: seg,
        path: isLast ? '/' : null,
        isRootPrefix: !isLast,
      });
    });

    // Add the browsable path breadcrumbs (subdirectories within the workspace)
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.forEach((part, index, arr) => {
      const path = '/' + arr.slice(0, index + 1).join('/');
      crumbs.push({ name: part, path, isRootPrefix: false });
    });

    // Fallback: if no root segments and at root, show a single "/" indicator
    if (crumbs.length === 0) {
      crumbs.push({ name: '/', path: '/', isRootPrefix: false });
    }

    return crumbs;
  }, [rootSegments, currentPath]);

  // Filter files by search query (used for flat view and custom renderers)
  const filteredFiles =
    currentListing?.files?.filter((file) => {
      if (!searchQuery.trim()) return true;
      return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];

  // Since we're always fetching non-recursively, filteredFiles already contains only immediate children
  const flatFiles = filteredFiles;

  // For tree view: always show root listing so the tree is rooted at "/" and
  // folders are expanded via expandedPaths rather than by changing currentPath.
  const rootListing = listings[`${agentId}:/:false`];
  const rootFiles =
    rootListing?.files?.filter((file) => {
      if (!searchQuery.trim()) return true;
      return file.name.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];

  // Handle context menu
  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // CRUD handlers
  const handleNewFile = (file) => {
    const targetPath = file?.type === 'directory' ? file.path : currentPath;

    // Check if target directory is a symlink or inside a symlink
    if (
      file?.isSymlink === true ||
      isFileOrPathInsideSymlink(
        file || { path: targetPath, type: 'directory' },
        childrenCache,
        agentId,
      )
    ) {
      showToast('Cannot create files inside symlink directories', 'error');
      return;
    }

    setModalTargetPath(targetPath);
    setShowCreateFileModal(true);
  };

  const handleNewFolder = (file) => {
    const targetPath = file?.type === 'directory' ? file.path : currentPath;

    // Check if target directory is a symlink or inside a symlink
    if (
      file?.isSymlink === true ||
      isFileOrPathInsideSymlink(
        file || { path: targetPath, type: 'directory' },
        childrenCache,
        agentId,
      )
    ) {
      showToast('Cannot create folders inside symlink directories', 'error');
      return;
    }

    setModalTargetPath(targetPath);
    setShowCreateFolderModal(true);
  };

  const handleRename = useCallback(
    (file) => {
      // Check if file is a symlink or inside a symlink
      if (isFileOrPathInsideSymlink(file, childrenCache, agentId)) {
        showToast('Cannot rename files or folders inside symlink directories', 'error');
        return;
      }

      setModalTargetFile(file);
      setShowRenameModal(true);
    },
    [childrenCache, agentId, showToast, setModalTargetFile, setShowRenameModal],
  );

  const handleDelete = useCallback(
    (file) => {
      setModalTargetFile(file);
      setShowDeleteModal(true);
    },
    [setModalTargetFile, setShowDeleteModal],
  );

  const handleView = (file) => {
    setSelectedFile(file);
    if (file.type === 'file') {
      const urlPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      navigate(`${actualRouteBase}${urlPath}`, { replace: true });
    }
  };

  // When path was opened as file but is actually a directory (e.g. refresh on /workspaces/agentId/skills)
  const handlePathIsDirectory = useCallback(
    (path) => {
      useWorkspaceStore.getState().clearErrors();
      useWorkspaceStore.getState().clearContentCache(path, agentId);
      setCurrentPath(path);
      setSelectedFile(null);
      const urlPath = path === '/' ? '' : `${path}/`;
      navigate(`${actualRouteBase}${urlPath}`, { replace: true });
    },
    [setCurrentPath, setSelectedFile, navigate, agentId, actualRouteBase],
  );

  // When file is not found (404) - redirect to root
  const handleFileNotFound = useCallback(
    (path) => {
      useWorkspaceStore.getState().clearErrors();
      useWorkspaceStore.getState().clearContentCache(path, agentId);
      setCurrentPath('/');
      setSelectedFile(null);
      navigate(actualRouteBase, { replace: true });
    },
    [setCurrentPath, setSelectedFile, navigate, agentId, actualRouteBase],
  );

  // Drag and drop handlers
  const handleDragStart = (_node) => {
    // Node is tracked by WorkspaceTree component
  };

  const handleDrop = async (draggedNode, targetNode) => {
    if (!canModify) return;

    // Prevent dropping into a symlink directory
    if (
      targetNode.isSymlink === true ||
      isFileOrPathInsideSymlink(targetNode, childrenCache, agentId)
    ) {
      showToast('Cannot move files into symlink directories', 'error');
      return;
    }

    // Prevent dropping a folder into itself or its descendants
    if (
      draggedNode.path === targetNode.path ||
      targetNode.path.startsWith(draggedNode.path + '/')
    ) {
      showToast('Cannot move a folder into itself', 'error');
      return;
    }

    // Only support moving files for now (directories would require recursive operations)
    if (draggedNode.type === 'directory') {
      showToast('Moving folders is not yet supported', 'error');
      return;
    }

    try {
      // Build destination path
      const fileName = draggedNode.name;
      const destinationPath =
        targetNode.path === '/' ? `/${fileName}` : `${targetNode.path}/${fileName}`;

      // Check if file already exists at destination
      const targetListing = listings[`${targetNode.path}:false`];
      if (targetListing?.files?.some((f) => f.name === fileName)) {
        if (
          !window.confirm(
            `A file named "${fileName}" already exists in the destination. Overwrite it?`,
          )
        ) {
          return;
        }
      }

      await moveFile({
        sourcePath: draggedNode.path,
        destinationPath,
      });

      showToast(`Moved "${fileName}" successfully`, 'success');

      // Refresh both source and destination directories
      const sourceParent = draggedNode.path.substring(0, draggedNode.path.lastIndexOf('/')) || '/';
      await fetchListing({ path: sourceParent, force: true, agentId });
      if (sourceParent !== targetNode.path) {
        await fetchListing({ path: targetNode.path, force: true, agentId });
      }
    } catch (error) {
      showToast(error.message || 'Failed to move file', 'error');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!canModify) return;

    const handleKeyDown = (e) => {
      // Only handle if not in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Delete key
      if (e.key === 'Delete' && selectedFile) {
        e.preventDefault();
        handleDelete(selectedFile);
      }

      // F2 for rename (files only)
      if (e.key === 'F2' && selectedFile && selectedFile.type === 'file') {
        e.preventDefault();
        handleRename(selectedFile);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canModify, selectedFile, handleRename, handleDelete]);

  return (
    <div className="card flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-dark-800 bg-dark-900">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Agent selector + Breadcrumbs for navigation (both modes) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Agent Selector */}
            {showAgentSelector && (
              <Menu as="div" className="relative flex-shrink-0">
                <Menu.Button className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded hover:bg-dark-750 transition-colors">
                  <span className="text-lg">{agent?.icon || '🤖'}</span>
                  <span className="text-sm font-medium text-dark-200">
                    {agent?.name || 'Agent'}
                  </span>
                  <ChevronUpDownIcon className="w-4 h-4 text-dark-400" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-dark-900 border border-dark-700 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-sm">
                    <div className="py-1">
                      {agents.map((workspace) => (
                        <Menu.Item key={workspace.id}>
                          {({ active }) => (
                            <button
                              onClick={() => navigate(`/workspaces/${workspace.id}`)}
                              className={classNames(
                                'flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors',
                                active ? 'bg-dark-800 text-white' : 'text-dark-100',
                                workspace.id === agentId &&
                                  'bg-primary-900/40 text-primary-200 border-l-2 border-primary-500',
                              )}
                            >
                              <span className="text-lg flex-shrink-0">{workspace.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{workspace.name}</div>
                                <div className="text-xs text-dark-400 truncate">
                                  {workspace.description}
                                </div>
                              </div>
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            {showAgentSelector && <div className="w-px h-6 bg-dark-700" />}
          </div>

          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <nav className="flex items-center gap-1 text-sm overflow-hidden">
              {breadcrumbs.map((crumb, index) => (
                <div key={`${index}-${crumb.name}`} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRightIcon className="w-4 h-4 text-dark-500 flex-shrink-0" />
                  )}
                  {crumb.isRootPrefix ? (
                    <span
                      className="px-2 py-1 truncate max-w-[10rem] text-dark-500"
                      title={effectiveRootPath}
                    >
                      {crumb.name}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.path)}
                      className={classNames(
                        'px-2 py-1 rounded hover:bg-dark-800 transition-colors truncate max-w-[10rem]',
                        index === breadcrumbs.length - 1
                          ? 'text-primary-400 font-medium'
                          : 'text-dark-400',
                      )}
                      title={crumb.path}
                    >
                      {crumb.name}
                    </button>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* CRUD buttons - visible to all, disabled for non-admin or when inside symlink */}
            <button
              onClick={() => handleNewFile(null)}
              disabled={!canModify || isCurrentPathInsideSymlink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
              title={
                isCurrentPathInsideSymlink
                  ? 'Cannot create files inside symlink directories'
                  : canModify
                    ? 'Create new file'
                    : 'Admin access required to create files'
              }
            >
              <DocumentPlusIcon className="w-4 h-4" />
              <span>New File</span>
            </button>
            <button
              onClick={() => handleNewFolder(null)}
              disabled={!canModify || isCurrentPathInsideSymlink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
              title={
                isCurrentPathInsideSymlink
                  ? 'Cannot create folders inside symlink directories'
                  : canModify
                    ? 'Create new folder'
                    : 'Admin access required to create folders'
              }
            >
              <FolderPlusIcon className="w-4 h-4" />
              <span>New Folder</span>
            </button>
            <div className="w-px h-6 bg-dark-700" />

            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                placeholder="Filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-40 bg-dark-800 border border-dark-700 rounded text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-dark-800 rounded p-1">
              <button
                onClick={() => handleViewModeChange('tree')}
                className={classNames(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'tree'
                    ? 'bg-primary-600 text-white'
                    : 'text-dark-400 hover:text-dark-200',
                )}
                title="Tree view"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleViewModeChange('flat')}
                className={classNames(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'flat'
                    ? 'bg-primary-600 text-white'
                    : 'text-dark-400 hover:text-dark-200',
                )}
                title="Flat list"
              >
                <QueueListIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isLoadingListing}
              className="p-1.5 text-dark-400 hover:text-dark-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon
                className={classNames('w-5 h-5', isLoadingListing && 'animate-spin')}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Error banner - hide during workspace transitions to prevent flashing stale errors */}
      {currentListingError && !justSwitchedWorkspace && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-900/50 text-red-300 text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-red-300">Failed to load workspace files</p>
            <p className="text-red-300/90 break-words">{currentListingError}</p>
            <p className="mt-1 text-red-300/80">
              Try refreshing. If it keeps failing, wait a bit and reload the page.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoadingListing}
            className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left pane: optional top slot + file browser */}
        <div className="w-80 border-r border-dark-800 flex flex-col overflow-hidden">
          {leftPaneTop && (
            <div
              className="flex-shrink-0 border-b border-dark-800 overflow-y-auto"
              style={{ maxHeight: '40%' }}
            >
              {leftPaneTop}
            </div>
          )}
          <div className={leftPaneTop ? 'flex-1 overflow-y-auto' : 'overflow-y-auto h-full'}>
            {isLoadingListing && !currentListing ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <div className="inline-block w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-dark-400 text-sm">Loading files...</p>
                </div>
              </div>
            ) : currentListingError && !currentListing ? (
              <div className="flex items-center justify-center h-full px-4">
                <div className="text-center space-y-3">
                  <p className="text-sm text-dark-300">
                    Workspace files couldn&apos;t be loaded right now.
                  </p>
                  <button
                    onClick={handleRefresh}
                    disabled={isLoadingListing}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : customFileListRenderer ? (
              customFileListRenderer({
                files: flatFiles,
                selectedFile,
                onSelectFile: handleFileSelect,
                onContextMenu: handleContextMenu,
                onFetchChildren: handleFetchChildren,
                childrenCache,
                loadingPaths,
                searchQuery,
                currentPath,
                expandedPaths,
                onToggleExpand: handleToggleExpand,
              })
            ) : viewMode === 'tree' ? (
              <WorkspaceTree
                key={treeKey}
                files={rootFiles}
                selectedFile={selectedFile}
                onSelectFile={handleFileSelect}
                onFetchChildren={handleFetchChildren}
                childrenCache={childrenCache}
                loadingPaths={loadingPaths}
                onContextMenu={handleContextMenu}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                canModify={canModify}
                expandedPaths={expandedPaths}
                onToggleExpand={handleToggleExpand}
              />
            ) : (
              <div className="py-2">
                {flatFiles.length === 0 && currentPath === '/' ? (
                  <div className="text-center py-8 text-dark-400">
                    <p className="text-sm">
                      {searchQuery ? 'No files match your search' : 'No files found'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Parent Folder entry - only show if not at root and no search query */}
                    {currentPath !== '/' && !searchQuery && (
                      <div
                        onClick={handleGoUpOneLevel}
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-dark-800 text-dark-400 border-b border-dark-800"
                      >
                        <ArrowUpIcon className="w-4 h-4 flex-shrink-0" />
                        <FolderIcon className="w-4 h-4 flex-shrink-0 text-yellow-500" />
                        <span className="text-sm font-medium">Parent Folder</span>
                      </div>
                    )}

                    {flatFiles.length === 0 ? (
                      <div className="text-center py-8 text-dark-400">
                        <p className="text-sm">
                          {searchQuery ? 'No files match your search' : 'No files found'}
                        </p>
                      </div>
                    ) : (
                      flatFiles
                        .sort((a, b) => {
                          // Directories first
                          if (a.type === 'directory' && b.type !== 'directory') return -1;
                          if (a.type !== 'directory' && b.type === 'directory') return 1;
                          // Then alphabetically
                          return a.name.localeCompare(b.name);
                        })
                        .map((file) => (
                          <div
                            key={file.path}
                            onClick={() => handleFileSelect(file)}
                            onContextMenu={(e) => handleContextMenu(e, file)}
                            className={classNames(
                              'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                              selectedFile?.path === file.path
                                ? 'bg-primary-600/20 text-primary-400'
                                : 'hover:bg-dark-800 text-dark-200',
                            )}
                          >
                            <span className="text-sm truncate">{file.name}</span>
                            {file.type === 'directory' && (
                              <ChevronRightIcon className="w-4 h-4 ml-auto flex-shrink-0" />
                            )}
                          </div>
                        ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: File preview */}
        <FilePreview
          file={selectedFile}
          agentId={agentId}
          onDelete={handleDelete}
          onPathIsDirectory={handlePathIsDirectory}
          onFileNotFound={handleFileNotFound}
          workspaceBaseUrl={actualRouteBase}
          childrenCache={childrenCache}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={handleCloseContextMenu}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onView={handleView}
          canModify={canModify}
          childrenCache={childrenCache}
          agentId={agentId}
        />
      )}

      {/* Modals */}
      <CreateFileModal
        isOpen={showCreateFileModal}
        onClose={() => setShowCreateFileModal(false)}
        currentPath={modalTargetPath}
        agentId={agentId}
      />

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        currentPath={modalTargetPath}
        agentId={agentId}
      />

      <RenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        file={modalTargetFile}
        agentId={agentId}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        file={modalTargetFile}
        agentId={agentId}
      />
    </div>
  );
}
