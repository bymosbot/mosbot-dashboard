import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';
import { validateFilePath, buildFullPath } from '../utils/pathValidation';

export default function CreateFileModal({ isOpen, onClose, currentPath }) {
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createFile, listings, fetchListing } = useWorkspaceStore();
  const { showToast } = useToastStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate file path using utility function
    const validation = validateFilePath(fileName);
    if (!validation.isValid) {
      showToast(validation.error, 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Build full path - handle nested folders
      const trimmedName = fileName.trim();
      const filePath = buildFullPath(currentPath, trimmedName);
      
      // Check if file already exists by checking all path segments
      const pathParts = filePath.split('/').filter(Boolean);
      let checkPath = '/';
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const isLastPart = i === pathParts.length - 1;
        
        // Build the path to check
        checkPath = checkPath === '/' ? `/${part}` : `${checkPath}/${part}`;
        
        // Try to get listing for parent directory
        const parentPath = checkPath.substring(0, checkPath.lastIndexOf('/')) || '/';
        const cacheKey = `${parentPath}:false`;
        let listing = listings[cacheKey];
        
        // If not in cache, fetch it
        if (!listing) {
          try {
            const result = await fetchListing({ path: parentPath, recursive: false });
            listing = result;
          } catch (error) {
            // If we can't fetch the listing, the parent doesn't exist, which is fine
            // (we'll create it). Continue checking.
            continue;
          }
        }
        
        // Check if this path segment already exists
        const existingItem = listing?.files?.find(f => f.path === checkPath);
        if (existingItem) {
          if (isLastPart) {
            // This is the file we're trying to create
            showToast(`A ${existingItem.type === 'directory' ? 'folder' : 'file'} named "${part}" already exists at this location`, 'error');
            setIsSubmitting(false);
            return;
          } else {
            // This is a folder in the path - it's okay if it exists
            if (existingItem.type !== 'directory') {
              showToast(`Cannot create file: "${part}" already exists as a file in the path`, 'error');
              setIsSubmitting(false);
              return;
            }
          }
        }
      }
      
      await createFile({ path: filePath, content: '' });
      
      // Extract just the filename for the success message
      const displayName = trimmedName.split('/').filter(Boolean).pop() || trimmedName;
      showToast(`File "${displayName}" created successfully`, 'success');
      setFileName('');
      onClose();
    } catch (error) {
      // Handle specific error codes from backend
      if (error.response?.status === 409) {
        // Backend detected file already exists (authoritative)
        showToast('File already exists at this location', 'error');
      } else {
        showToast(error.message || 'Failed to create file', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFileName('');
      onClose();
    }
  };

  if (!isOpen) return null;

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
            <h3 className="text-lg font-semibold text-dark-100">Create New File</h3>
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
                <label htmlFor="fileName" className="block text-sm font-medium text-dark-300 mb-2">
                  File Name or Path
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="example.txt or docs/README.md"
                  disabled={isSubmitting}
                  className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-dark-500">
                    <span className="font-medium text-dark-400">Base location:</span> {currentPath === '/' ? '/' : currentPath}
                  </p>
                  <p className="text-xs text-dark-500">
                    <span className="font-medium text-dark-400">Tip:</span> Use / to create nested folders (e.g., docs/guides/setup.md)
                  </p>
                </div>
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
                {isSubmitting ? 'Creating...' : 'Create File'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
