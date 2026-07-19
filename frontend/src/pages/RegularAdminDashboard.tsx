import React from 'react';
import './RegularAdminDashboard.css';

const RegularAdminDashboard: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="admin-regular-dashboard">
      <div className="dashboard-welcome-card">
        <h1>Welcome back, {user.name || 'Admin'}!</h1>
        <p>This is your administrative dashboard. Select an option from the sidebar to get started.</p>
      </div>
      
      {/* 
        This is a blank canvas ready for the Regular Admin UI.
        Once the design is provided, we can build out the metrics and charts here.
      */}
      <div className="dashboard-placeholder">
        <div className="placeholder-content">
          <h3>Dashboard Overview</h3>
          <p>Your performance metrics and assigned tasks will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default RegularAdminDashboard;
