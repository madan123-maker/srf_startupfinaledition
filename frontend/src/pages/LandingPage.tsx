import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../assets/logo.png';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-layout">
      <nav className="landing-nav">
        <div className="nav-left">
          <img 
            src={logoUrl} 
            alt="AP Logo" 
            className="nav-logo" 
          />
          <span className="nav-title">SRF Management Platform</span>
        </div>
        <div className="nav-right">
          <a href="#" className="nav-link">Home</a>
          <a href="/login" className="nav-link" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>Sign In</a>
        </div>
      </nav>

      <main className="landing-main">
        <div className="landing-bg-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
          <div className="circle circle-4"></div>
        </div>

        <div className="landing-content">
          <div className="center-logo-container">
            <img 
              src={logoUrl} 
              alt="AP Center Logo" 
              className="center-logo"
            />
          </div>
          
          <div className="pill-badge">
            DPIIT INITIATIVES 2026
          </div>

          <h1 className="main-heading">
            Andhra Pradesh Startup Ranking<br />
            Framework Repository
          </h1>
          
          <p className="main-subheading">
            A platform to collect assign SRF Questionaries to Andhra Pradesh State<br />
            Officials, Manage multiple State Startup Ranking Framework.
          </p>

          <div className="button-group">
            <button className="btn-primary" onClick={() => navigate('/login')}>
              User Login
            </button>
            <button className="btn-outline" onClick={() => navigate('/admin-login')}>
              Admin Login
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
