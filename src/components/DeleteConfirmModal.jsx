import { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

export default function DeleteConfirmModal({ isOpen, onClose, file, agentId = 'coo' }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { deleteFile, fetchListing } = useWorkspaceStore();
  const { showToast } = useToastStore();

  const handleDelete = async () => {
    if (isSubmitting || !file) return;
    
    setIsSubmitting(true);
    
    try {
      await deleteFile({ path: file.path, agentId });
      
      // Refetch parent directory listing to update the UI
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
      await fetchListing({ path: parentPath, recursive: false, force: true, agentId });
      
      showToast(
        `${file.type === 'file' ? 'File' : 'Folder'} "${file.name}" deleted successfully`, 
        'success'
      );
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to delete', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
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
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-dark-100">Confirm Delete</h3>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-dark-400 hover:text-dark-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          {/* Body */}
          <div className="p-6">
            <p className="text-dark-300">
              Are you sure you want to delete{' '}
              {file.type === 'directory' ? 'the folder' : 'the file'}{' '}
              <span className="font-semibold text-dark-100">{file.name}</span>?
            </p>
            {file.type === 'directory' && (
              <p className="mt-2 text-sm text-red-400">
                Warning: This will delete the folder and all its contents recursively.
              </p>
            )}
            <p className="mt-3 text-sm text-dark-500">
              This action cannot be undone.
            </p>
            
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
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
