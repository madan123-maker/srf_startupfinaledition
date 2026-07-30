import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LayoutDashboard, 
  FileText, 
  MessageSquare, 
  LogOut,
  Lock,
  Bell
} from 'lucide-react';
import EditProfileModal from './EditProfileModal';
import './AdminLayout.css'; // We'll reuse the sleek admin layout styles for the user for now

const UserLayout: React.FC = () => {
  const navigate = useNavigate();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Security & Profile states
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/notifications/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Polling every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleNotificationsClick = async () => {
    fetchNotifications();
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
    
    // Mark as read if we have unread
    if (notifications.some(n => !n.isRead)) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
  };

  const handleSignOut = () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSendOtp = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        setPasswordStep(2);
        alert('OTP sent to your email!');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to send OTP');
      }
    } catch (e) {
      alert('Failed to send OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return alert('Please enter OTP');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp })
      });
      if (res.ok) {
        setPasswordStep(3);
      } else {
        const err = await res.json();
        alert(err.error || 'Invalid OTP');
      }
    } catch (e) {
      alert('Failed to verify OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return alert('Please enter new password');
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, otp, newPassword })
      });
      if (res.ok) {
        alert('Password changed successfully! Please log in again.');
        handleSignOut();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to change password');
      }
    } catch (e) {
      alert('Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-layout">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <aside className="admin-sidebar" aria-label="User Navigation Sidebar">
        <div className="sidebar-brand">
          <Building2 size={24} color="#e85d04" aria-hidden="true" />
          <span className="brand-text">State Portal</span>
        </div>
        
        <div className="sidebar-section-title">MY DASHBOARD</div>
        
        <nav className="sidebar-nav" aria-label="User Navigation">
          <NavLink to="/user-dashboard" end className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <LayoutDashboard size={20} aria-hidden="true" />
            <span>Available Editions</span>
          </NavLink>
          <NavLink to="/user-dashboard/assigned-tasks" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={20} aria-hidden="true" />
            <span>Assigned Tasks</span>
          </NavLink>
          <NavLink to="/user-dashboard/submissions" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={20} aria-hidden="true" />
            <span>My Submissions</span>
          </NavLink>
          <NavLink to="/user-dashboard/messages" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <MessageSquare size={20} aria-hidden="true" />
            <span>Messages</span>
          </NavLink>
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header role="banner" className="admin-header">
          <div className="header-search"></div>
          
          <div className="header-actions">
            <div style={{ position: 'relative' }}>
              <button 
                className="icon-btn" 
                onClick={handleNotificationsClick}
                aria-label="Open Notifications"
                aria-expanded={showNotifications}
                aria-haspopup="true"
              >
                <Bell size={20} aria-hidden="true" />
                {notifications.some(n => !n.isRead) && (
                  <span style={{
                    position: 'absolute', top: '-2px', right: '-2px', 
                    background: '#ef4444', color: 'white', fontSize: '10px', 
                    borderRadius: '50%', padding: '2px 5px'
                  }}>
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div role="status" aria-live="polite" className="profile-popover" style={{ width: '350px', maxHeight: '400px', overflowY: 'auto' }}>
                  <div className="popover-header"><strong>Notifications</strong></div>
                  <div className="popover-body" style={{ padding: 0 }}>
                    {notifications.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#64748b', padding: '1rem' }}>No new notifications at this time.</p>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div 
                          key={notif._id || idx} 
                          onClick={() => {
                            setShowNotifications(false);
                            if (notif.link) navigate(notif.link);
                          }}
                          style={{ 
                            padding: '12px 16px', 
                            borderBottom: '1px solid #f1f5f9', 
                            cursor: notif.link ? 'pointer' : 'default',
                            background: notif.isRead ? '#ffffff' : '#f8fafc'
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '13px', color: '#1e293b' }}>{notif.message}</p>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <button 
                className="user-profile-btn" 
                onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                aria-label="User profile menu"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div className="avatar">{user.name ? user.name[0].toUpperCase() : 'U'}</div>
                <div className="user-info">
                  <span className="name">{user.name || 'User'}</span>
                  <span className="role">{user.role || 'USER'}</span>
                </div>
              </button>

              {showProfileMenu && (
                <div className="profile-popover" role="menu" aria-orientation="vertical">
                  <div className="popover-header">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="popover-body">
                    <button 
                      className="popover-item" 
                      role="menuitem"
                      onClick={() => { setShowProfileMenu(false); setIsEditingProfile(true); }}
                    >
                      Edit Profile
                    </button>
                    <button 
                      className="popover-item" 
                      role="menuitem"
                      onClick={() => { setShowProfileMenu(false); setShowChangePassword(true); setPasswordStep(1); setOtp(''); setNewPassword(''); }}
                    >
                      Change Password
                    </button>
                    <button 
                      className="popover-item text-danger" 
                      role="menuitem"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button className="action-btn sign-out" onClick={handleSignOut}>
              Sign Out <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main id="main-content" className="admin-main">
          <div className="admin-content-scroll">
            <Outlet />
          </div>
        </main>

        <footer style={{ textAlign: 'center', padding: '0.75rem', color: '#64748b', fontSize: '0.8rem', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
          © 2026 Government of Andhra Pradesh. All rights reserved.
        </footer>
      </div>

      {showChangePassword && (
        <div 
          className="al-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-change-pwd-title"
          onKeyDown={(e) => { if (e.key === 'Escape') setShowChangePassword(false); }}
        >
          <div className="al-modal">
            <div className="al-modal-header">
              <h2 id="user-change-pwd-title">Change Password</h2>
              <button className="al-modal-close" aria-label="Close dialog" onClick={() => setShowChangePassword(false)}>×</button>
            </div>
            <div className="al-modal-body">
              <div className="al-form-group">
                <label htmlFor="ucp-email">Email Address</label>
                <input id="ucp-email" type="email" value={user.email} disabled className="al-input disabled" />
              </div>

              {passwordStep === 1 && (
                <p className="al-info-text">We will send a One-Time Password (OTP) to your email to verify this request.</p>
              )}

              {passwordStep === 2 && (
                <div className="al-form-group mt-16">
                  <label htmlFor="ucp-otp">Enter OTP</label>
                  <input 
                    id="ucp-otp"
                    type="text" 
                    value={otp} 
                    onChange={e => setOtp(e.target.value)} 
                    placeholder="Enter 6-digit OTP" 
                    className="al-input"
                  />
                </div>
              )}

              {passwordStep === 3 && (
                <div className="al-form-group mt-16">
                  <label htmlFor="ucp-pwd">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      id="ucp-pwd"
                      type="password" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="Enter new password" 
                      className="al-input"
                      style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                    />
                    <button 
                      type="button"
                      aria-label="Copy password to clipboard"
                      onClick={() => {
                        navigator.clipboard.writeText(newPassword);
                        alert('Password copied to clipboard!');
                      }}
                      style={{ 
                        position: 'absolute', 
                        right: '12px', 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--text-secondary, #64748b)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0
                      }}
                      title="Copy password"
                    >
                      <Copy size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="al-modal-footer">
              <button className="al-btn-secondary" onClick={() => setShowChangePassword(false)}>Cancel</button>
              {passwordStep === 1 && (
                <button className="al-btn-primary" onClick={handleSendOtp} disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send OTP'}
                </button>
              )}
              {passwordStep === 2 && (
                <button className="al-btn-primary" onClick={handleVerifyOtp} disabled={isSubmitting || !otp}>
                  {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                </button>
              )}
              {passwordStep === 3 && (
                <button className="al-btn-primary" onClick={handleChangePassword} disabled={isSubmitting || !newPassword}>
                  {isSubmitting ? 'Updating...' : 'Change Password'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {isEditingProfile && (
        <EditProfileModal 
          user={user}
          onClose={() => setIsEditingProfile(false)}
          onSuccess={() => setIsEditingProfile(false)}
        />
      )}
    </div>
  );
};

export default UserLayout;
