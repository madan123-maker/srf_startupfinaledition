import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './components/AdminLayout';
import UserLayout from './components/UserLayout';

// Lazy loaded page components for fast initial load and chunk optimization
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EditionsDashboard = lazy(() => import('./pages/EditionsDashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const UserWorkspace = lazy(() => import('./pages/UserWorkspace'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const DataManagement = lazy(() => import('./pages/DataManagement'));
const Messages = lazy(() => import('./pages/Messages'));
const ManageDepartments = lazy(() => import('./pages/ManageDepartments'));
const RecycleBin = lazy(() => import('./pages/RecycleBin'));
const EditionWorkspace = lazy(() => import('./pages/EditionWorkspace'));
const AdminSubmissionView = lazy(() => import('./pages/AdminSubmissionView'));
const AssignedTasks = lazy(() => import('./pages/AssignedTasks'));
const FocusedFormView = lazy(() => import('./pages/FocusedFormView'));
const ReassignTasks = lazy(() => import('./pages/ReassignTasks'));
const EvaluateTasks = lazy(() => import('./pages/EvaluateTasks'));
const EvaluateTaskDetail = lazy(() => import('./pages/EvaluateTaskDetail'));
const MySubmissions = lazy(() => import('./pages/MySubmissions'));

const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '60vh',
    color: '#6366f1',
    fontWeight: 600,
    fontSize: '15px'
  }}>
    Loading...
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
