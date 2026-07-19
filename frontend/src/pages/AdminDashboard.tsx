import React from 'react';
import SuperAdminDashboard from './SuperAdminDashboard';
import RegularAdminDashboard from './RegularAdminDashboard';

const AdminDashboard: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (user.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  return <RegularAdminDashboard />;
};

export default AdminDashboard;
