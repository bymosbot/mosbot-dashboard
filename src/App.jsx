import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import Login from './pages/Login';
import TaskManagerOverview from './pages/TaskManagerOverview';
import KanbanPage from './pages/KanbanPage';
import OrgChart from './pages/OrgChart';
import Workspace from './pages/Workspace';
import Docs from './pages/Docs';
// import Subagents from './pages/Subagents'; // Hidden: Task Manager + Org Chart cover this; re-enable if needed
import CronJobs from './pages/CronJobs';
import Log from './pages/Log';
import Archived from './pages/Archived';
import Settings from './pages/Settings';
import ModelFleetSettings from './pages/ModelFleetSettings';
import TaskView from './pages/TaskView';
import Standup from './pages/Standup';
import { useAuthStore } from './stores/authStore';
import { useAgentStore } from './stores/agentStore';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const { fetchAgents, getDefaultAgent, agents } = useAgentStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // Fetch agents on mount for auto-discovery
  useEffect(() => {
    if (agents.length === 0) {
      fetchAgents();
    }
  }, [agents.length, fetchAgents]);

  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/task-manager" replace />} />
            <Route path="/task-manager" element={<Layout><TaskManagerOverview /></Layout>} />
            <Route path="/kanban" element={<Layout><KanbanPage /></Layout>} />
            <Route path="/org-chart" element={<Layout><OrgChart /></Layout>} />
            <Route path="/tasks" element={<Navigate to="/task-manager" replace />} />
            <Route path="/tasks/overview" element={<Navigate to="/task-manager" replace />} />
            <Route path="/tasks/kanban" element={<Navigate to="/kanban" replace />} />
            <Route path="/tasks/org-chart" element={<Navigate to="/org-chart" replace />} />
            <Route path="/docs/*" element={<Layout><Docs /></Layout>} />
            <Route path="/workspaces" element={<Navigate to={`/workspaces/${getDefaultAgent()?.id || 'coo'}`} replace />} />
            <Route path="/workspaces/:agentId/*" element={<Layout><Workspace /></Layout>} />
            {/* <Route path="/subagents" element={<Layout><Subagents /></Layout>} /> */}
            <Route path="/scheduler" element={<Layout><CronJobs /></Layout>} />
            <Route path="/cron-jobs" element={<Navigate to="/scheduler" replace />} />
            <Route path="/standups" element={<Layout><Standup /></Layout>} />
            <Route path="/log" element={<Layout><Log /></Layout>} />
            <Route path="/archived" element={<Layout><Archived /></Layout>} />
            <Route path="/settings" element={<Layout><Settings /></Layout>} />
            <Route path="/settings/users" element={<Layout><Settings /></Layout>} />
            <Route path="/settings/model-fleet" element={<Layout><ModelFleetSettings /></Layout>} />
            <Route path="/task/:id" element={<Layout><TaskView /></Layout>} />
          </Route>
        </Routes>
        <ToastContainer />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
