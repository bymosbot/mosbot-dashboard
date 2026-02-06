import { useState, useMemo } from 'react';
import { 
  ChevronRightIcon, 
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  DocumentIcon
} from '@heroicons/react/24/outline';
import { classNames } from '../utils/helpers';

// No longer need to build a tree - we'll display files flat with lazy loading for folders
// This function now just sorts and returns the files as-is
function sortFiles(files) {
  return [...files].sort((a, b) => {
    // Directories first
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
}

function TreeNode({ node, depth = 0, selectedPath, onSelect, onFetchChildren, childrenCache, loadingPaths, onContextMenu, onDragStart, onDragOver, onDrop, canModify }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const isDirectory = node.type === 'directory';
  const isSelected = selectedPath === node.path;
  const isMarkdown = node.name.endsWith('.md');
  const isLoading = loadingPaths.has(node.path);
  
  // Get children from cache if folder is expanded
  const children = useMemo(() => {
    if (!isDirectory || !isExpanded) return [];
    const cached = childrenCache[node.path];
    return cached ? sortFiles(cached) : [];
  }, [isDirectory, isExpanded, childrenCache, node.path]);
  
  const hasChildren = children.length > 0;
  
  const handleClick = async () => {
    if (isDirectory) {
      const newExpandedState = !isExpanded;
      setIsExpanded(newExpandedState);
      
      // Fetch children when expanding if not already cached
      if (newExpandedState && !childrenCache[node.path] && !isLoading) {
        await onFetchChildren(node.path);
      }
    }
    onSelect(node);
  };
  
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e, node);
    }
  };
  
  // Drag and drop handlers
  const handleDragStart = (e) => {
    if (!canModify) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(node));
    if (onDragStart) {
      onDragStart(node);
    }
  };
  
  const handleDragOver = (e) => {
    if (!canModify) return;
    
    // Only allow dropping on directories
    if (isDirectory) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e) => {
    if (!canModify) return;
    
    e.preventDefault();
    setIsDragOver(false);
    
    if (isDirectory) {
      try {
        const draggedNode = JSON.parse(e.dataTransfer.getData('application/json'));
        if (onDrop && draggedNode.path !== node.path) {
          onDrop(draggedNode, node);
        }
      } catch (error) {
        console.error('Failed to parse dragged data:', error);
      }
    }
  };
  
  return (
    <div>
      <div
        draggable={canModify}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={classNames(
          'flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md transition-colors',
          isSelected 
            ? 'bg-primary-600/20 text-primary-400' 
            : 'hover:bg-dark-800 text-dark-200',
          isDragOver && isDirectory && 'ring-2 ring-primary-500 bg-primary-600/10',
          canModify && 'cursor-move'
        )}
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {/* Expand/collapse icon for directories */}
        {isDirectory && (
          isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
          )
        )}
        {!isDirectory && <div className="w-4" />}
        
        {/* File/folder icon */}
        {isDirectory ? (
          isExpanded ? (
            <FolderOpenIcon className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          ) : (
            <FolderIcon className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          )
        ) : isMarkdown ? (
          <DocumentTextIcon className="w-4 h-4 flex-shrink-0 text-blue-400" />
        ) : (
          <DocumentIcon className="w-4 h-4 flex-shrink-0 text-dark-400" />
        )}
        
        {/* Name */}
        <span className="text-sm truncate">{node.name}</span>
        
        {/* Loading spinner */}
        {isLoading && (
          <div className="ml-auto">
            <div className="animate-spin h-3 w-3 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>
      
      {/* Children */}
      {isDirectory && isExpanded && (
        <div>
          {hasChildren ? (
            children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                onFetchChildren={onFetchChildren}
                childrenCache={childrenCache}
                loadingPaths={loadingPaths}
                onContextMenu={onContextMenu}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                canModify={canModify}
              />
            ))
          ) : !isLoading ? (
            <div className="text-dark-400 text-sm px-3 py-1.5" style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.75}rem` }}>
              Empty folder
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function WorkspaceTree({ 
  files, 
  selectedFile, 
  onSelectFile, 
  onFetchChildren, 
  childrenCache = {}, 
  loadingPaths = new Set(),
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  canModify = false
}) {
  const sortedFiles = useMemo(() => sortFiles(files), [files]);
  
  return (
    <div className="py-2">
      {sortedFiles.length === 0 ? (
        <div className="text-center py-8 text-dark-400">
          <p>No files found</p>
        </div>
      ) : (
        sortedFiles.map((file) => (
          <TreeNode
            key={file.path}
            node={file}
            depth={0}
            selectedPath={selectedFile?.path}
            onSelect={onSelectFile}
            onFetchChildren={onFetchChildren}
            childrenCache={childrenCache}
            loadingPaths={loadingPaths}
            onContextMenu={onContextMenu}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            canModify={canModify}
          />
        ))
      )}
    </div>
  );
}
