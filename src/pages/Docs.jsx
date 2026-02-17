import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Header from '../components/Header';
import WorkspaceExplorer from '../components/WorkspaceExplorer';
import { useAgentStore } from '../stores/agentStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useAuthStore } from '../stores/authStore';

export default function Docs() {
  const { '*': filePathParam } = useParams();
  const { fetchAgents } = useAgentStore();
  const { createDirectory, setWorkspaceRootPath } = useWorkspaceStore();
  const { isAdmin } = useAuthStore();
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [ensureComplete, setEnsureComplete] = useState(false);
  
  // Fetch agents on mount (needed for workspace store initialization)
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);
  
  // Ensure /workspace/docs directory exists (create if missing)
  useEffect(() => {
    const ensureDocsDir = async () => {
      if (isEnsuring || ensureComplete) return;
      
      setIsEnsuring(true);
      setWorkspaceRootPath('/workspace/docs');
      
      try {
        // Try to create the directory (will succeed if it doesn't exist)
        // Only attempt if user has modify permissions
        if (isAdmin()) {
          await createDirectory({ path: '/', agentId: 'docs' });
        }
      } catch (error) {
        // Directory might already exist (409 conflict) or we don't have permission - that's OK
        // The workspace explorer will show the error if it's a real problem
      } finally {
        setIsEnsuring(false);
        setEnsureComplete(true);
      }
    };
    
    ensureDocsDir();
  }, [createDirectory, setWorkspaceRootPath, isAdmin, isEnsuring, ensureComplete]);

  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Documentation" 
        subtitle="Shared documentation space for all agents"
      />
      
      <div className="flex-1 flex flex-col p-3 md:p-6 overflow-hidden">
        {ensureComplete ? (
          <WorkspaceExplorer 
            agentId="docs"
            agent={{ 
              id: 'docs', 
              name: 'Documentation',
              workspaceRootPath: '/workspace/docs',
              icon: '📚'
            }}
            initialFilePath={filePathParam || null}
            routeBase="/docs"
            showAgentSelector={false}
            workspaceRootPath="/workspace/docs"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-dark-400">Setting up documentation space...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
