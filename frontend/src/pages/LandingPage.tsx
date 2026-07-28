import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, ShieldCheck } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="landing-layout">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-left" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img 
            src={logoUrl} 
            alt="AP State Emblem Logo" 
            className="nav-logo" 
          />
          <div className="nav-title-box">
            <span className="nav-title">SRF Management Platform</span>
            <span className="nav-subtitle">Government of Andhra Pradesh</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-right desktop-nav">
          <a href="#" className="nav-link active">Home</a>
          <button className="nav-signin-btn" onClick={() => navigate('/login')}>
            <LogIn size={16} />
            Sign In
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button 
          className="mobile-menu-toggle"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <a href="#" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <button 
            className="mobile-btn-primary" 
            onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
          >
            <LogIn size={18} />
            User Login
          </button>
          <button 
            className="mobile-btn-outline" 
            onClick={() => { setMobileMenuOpen(false); navigate('/admin-login'); }}
          >
            <ShieldCheck size={18} />
            Admin Login
          </button>
        </div>
      )}

      {/* Hero / Main Section */}
      <main className="landing-main">
        {/* Background Decorative Rings */}
        <div className="landing-bg-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>

        <div className="landing-content">
          <div className="center-logo-container">
            <img 
              src={logoUrl} 
              alt="AP State Emblem Logo" 
              className="center-logo"
            />
          </div>
          
          <div className="pill-badge">
            DPIIT INITIATIVES 2026
          </div>

          <h1 className="main-heading">
            Andhra Pradesh Startup Ranking<br className="desktop-only" /> Framework Repository
          </h1>
          
          <p className="main-subheading">
            A centralized platform to collect and assign SRF Questionnaires to Andhra Pradesh State Officials,<br className="desktop-only" /> and manage multiple State Startup Ranking Framework editions.
          </p>

          <div className="button-group">
            <button className="btn-primary" onClick={() => navigate('/login')}>
              <LogIn size={18} />
              User Login
            </button>
            <button className="btn-outline" onClick={() => navigate('/admin-login')}>
              <ShieldCheck size={18} />
              Admin Login
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 Andhra Pradesh State Startup Ranking Framework (SRF). All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
