import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowPathIcon, 
  Squares2X2Icon,
  QueueListIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  DocumentPlusIcon,
  FolderPlusIcon
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
import { classNames } from '../utils/helpers';

/**
 * Normalize a URL path segment to a workspace file path (leading slash, no trailing slash for files).
 * @param {string|null} pathParam - Splat from URL, e.g. "tasks/012-subagents-page/PRD.md"
 * @returns {string|null} - Normalized path like "/tasks/012-subagents-page/PRD.md" or null
 */
function normalizeFilePathParam(pathParam) {
  if (!pathParam || typeof pathParam !== 'string') return null;
  const trimmed = pathParam.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export default function WorkspaceExplorer({ initialFilePath = null }) {
  const navigate = useNavigate();
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
    clearErrors,
    moveFile
  } = useWorkspaceStore();
  
  const { isAdmin } = useAuthStore();
  const { showToast } = useToastStore();
  
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'flat'
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingPaths, setLoadingPaths] = useState(new Set());
  const [treeKey, setTreeKey] = useState(0); // Key to force tree remount on refresh
  
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
  
  // Always fetch non-recursively (one level at a time)
  const recursive = false;
  const cacheKey = `${currentPath}:${recursive}`;
  const currentListing = listings[cacheKey];
  const currentListingError = listingErrors?.[cacheKey] || listingError;
  
  // Build children cache from all loaded listings
  const childrenCache = useMemo(() => {
    const cache = {};
    Object.entries(listings).forEach(([key, listing]) => {
      // Extract path from cache key (format: "path:recursive")
      const [path] = key.split(':');
      cache[path] = listing.files || [];
    });
    return cache;
  }, [listings]);
  
  // Sync URL file path to selection on mount or when navigating via link
  const normalizedInitialPath = useMemo(
    () => normalizeFilePathParam(initialFilePath),
    [initialFilePath]
  );

  useEffect(() => {
    if (!normalizedInitialPath) return;

    const path = normalizedInitialPath;
    const lastSlash = path.lastIndexOf('/');
    const parentPath = lastSlash <= 0 ? '/' : path.slice(0, lastSlash);
    const fileName = lastSlash < 0 ? path : path.slice(lastSlash + 1);

    setCurrentPath(parentPath);
    setSelectedFile({
      path,
      name: fileName,
      type: 'file'
    });

    // Fetch parent directory so it's available; ancestors will load on demand in tree view
    fetchListing({ path: parentPath, recursive: false }).catch(() => {});
  }, [normalizedInitialPath, setCurrentPath, setSelectedFile, fetchListing]);

  // Initial load
  useEffect(() => {
    // Avoid infinite retry loops: if this path/view already failed, wait for user action (refresh).
    if (!currentListing && !isLoadingListing && !currentListingError) {
      fetchListing({ path: currentPath, recursive }).catch((error) => {
        showToast(
          error.response?.data?.error?.message || 'Failed to load workspace',
          'error'
        );
      });
    }
  }, [
    currentPath,
    recursive,
    currentListing,
    isLoadingListing,
    currentListingError,
    fetchListing,
    showToast
  ]);
  
  const handleRefresh = async () => {
    clearErrors();
    try {
      // Clear all cached listings to ensure fresh data throughout the tree
      useWorkspaceStore.getState().clearAllListingCache();
      
      // Clear all cached file contents to ensure fresh data when reopening files
      useWorkspaceStore.getState().clearAllContentCache();
      
      // Force tree remount to collapse all expanded folders
      setTreeKey(prev => prev + 1);
      
      // Clear selected file to force refetch when reselected
      setSelectedFile(null);
      navigate('/workspace', { replace: true });
      
      // Fetch root level (or current path in flat view)
      await fetchListing({ path: currentPath, recursive, force: true });
      showToast('Workspace refreshed', 'success');
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || 'Failed to refresh workspace',
        'error'
      );
    }
  };
  
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    if (file.type === 'directory' && viewMode === 'flat') {
      setCurrentPath(file.path);
    }
    // Update URL so the link is shareable
    if (file.type === 'file') {
      const urlPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      navigate(`/workspace${urlPath}`, { replace: true });
    } else if (file.type === 'directory' && viewMode === 'flat') {
      const urlPath = file.path === '/' ? '' : file.path;
      navigate(`/workspace${urlPath}`, { replace: true });
    }
  };
  
  const handleBreadcrumbClick = (path) => {
    setCurrentPath(path);
    setSelectedFile(null);
    const urlPath = path === '/' ? '' : path;
    navigate(`/workspace${urlPath}`, { replace: true });
  };
  
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedFile(null);
    navigate('/workspace', { replace: true });
  };
  
  // Fetch children for a folder (on-demand loading for tree view)
  const handleFetchChildren = async (folderPath) => {
    setLoadingPaths(prev => new Set([...prev, folderPath]));
    try {
      await fetchListing({ path: folderPath, recursive: false });
    } catch (error) {
      showToast(
        error.response?.data?.error?.message || `Failed to load ${folderPath}`,
        'error'
      );
    } finally {
      setLoadingPaths(prev => {
        const next = new Set(prev);
        next.delete(folderPath);
        return next;
      });
    }
  };
  
  // Get breadcrumbs from current path
  const breadcrumbs = currentPath.split('/').filter(Boolean).reduce((acc, part, index, arr) => {
    const path = '/' + arr.slice(0, index + 1).join('/');
    acc.push({ name: part, path });
    return acc;
  }, [{ name: 'root', path: '/' }]);
  
  // Filter files by search query
  const filteredFiles = currentListing?.files?.filter((file) => {
    if (!searchQuery.trim()) return true;
    return file.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];
  
  // Since we're always fetching non-recursively, filteredFiles already contains only immediate children
  const flatFiles = filteredFiles;
  
  // Handle context menu
  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      file
    });
  };
  
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };
  
  // CRUD handlers
  const handleNewFile = (file) => {
    const targetPath = file?.type === 'directory' ? file.path : currentPath;
    setModalTargetPath(targetPath);
    setShowCreateFileModal(true);
  };
  
  const handleNewFolder = (file) => {
    const targetPath = file?.type === 'directory' ? file.path : currentPath;
    setModalTargetPath(targetPath);
    setShowCreateFolderModal(true);
  };
  
  const handleRename = (file) => {
    setModalTargetFile(file);
    setShowRenameModal(true);
  };
  
  const handleDelete = (file) => {
    setModalTargetFile(file);
    setShowDeleteModal(true);
  };
  
  const handleView = (file) => {
    setSelectedFile(file);
    if (file.type === 'file') {
      const urlPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
      navigate(`/workspace${urlPath}`, { replace: true });
    }
  };
  
  // Drag and drop handlers
  const handleDragStart = (_node) => {
    // Node is tracked by WorkspaceTree component
  };
  
  const handleDrop = async (draggedNode, targetNode) => {
    if (!canModify) return;
    
    // Prevent dropping a folder into itself or its descendants
    if (draggedNode.path === targetNode.path || targetNode.path.startsWith(draggedNode.path + '/')) {
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
      const destinationPath = targetNode.path === '/' 
        ? `/${fileName}` 
        : `${targetNode.path}/${fileName}`;
      
      // Check if file already exists at destination
      const targetListing = listings[`${targetNode.path}:false`];
      if (targetListing?.files?.some(f => f.name === fileName)) {
        if (!window.confirm(`A file named "${fileName}" already exists in the destination. Overwrite it?`)) {
          return;
        }
      }
      
      await moveFile({ 
        sourcePath: draggedNode.path, 
        destinationPath 
      });
      
      showToast(`Moved "${fileName}" successfully`, 'success');
      
      // Refresh both source and destination directories
      const sourceParent = draggedNode.path.substring(0, draggedNode.path.lastIndexOf('/')) || '/';
      await fetchListing({ path: sourceParent, force: true });
      if (sourceParent !== targetNode.path) {
        await fetchListing({ path: targetNode.path, force: true });
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
  }, [canModify, selectedFile]);
  
  return (
    <div className="card flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-dark-800 bg-dark-900">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Breadcrumbs (flat mode) or title (tree mode) */}
          <div className="flex items-center gap-2 min-w-0">
            {viewMode === 'flat' ? (
              <nav className="flex items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center gap-1">
                    {index > 0 && <ChevronRightIcon className="w-4 h-4 text-dark-500" />}
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.path)}
                      className={classNames(
                        'px-2 py-1 rounded hover:bg-dark-800 transition-colors',
                        index === breadcrumbs.length - 1
                          ? 'text-primary-400 font-medium'
                          : 'text-dark-400'
                      )}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </nav>
            ) : (
              <h3 className="text-lg font-semibold text-dark-100">Workspace Files</h3>
            )}
          </div>
          
          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* CRUD buttons - visible to all, disabled for non-admin */}
            <button
              onClick={() => handleNewFile(null)}
              disabled={!canModify}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
              title={canModify ? "Create new file" : "Admin access required to create files"}
            >
              <DocumentPlusIcon className="w-4 h-4" />
              <span>New File</span>
            </button>
            <button
              onClick={() => handleNewFolder(null)}
              disabled={!canModify}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-600"
              title={canModify ? "Create new folder" : "Admin access required to create folders"}
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
                    : 'text-dark-400 hover:text-dark-200'
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
                    : 'text-dark-400 hover:text-dark-200'
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
              <ArrowPathIcon className={classNames(
                'w-5 h-5',
                isLoadingListing && 'animate-spin'
              )} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Error banner */}
      {currentListingError && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-900/50 text-red-300 text-sm flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-red-300">Failed to load workspace files</p>
            <p className="text-red-300/90 break-words">
              {currentListingError}
            </p>
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
        {/* Left pane: File browser */}
        <div className="w-80 border-r border-dark-800 overflow-y-auto">
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
          ) : viewMode === 'tree' ? (
            <WorkspaceTree
              key={treeKey}
              files={flatFiles}
              selectedFile={selectedFile}
              onSelectFile={handleFileSelect}
              onFetchChildren={handleFetchChildren}
              childrenCache={childrenCache}
              loadingPaths={loadingPaths}
              onContextMenu={handleContextMenu}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              canModify={canModify}
            />
          ) : (
            <div className="py-2">
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
                          : 'hover:bg-dark-800 text-dark-200'
                      )}
                    >
                      <span className="text-sm truncate">{file.name}</span>
                      {file.type === 'directory' && (
                        <ChevronRightIcon className="w-4 h-4 ml-auto flex-shrink-0" />
                      )}
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
        
        {/* Right pane: File preview */}
        <FilePreview file={selectedFile} onDelete={handleDelete} />
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
        />
      )}
      
      {/* Modals */}
      <CreateFileModal
        isOpen={showCreateFileModal}
        onClose={() => setShowCreateFileModal(false)}
        currentPath={modalTargetPath}
      />
      
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        currentPath={modalTargetPath}
      />
      
      <RenameModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        file={modalTargetFile}
      />
      
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        file={modalTargetFile}
      />
    </div>
  );
}
