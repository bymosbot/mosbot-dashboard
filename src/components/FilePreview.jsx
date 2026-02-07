import { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocumentTextIcon, CodeBracketIcon, PencilIcon, CheckIcon, XMarkIcon, LockClosedIcon, ClipboardIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';
import { formatDateTimeLocal } from '../utils/helpers';
import logger from '../utils/logger';

export default function FilePreview({ file, onDelete }) {
  const { 
    fileContents, 
    isLoadingContent, 
    contentError,
    fetchFileContent,
    updateFile,
    fetchListing
  } = useWorkspaceStore();
  
  const { isAdmin, user } = useAuthStore();
  const { showToast } = useToastStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  
  const content = file ? fileContents[file.path] : null;
  const isMarkdown = file?.name.endsWith('.md');
  const canModify = useMemo(() => isAdmin(), [isAdmin]);
  
  useEffect(() => {
    if (file && file.type === 'file' && !content && !contentError) {
      setIsAccessDenied(false);
      fetchFileContent({ path: file.path }).catch((error) => {
        // Check if this is a 403 Forbidden error (access denied)
        const is403Error = error.response?.status === 403;
        setIsAccessDenied(is403Error);
        
        if (is403Error) {
          logger.warn('File access denied (403)', {
            filePath: file.path,
            fileName: file.name,
            userId: user?.id,
            userEmail: user?.email,
            userRole: user?.role,
          });
        } else {
          logger.error('Failed to load file content', error, {
            filePath: file.path,
            fileName: file.name,
            userId: user?.id,
          });
          showToast(
            error.response?.data?.error?.message || 'Failed to load file',
            'error'
          );
        }
      });
    }
  }, [file, content, contentError, fetchFileContent, showToast, user]);
  
  // Reset access denied flag when file changes
  useEffect(() => {
    setIsAccessDenied(false);
  }, [file?.path]);
  
  // Reset edit state when file changes
  useEffect(() => {
    setIsEditing(false);
    setEditedContent('');
  }, [file?.path]);
  
  const handleEdit = () => {
    if (content) {
      setEditedContent(content.content);
      setIsEditing(true);
    }
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent('');
  };
  
  const handleSave = async () => {
    if (isSaving || !file) return;
    
    setIsSaving(true);
    
    try {
      await updateFile({ 
        path: file.path, 
        content: editedContent,
        encoding: content?.encoding || 'utf8'
      });
      
      // Refetch parent directory listing to update the UI
      const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
      await fetchListing({ path: parentPath, recursive: false, force: true });
      
      showToast('File saved successfully', 'success');
      setIsEditing(false);
    } catch (error) {
      showToast(error.message || 'Failed to save file', 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCopy = async () => {
    // Copy edited content if editing, otherwise copy original content
    const textToCopy = isEditing ? editedContent : (content?.content || '');
    
    if (!textToCopy) return;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('File content copied to clipboard', 'success');
    } catch (error) {
      logger.error('Failed to copy to clipboard', error);
      showToast('Failed to copy file content', 'error');
    }
  };
  
  const handleDelete = () => {
    if (onDelete && file) {
      onDelete(file);
    }
  };
  
  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-400">
        <div className="text-center">
          <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select a file to preview</p>
        </div>
      </div>
    );
  }
  
  if (file.type === 'directory') {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-400">
        <div className="text-center">
          <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Directory: {file.name}</p>
          <p className="text-sm mt-2">Select a file to preview its content</p>
        </div>
      </div>
    );
  }
  
  if (isLoadingContent) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-dark-200 font-medium">Loading file...</p>
        </div>
      </div>
    );
  }
  
  if (contentError) {
    // Check if this is a 403 Forbidden error (access denied)
    // Use the state flag set from error.response?.status === 403, with fallback to string matching
    // for cases where contentError was set directly by the store
    const is403Error = isAccessDenied || 
                       contentError.includes('Admin access required') || 
                       contentError.includes('403') ||
                       contentError.includes('Forbidden');
    
    if (is403Error) {
      // Show restricted view for access denied errors
      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* File info header */}
          <div className="px-6 py-3 border-b border-dark-800 bg-dark-900">
            <div className="flex items-center gap-3">
              {isMarkdown ? (
                <DocumentTextIcon className="w-5 h-5 text-primary-400" />
              ) : (
                <CodeBracketIcon className="w-5 h-5 text-blue-400" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-dark-100">{file.name}</h3>
                <p className="text-xs text-dark-400 flex items-center gap-2">
                  {file.size && (
                    <>
                      {(file.size / 1024).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB
                      <span className="text-dark-600">•</span>
                    </>
                  )}
                  {file.modified && (
                    <>
                      Modified {formatDateTimeLocal(file.modified)}
                      <span className="text-dark-600">•</span>
                    </>
                  )}
                  <LockClosedIcon className="w-3 h-3" />
                  Access restricted
                </p>
              </div>
            </div>
          </div>
          
          {/* Mosaic overlay with permission message */}
          <div className="flex-1 overflow-y-auto p-6 relative">
            {/* Mosaic pattern background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="grid grid-cols-12 gap-2 h-full p-6">
                {Array.from({ length: 120 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-dark-700 rounded"
                    style={{
                      height: `${Math.random() * 40 + 20}px`,
                      opacity: Math.random() * 0.5 + 0.3
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Permission message */}
            <div className="relative z-10 flex items-center justify-center h-full">
              <div className="max-w-md text-center space-y-6 bg-dark-900/80 backdrop-blur-sm p-8 rounded-lg border border-dark-700">
                <div className="flex justify-center">
                  <div className="p-4 bg-yellow-500/10 rounded-full">
                    <LockClosedIcon className="w-12 h-12 text-yellow-500" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-dark-100">
                    File Access Restricted
                  </h3>
                  <p className="text-dark-300">
                    You don&apos;t have permission to view the contents of this file.
                  </p>
                </div>
                
                <div className="pt-4 border-t border-dark-700">
                  <p className="text-sm text-dark-400">
                    To request access, please contact an administrator of this application.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // Show generic error for other types of errors
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-400">
          <p className="font-medium mb-2">Failed to load file</p>
          <p className="text-sm text-dark-400">{contentError}</p>
        </div>
      </div>
    );
  }
  
  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center text-dark-400">
        <p>No content available</p>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* File info header */}
      <div className="px-6 py-3 border-b border-dark-800 bg-dark-900">
        <div className="flex items-center gap-3">
          {isMarkdown ? (
            <DocumentTextIcon className="w-5 h-5 text-primary-400" />
          ) : (
            <CodeBracketIcon className="w-5 h-5 text-blue-400" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold text-dark-100">{file.name}</h3>
            <p className="text-xs text-dark-400">
              {(content.size / 1024).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB • Modified {formatDateTimeLocal(content.modified)}
            </p>
          </div>
          
          {/* Action controls */}
          <div className="flex items-center gap-2">
            {/* Copy button - available to all users */}
            {(content?.content || (isEditing && editedContent)) && (
              <button
                onClick={handleCopy}
                disabled={isEditing && !editedContent}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={isEditing ? "Copy edited content" : "Copy file content"}
              >
                <ClipboardIcon className="w-4 h-4" />
                <span>Copy</span>
              </button>
            )}
            
            {/* Edit controls - admin/owner only */}
            {canModify && (
              <>
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save changes"
                    >
                      <CheckIcon className="w-4 h-4" />
                      <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel editing"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors"
                      title="Edit file"
                    >
                      <PencilIcon className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-dark-700 text-red-400 rounded hover:bg-dark-600 hover:text-red-300 transition-colors"
                      title="Delete file"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            disabled={isSaving}
            className="w-full h-full min-h-[400px] bg-dark-950 p-4 rounded-lg border border-dark-800 text-sm text-dark-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="File content..."
          />
        ) : isMarkdown ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({_node, ...props}) => <table className="w-full border-collapse border border-dark-700 my-4" {...props} />,
                thead: ({_node, ...props}) => <thead className="bg-dark-900" {...props} />,
                tbody: ({_node, ...props}) => <tbody {...props} />,
                tr: ({_node, ...props}) => <tr className="border-b border-dark-700" {...props} />,
                th: ({_node, ...props}) => <th className="border border-dark-700 px-4 py-2 text-left font-semibold text-dark-100 bg-dark-900" {...props} />,
                td: ({_node, ...props}) => <td className="border border-dark-700 px-4 py-2 text-dark-200" {...props} />,
              }}
            >
              {content.content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="bg-dark-950 p-4 rounded-lg border border-dark-800 overflow-x-auto">
            <code className="text-sm text-dark-200 font-mono">
              {content.content}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}

FilePreview.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['file', 'directory']).isRequired,
  }),
  onDelete: PropTypes.func,
};
