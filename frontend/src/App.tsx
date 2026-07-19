import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import EditionsDashboard from './pages/EditionsDashboard';
import UserLayout from './components/UserLayout';
import UserDashboard from './pages/UserDashboard';
import UserWorkspace from './pages/UserWorkspace';
import ManageUsers from './pages/ManageUsers';
import AuditLogs from './pages/AuditLogs';
import DataManagement from './pages/DataManagement';
import Messages from './pages/Messages';
import ManageDepartments from './pages/ManageDepartments';
import RecycleBin from './pages/RecycleBin';
import EditionWorkspace from './pages/EditionWorkspace';
import AdminSubmissionView from './pages/AdminSubmissionView';
import AssignedTasks from './pages/AssignedTasks';
import FocusedFormView from './pages/FocusedFormView';
import ReassignTasks from './pages/ReassignTasks';
import EvaluateTasks from './pages/EvaluateTasks';
import EvaluateTaskDetail from './pages/EvaluateTaskDetail';
import MySubmissions from './pages/MySubmissions';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage isAdminLogin={false} />} />
        <Route path="/admin-login" element={<LoginPage isAdminLogin={true} />} />
        
        {/* Protected Admin Routes */}
        <Route path="/admin-dashboard" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
        </Route>
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="editions" element={<EditionsDashboard />} />
          <Route path="editions/:id" element={<EditionWorkspace />} />
          <Route path="editions/:editionId/submissions/:id" element={<AdminSubmissionView />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="data" element={<DataManagement />} />
          <Route path="messages" element={<Messages />} />
          <Route path="departments" element={<ManageDepartments />} />
          <Route path="tasks" element={<ReassignTasks />} />
          <Route path="evaluate-tasks" element={<EvaluateTasks />} />
          <Route path="evaluate-tasks/:id" element={<EvaluateTaskDetail />} />
          <Route path="recycle-bin" element={<RecycleBin />} />
        </Route>

        {/* Protected User Routes */}
        <Route path="/user-dashboard" element={<UserLayout />}>
          <Route index element={<UserDashboard />} />
          <Route path="workspace/:editionId" element={<UserWorkspace />} />
          <Route path="assigned-tasks" element={<AssignedTasks />} />
          <Route path="submissions" element={<MySubmissions />} />
          <Route path="messages" element={<Messages />} />
          <Route path="task/:assignmentId" element={<FocusedFormView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
