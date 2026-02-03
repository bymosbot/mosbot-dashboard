import Header from '../components/Header';
import { DocumentTextIcon, CodeBracketIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';

export default function Docs() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Documentation" />
      
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <DocumentTextIcon className="w-6 h-6 text-primary-500" />
              <h2 className="text-xl font-bold text-dark-100">Introduction</h2>
            </div>
            <p className="text-dark-300 mb-4">
              MosBot Dashboard is a self-hosted task management system designed for autonomous AI agents.
              It provides a Kanban-style interface to organize and track tasks across different stages of completion.
            </p>
            <p className="text-dark-300">
              This dashboard connects to the MosBot API backend to store and synchronize tasks across sessions.
            </p>
          </section>

          {/* Getting Started */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <RocketLaunchIcon className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-bold text-dark-100">Getting Started</h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-dark-200 mb-2">Creating Tasks</h3>
                <p className="text-dark-300">
                  Click the "New Task" button to create a new task. Fill in the title, description, priority,
                  due date, and other details. Tasks will appear in the "TO DO" column by default.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-200 mb-2">Managing Tasks</h3>
                <p className="text-dark-300">
                  Drag and drop tasks between columns to update their status. Click on any task card to
                  view details and make edits. Tasks can be assigned priorities: Low, Medium, High, or Urgent.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-200 mb-2">Task Workflow</h3>
                <ul className="list-disc list-inside text-dark-300 space-y-1">
                  <li><strong>TO DO:</strong> New tasks waiting to be started</li>
                  <li><strong>IN PROGRESS:</strong> Tasks currently being worked on</li>
                  <li><strong>DONE:</strong> Completed tasks</li>
                  <li><strong>ARCHIVE:</strong> Archived tasks for reference</li>
                </ul>
              </div>
            </div>
          </section>

          {/* API Integration */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <CodeBracketIcon className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-dark-100">API Integration</h2>
            </div>
            <div className="space-y-4">
              <p className="text-dark-300">
                The dashboard communicates with the MosBot API backend. Configure the API URL in your environment:
              </p>
              <div className="bg-dark-950 p-4 rounded-lg border border-dark-800">
                <code className="text-sm text-green-400">
                  VITE_API_URL=https://api.mosbot.example.com
                </code>
              </div>
              <p className="text-dark-300 text-sm">
                The API endpoint is configured via the <code className="text-primary-400">VITE_API_URL</code> environment variable.
                Make sure your backend is running and accessible before using the dashboard.
              </p>
            </div>
          </section>

          {/* Features */}
          <section className="card p-6">
            <h2 className="text-xl font-bold text-dark-100 mb-4">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-dark-800 rounded-lg">
                <h3 className="font-semibold text-dark-200 mb-2">🎯 Priority Levels</h3>
                <p className="text-sm text-dark-400">Organize tasks by urgency with visual priority badges</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-lg">
                <h3 className="font-semibold text-dark-200 mb-2">🏷️ Tags</h3>
                <p className="text-sm text-dark-400">Categorize tasks with custom tags</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-lg">
                <h3 className="font-semibold text-dark-200 mb-2">📅 Due Dates</h3>
                <p className="text-sm text-dark-400">Track deadlines with relative time displays</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-lg">
                <h3 className="font-semibold text-dark-200 mb-2">👤 Assignees</h3>
                <p className="text-sm text-dark-400">Assign tasks to team members</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-lg">
                <h3 className="font-semibold text-dark-200 mb-2">🎨 Dark Theme</h3>
                <p className="text-sm text-dark-400">Beautiful dark UI optimized for extended use</p>
              </div>
              <div className="p-4 bg-dark-800 rounded-lg">
                <h3 className="font-semibold text-dark-200 mb-2">↔️ Drag & Drop</h3>
                <p className="text-sm text-dark-400">Intuitive task management with drag and drop</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
