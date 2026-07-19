import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, ShieldCheck, Building2 } from 'lucide-react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container flex items-center justify-center min-h-screen">
      <div className="landing-bg-overlay"></div>
      <div className="glass-card text-center" style={{ maxWidth: '800px', zIndex: 1 }}>
        <div className="logo-container">
          <Building2 size={64} color="var(--primary-color)" />
        </div>
        
        <h1 className="project-title" style={{ fontSize: '36px', marginBottom: '16px', color: 'var(--primary-color)' }}>
          States' Startup Ranking Framework
        </h1>
        <h2 style={{ fontSize: '24px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '40px' }}>
          (SRF) Management Platform
        </h2>
        
        <p style={{ marginBottom: '40px', fontSize: '18px', color: 'var(--text-primary)' }}>
          A centralized, secure, and dynamically configurable enterprise platform to digitize the complete evaluation lifecycle of the States' Startup Ranking Framework.
        </p>

        <div className="action-buttons flex justify-center" style={{ gap: '24px' }}>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/login')}
            style={{ padding: '16px 32px', fontSize: '18px' }}
          >
            <UserCircle size={24} />
            User Login
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/admin-login')}
            style={{ padding: '16px 32px', fontSize: '18px' }}
          >
            <ShieldCheck size={24} />
            Admin / Super Admin
          </button>
        </div>
        
        <div style={{ marginTop: '40px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Government of India • Department for Promotion of Industry and Internal Trade
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
