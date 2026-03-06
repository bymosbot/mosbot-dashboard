import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import Login from './pages/Login';
import TaskManagerOverview from './pages/TaskManagerOverview';
import KanbanPage from './pages/KanbanPage';
import Agents from './pages/Agents';
import Workspace from './pages/Workspace';
import Docs from './pages/Docs';
import Projects from './pages/Projects';
import Skills from './pages/Skills';
// import Subagents from './pages/Subagents'; // Hidden: Task Manager + Agents page cover this; re-enable if needed
import CronJobs from './pages/CronJobs';
import Log from './pages/Log';
import Archived from './pages/Archived';
import Settings from './pages/Settings';
import ModelFleetSettings from './pages/ModelFleetSettings';
const OpenClawConfigSettings = lazy(() => import('./pages/OpenClawConfigSettings'));
import TaskView from './pages/TaskView';
import Standup from './pages/Standup';
import UsageAnalytics from './pages/UsageAnalytics';
import { useAuthStore } from './stores/authStore';
import { useAgentStore } from './stores/agentStore';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isAuthInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { fetchAgents, getDefaultAgent, agents } = useAgentStore();

  useEffect(() => {
    if (!isAuthInitialized) {
      initialize();
    }
  }, [initialize, isAuthInitialized]);

  // Fetch agents on mount for auto-discovery
  useEffect(() => {
    if (isAuthInitialized && isAuthenticated && agents.length === 0) {
      fetchAgents();
    }
  }, [isAuthInitialized, isAuthenticated, agents.length, fetchAgents]);

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
            <Route path="/" element={<Navigate to="/monitor" replace />} />
            <Route
              path="/monitor"
              element={
                <Layout>
                  <TaskManagerOverview />
                </Layout>
              }
            />
            <Route
              path="/tasks"
              element={
                <Layout>
                  <KanbanPage />
                </Layout>
              }
            />
            <Route
              path="/agents"
              element={
                <Layout>
                  <Agents />
                </Layout>
              }
            />
            {/* Backward-compat redirects */}
            <Route path="/task-manager" element={<Navigate to="/monitor" replace />} />
            <Route path="/kanban" element={<Navigate to="/tasks" replace />} />
            <Route path="/tasks/overview" element={<Navigate to="/monitor" replace />} />
            <Route path="/tasks/kanban" element={<Navigate to="/tasks" replace />} />
            <Route
              path="/docs/*"
              element={
                <Layout>
                  <Docs />
                </Layout>
              }
            />
            <Route
              path="/projects/*"
              element={
                <Layout>
                  <Projects />
                </Layout>
              }
            />
            <Route
              path="/skills/*"
              element={
                <Layout>
                  <Skills />
                </Layout>
              }
            />
            <Route
              path="/workspaces"
              element={<Navigate to={`/workspaces/${getDefaultAgent()?.id || 'coo'}`} replace />}
            />
            <Route
              path="/workspaces/:agentId/*"
              element={
                <Layout>
                  <Workspace />
                </Layout>
              }
            />
            {/* <Route path="/subagents" element={<Layout><Subagents /></Layout>} /> */}
            <Route
              path="/scheduler"
              element={
                <Layout>
                  <CronJobs />
                </Layout>
              }
            />
            <Route path="/cron-jobs" element={<Navigate to="/scheduler" replace />} />
            <Route
              path="/standups"
              element={
                <Layout>
                  <Standup />
                </Layout>
              }
            />
            <Route
              path="/usage"
              element={
                <Layout>
                  <UsageAnalytics />
                </Layout>
              }
            />
            <Route
              path="/log"
              element={
                <Layout>
                  <Log />
                </Layout>
              }
            />
            <Route
              path="/archived"
              element={
                <Layout>
                  <Archived />
                </Layout>
              }
            />
            <Route
              path="/settings"
              element={
                <Layout>
                  <Settings />
                </Layout>
              }
            />
            <Route
              path="/settings/users"
              element={
                <Layout>
                  <Settings />
                </Layout>
              }
            />
            <Route
              path="/settings/model-fleet"
              element={
                <Layout>
                  <ModelFleetSettings />
                </Layout>
              }
            />
            <Route
              path="/settings/openclaw-config"
              element={
                <Layout>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    }
                  >
                    <OpenClawConfigSettings />
                  </Suspense>
                </Layout>
              }
            />
            <Route
              path="/task/:id"
              element={
                <Layout>
                  <TaskView />
                </Layout>
              }
            />
          </Route>
        </Routes>
        <ToastContainer />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
