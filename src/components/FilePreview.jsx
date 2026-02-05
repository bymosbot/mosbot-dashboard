import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { DocumentTextIcon, CodeBracketIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

export default function FilePreview({ file }) {
  const { 
    fileContents, 
    isLoadingContent, 
    contentError,
    fetchFileContent,
    updateFile
  } = useWorkspaceStore();
  
  const { isAdmin } = useAuthStore();
  const { showToast } = useToastStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const content = file ? fileContents[file.path] : null;
  const isMarkdown = file?.name.endsWith('.md');
  const canModify = isAdmin();
  
  useEffect(() => {
    if (file && file.type === 'file' && !content) {
      fetchFileContent({ path: file.path }).catch((error) => {
        showToast(
          error.response?.data?.error?.message || 'Failed to load file',
          'error'
        );
      });
    }
  }, [file, content, fetchFileContent, showToast]);
  
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
      showToast('File saved successfully', 'success');
      setIsEditing(false);
    } catch (error) {
      showToast(error.message || 'Failed to save file', 'error');
    } finally {
      setIsSaving(false);
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
              {(content.size / 1024).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB • Modified {new Date(content.modified).toLocaleString()}
            </p>
          </div>
          
          {/* Edit controls - admin/owner only */}
          {canModify && (
            <div className="flex items-center gap-2">
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
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-dark-700 text-dark-200 rounded hover:bg-dark-600 transition-colors"
                  title="Edit file"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          )}
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
            <ReactMarkdown>{content.content}</ReactMarkdown>
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
