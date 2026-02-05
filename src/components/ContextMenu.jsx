import { useEffect, useRef } from 'react';
import { 
  DocumentPlusIcon, 
  FolderPlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

export default function ContextMenu({ 
  x, 
  y, 
  file, 
  onClose, 
  onNewFile,
  onNewFolder,
  onRename,
  onDelete,
  onView,
  canModify 
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!file) return null;

  const isDirectory = file.type === 'directory';

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-lg bg-dark-900 border border-dark-700 shadow-xl py-1"
      style={{
        top: `${y}px`,
        left: `${x}px`,
      }}
    >
      {/* View option - available to all users */}
      {!isDirectory && (
        <button
          onClick={() => {
            onView(file);
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
        >
          <EyeIcon className="w-4 h-4" />
          <span>View</span>
        </button>
      )}

      {/* Separator if both view and modify options exist */}
      {!isDirectory && canModify && (
        <div className="my-1 border-t border-dark-800" />
      )}

      {/* Admin/Owner only options */}
      {canModify && (
        <>
          {/* New File - only for directories */}
          {isDirectory && (
            <button
              onClick={() => {
                onNewFile(file);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
            >
              <DocumentPlusIcon className="w-4 h-4" />
              <span>New File</span>
            </button>
          )}

          {/* New Folder - only for directories */}
          {isDirectory && (
            <button
              onClick={() => {
                onNewFolder(file);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
            >
              <FolderPlusIcon className="w-4 h-4" />
              <span>New Folder</span>
            </button>
          )}

          {/* Separator if we have new file/folder options */}
          {isDirectory && (
            <div className="my-1 border-t border-dark-800" />
          )}

          {/* Rename - only for files (directories not supported yet) */}
          {!isDirectory && (
            <button
              onClick={() => {
                onRename(file);
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-300 hover:bg-dark-800 hover:text-dark-100 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              <span>Rename</span>
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => {
              onDelete(file);
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-dark-800 hover:text-red-300 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </>
      )}
    </div>
  );
}
