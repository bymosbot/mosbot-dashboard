import Header from '../components/Header';
import WorkspaceExplorer from '../components/WorkspaceExplorer';

export default function Workspace() {
  return (
    <div className="flex flex-col h-full">
      <Header 
        title="Workspace" 
        subtitle="Browse and preview workspace files"
      />
      
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <WorkspaceExplorer />
      </div>
    </div>
  );
}
