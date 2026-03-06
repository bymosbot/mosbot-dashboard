import { useState, useMemo } from 'react';
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  DocumentIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../utils/helpers';
import { useUIStore } from '../stores/uiStore';

function sortFiles(files) {
  return [...files].sort((a, b) => {
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    return a.name.localeCompare(b.name);
  });
}

function TreeNode({
  node,
  depth = 0,
  selectedPath,
  onSelect,
  onFetchChildren,
  childrenCache,
  loadingPaths,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
  canModify,
  expandedPaths,
  onToggleExpand,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isDirectory = node.type === 'directory';
  const isSelected = selectedPath === node.path;
  const isMarkdown = node.name.endsWith('.md');
  const isLoading = loadingPaths.has(node.path);
  const isSymlink = node.isSymlink === true;
  const isExpanded = expandedPaths.has(node.path);

  const { showHiddenFiles } = useUIStore();

  const children = useMemo(() => {
    if (!isDirectory || !isExpanded) return [];
    const cached = childrenCache[node.path];
    if (!cached) return [];
    const visible = showHiddenFiles ? cached : cached.filter((f) => !f.name.startsWith('.'));
    return sortFiles(visible);
  }, [isDirectory, isExpanded, childrenCache, node.path, showHiddenFiles]);

  const hasChildren = children.length > 0;

  const handleClick = async () => {
    if (isDirectory) {
      const newExpanded = !isExpanded;
      onToggleExpand(node.path, newExpanded);
      if (newExpanded && !childrenCache[node.path] && !isLoading) {
        await onFetchChildren(node.path);
      }
    }
    onSelect(node);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onContextMenu) onContextMenu(e, node);
  };

  const handleDragStart = (e) => {
    if (!canModify || isSymlink) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(node));
    if (onDragStart) onDragStart(node);
  };

  const handleDragOver = (e) => {
    if (!canModify || isSymlink || !isDirectory) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    if (!canModify) return;
    e.preventDefault();
    setIsDragOver(false);
    if (isDirectory) {
      try {
        const draggedNode = JSON.parse(e.dataTransfer.getData('application/json'));
        if (onDrop && draggedNode.path !== node.path) onDrop(draggedNode, node);
      } catch (error) {
        console.error('Failed to parse dragged data:', error);
      }
    }
  };

  return (
    <div>
      <div
        draggable={canModify && !isSymlink}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={classNames(
          'flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md transition-colors',
          isSelected ? 'bg-primary-600/20 text-primary-400' : 'hover:bg-dark-800 text-dark-200',
          isDragOver && isDirectory && !isSymlink && 'ring-2 ring-primary-500 bg-primary-600/10',
          canModify && !isSymlink && 'cursor-move',
          isSymlink && 'cursor-default',
        )}
        style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {isDirectory ? (
          isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
          )
        ) : (
          <div className="w-4" />
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
              title={node.symlinkTarget ? `Symlink → ${node.symlinkTarget}` : 'Symlink'}
            />
          )}
        </div>

        <span className={classNames('text-sm truncate', isSymlink && 'italic')}>{node.name}</span>

        {isLoading && (
          <div className="ml-auto">
            <div className="animate-spin h-3 w-3 border-2 border-primary-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

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
                expandedPaths={expandedPaths}
                onToggleExpand={onToggleExpand}
              />
            ))
          ) : !isLoading ? (
            <div
              className="text-dark-400 text-sm px-3 py-1.5"
              style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.75}rem` }}
            >
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
  canModify = false,
  expandedPaths = new Set(),
  onToggleExpand,
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
            expandedPaths={expandedPaths}
            onToggleExpand={onToggleExpand}
          />
        ))
      )}
    </div>
  );
}
