import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Docs from './pages/Docs';
import Log from './pages/Log';

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-dark-950">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/log" element={<Log />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
