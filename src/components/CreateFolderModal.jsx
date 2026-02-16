import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';
import { validateFolderName } from '../utils/pathValidation';

export default function CreateFolderModal({ isOpen, onClose, currentPath, agentId = 'coo' }) {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createDirectory, listings, fetchListing } = useWorkspaceStore();
  const { showToast } = useToastStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate folder name using utility function
    const validation = validateFolderName(folderName);
    if (!validation.isValid) {
      showToast(validation.error, 'error');
      return;
    }
    
    const trimmedName = folderName.trim();
    
    setIsSubmitting(true);
    
    try {
      const folderPath = currentPath === '/' 
        ? `/${trimmedName}` 
        : `${currentPath}/${trimmedName}`;
      
      // Check if folder or file already exists at this location
      const cacheKey = `${agentId}:${currentPath}:false`;
      let listing = listings[cacheKey];
      
      // If not in cache, fetch it
      if (!listing) {
        try {
          const result = await fetchListing({ path: currentPath, recursive: false, agentId });
          listing = result;
        } catch (error) {
          // If we can't fetch the listing, continue anyway
          // The backend will handle the error
        }
      }
      
      // Check if an item with this name already exists
      const existingItem = listing?.files?.find(f => f.name === trimmedName);
      if (existingItem) {
        showToast(`A ${existingItem.type === 'directory' ? 'folder' : 'file'} named "${trimmedName}" already exists at this location`, 'error');
        setIsSubmitting(false);
        return;
      }
      
      await createDirectory({ path: folderPath, agentId });
      
      // Refetch parent directory listing to update the UI
      await fetchListing({ path: currentPath, recursive: false, force: true, agentId });
      
      showToast(`Folder "${trimmedName}" created successfully`, 'success');
      setFolderName('');
      onClose();
    } catch (error) {
      // Handle specific error codes from backend
      if (error.response?.status === 409) {
        // Backend detected folder already exists (authoritative)
        showToast('Folder already exists at this location', 'error');
      } else {
        showToast(error.message || 'Failed to create folder', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFolderName('');
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
            <h3 className="text-lg font-semibold text-dark-100">Create New Folder</h3>
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
                <label htmlFor="folderName" className="block text-sm font-medium text-dark-300 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  id="folderName"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="my-folder"
                  disabled={isSubmitting}
                  className="input-field w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  autoFocus
                />
                <p className="mt-1 text-xs text-dark-500">
                  Location: {currentPath === '/' ? '/' : currentPath}
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
                {isSubmitting ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
