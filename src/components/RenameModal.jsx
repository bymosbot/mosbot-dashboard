import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

export default function RenameModal({ isOpen, onClose, file }) {
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createFile, deleteFile, fetchFileContent } = useWorkspaceStore();
  const { showToast } = useToastStore();

  useEffect(() => {
    if (isOpen && file) {
      setNewName(file.name);
    }
  }, [isOpen, file]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || !file) return;
    
    // Validate new name
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showToast('Name is required', 'error');
      return;
    }
    
    // Check if name changed
    if (trimmedName === file.name) {
      showToast('Please enter a different name', 'error');
      return;
    }
    
    // Check for invalid characters
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1F]/g;
    if (invalidChars.test(trimmedName)) {
      showToast('Name contains invalid characters', 'error');
      return;
    }
    
    // Check for path traversal attempts
    if (trimmedName.includes('..') || trimmedName.includes('/')) {
      showToast('Name cannot contain / or ..', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
      const newPath = parentPath === '/' 
        ? `/${trimmedName}` 
        : `${parentPath}/${trimmedName}`;
      
      if (file.type === 'file') {
        // For files: read content, create with new name, delete old
        const fileContent = await fetchFileContent({ path: file.path });
        await createFile({ 
          path: newPath, 
          content: fileContent.content,
          encoding: fileContent.encoding || 'utf8'
        });
        await deleteFile({ path: file.path });
        showToast(`File renamed to "${trimmedName}"`, 'success');
      } else {
        // For directories: this is more complex, show not supported message
        showToast('Renaming directories is not currently supported', 'error');
        setIsSubmitting(false);
        return;
      }
      
      setNewName('');
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to rename', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNewName('');
      onClose();
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />
        
        {/* Modal */}
        <div className="relative w-full max-w-md transform rounded-lg bg-dark-900 border border-dark-700 shadow-xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dark-800 px-6 py-4">
            <h3 className="text-lg font-semibold text-dark-100">
              Rename {file.type === 'file' ? 'File' : 'Folder'}
            </h3>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-dark-400 hover:text-dark-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body */}
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="newName" className="block text-sm font-medium text-dark-300 mb-2">
                  New Name
                </label>
                <input
                  type="text"
                  id="newName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSubmitting}
                  className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <p className="mt-1 text-xs text-dark-500">
                  Current: {file.name}
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Renaming...' : 'Rename'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
