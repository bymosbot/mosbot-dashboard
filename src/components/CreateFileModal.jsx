import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

export default function CreateFileModal({ isOpen, onClose, currentPath }) {
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createFile } = useWorkspaceStore();
  const { showToast } = useToastStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Validate filename
    const trimmedName = fileName.trim();
    if (!trimmedName) {
      showToast('File name is required', 'error');
      return;
    }
    
    // Check for invalid characters
    // eslint-disable-next-line no-control-regex
    const invalidChars = /[<>:"|?*\x00-\x1F]/g;
    if (invalidChars.test(trimmedName)) {
      showToast('File name contains invalid characters', 'error');
      return;
    }
    
    // Check for path traversal attempts
    if (trimmedName.includes('..') || trimmedName.includes('/')) {
      showToast('File name cannot contain / or ..', 'error');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const filePath = currentPath === '/' 
        ? `/${trimmedName}` 
        : `${currentPath}/${trimmedName}`;
      
      await createFile({ path: filePath, content: '' });
      showToast(`File "${trimmedName}" created successfully`, 'success');
      setFileName('');
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to create file', 'error');
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
                  File Name
                </label>
                <input
                  type="text"
                  id="fileName"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="example.txt"
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
                {isSubmitting ? 'Creating...' : 'Create File'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
