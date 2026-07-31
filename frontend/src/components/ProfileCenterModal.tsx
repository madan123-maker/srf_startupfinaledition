import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  User as UserIcon, 
  Sliders, 
  Sparkles,
  Key,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import './ProfileCenterModal.css';

interface ProfileCenterModalProps {
  user: any;
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
}

const ProfileCenterModal: React.FC<ProfileCenterModalProps> = ({ user, onClose, onSuccess }) => {
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  
  // Profile Form State
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '+91 98765 43210',
    state: user.state || 'Andhra Pradesh',
    district: user.district || 'Visakhapatnam',
    organization: user.organization || 'SRF Directorate',
    designation: user.designation || 'Senior Startup Evaluator',
    employeeId: user.employeeId || 'SRF-EV-2026',
    aboutMe: user.aboutMe || 'Dedicated to evaluating startup growth policies and compliance metrics.',
    department: user.department || 'Industries & Commerce Dept',
    avatarUrl: user.avatarUrl || ''
  });

  // Password / Security State
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStep, setPasswordStep] = useState<1 | 2 | 3>(1);
  const [passwordStrength, setPasswordStrength] = useState<'Weak' | 'Medium' | 'Strong'>('Weak');

  // Preferences State
  const [preferences, setPreferences] = useState({
    theme: user.preferences?.theme || 'Light',
    emailAlerts: user.preferences?.emailAlerts ?? true,
    smsAlerts: user.preferences?.smsAlerts ?? false,
    systemNotifications: user.preferences?.systemNotifications ?? true,
    language: user.preferences?.language || 'English (US)',
    timezone: user.preferences?.timezone || 'UTC+05:30 (IST)',
    autoSave: user.preferences?.autoSave ?? true
  });

  // Status & Feedback States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if initial data has been modified
  useEffect(() => {
    const isProfileChanged = 
      formData.name !== (user.name || '') ||
      formData.email !== (user.email || '') ||
      formData.phone !== (user.phone || '+91 98765 43210') ||
      formData.state !== (user.state || 'Andhra Pradesh') ||
      formData.district !== (user.district || 'Visakhapatnam') ||
      formData.organization !== (user.organization || 'SRF Directorate') ||
      formData.designation !== (user.designation || 'Senior Startup Evaluator') ||
      formData.employeeId !== (user.employeeId || 'SRF-EV-2026') ||
      formData.aboutMe !== (user.aboutMe || 'Dedicated to evaluating startup growth policies and compliance metrics.') ||
      formData.avatarUrl !== (user.avatarUrl || '');

    const isPrefChanged = JSON.stringify(preferences) !== JSON.stringify({
      theme: user.preferences?.theme || 'Light',
      emailAlerts: user.preferences?.emailAlerts ?? true,
      smsAlerts: user.preferences?.smsAlerts ?? false,
      systemNotifications: user.preferences?.systemNotifications ?? true,
      language: user.preferences?.language || 'English (US)',
      timezone: user.preferences?.timezone || 'UTC+05:30 (IST)',
      autoSave: user.preferences?.autoSave ?? true
    });

    setIsDirty(isProfileChanged || isPrefChanged);
  }, [formData, preferences, user]);

  // Evaluate password strength
  useEffect(() => {
    const pwd = securityData.newPassword;
    if (!pwd) {
      setPasswordStrength('Weak');
      return;
    }
    if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
      setPasswordStrength('Strong');
    } else if (pwd.length >= 6) {
      setPasswordStrength('Medium');
    } else {
      setPasswordStrength('Weak');
    }
  }, [securityData.newPassword]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle avatar image selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setError('Image file size should be less than 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
        setIsDirty(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Profile / Preferences Submit
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      const userId = user.id || user._id;

      const payload = {
        ...formData,
        preferences
      };

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      const updatedUser = data.user || { ...user, ...payload };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSuccessMsg('Profile Center updated successfully!');
      setIsDirty(false);

      setTimeout(() => {
        onSuccess(updatedUser);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  // Password Update Handling via OTP
  const handleSendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        setPasswordStep(2);
        setSuccessMsg('OTP sent to your email address!');
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to send OTP');
      }
    } catch (e) {
      setError('Failed to send verification OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndChangePwd = async () => {
    if (!securityData.otp) return setError('Please enter OTP');
    if (!securityData.newPassword) return setError('Please enter new password');
    if (securityData.newPassword !== securityData.confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          otp: securityData.otp,
          newPassword: securityData.newPassword
        })
      });
      if (res.ok) {
        setSuccessMsg('Password updated successfully! Please re-login.');
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
        }, 1500);
      } else {
        const err = await res.json();
        setError(err.error || 'Password change failed');
      }
    } catch (e) {
      setError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Compute initials
  const initials = (formData.name || user.name || 'Admin')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const userRoleDisplay = user.role === 'SUPER_ADMIN' ? 'Super Admin' : (user.role === 'ADMIN' ? 'Admin' : 'User');

  return (
    <div 
      className="pc-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-center-title"
    >
      <div className="pc-modal">
        {/* Modal Header Bar */}
        <div className="pc-modal-header">
          <div className="flex items-center gap-2">
            <Sparkles className="pc-header-icon" size={20} />
            <h2 id="profile-center-title" className="pc-title">Profile Center</h2>
          </div>
          <button className="pc-close-btn" onClick={onClose} aria-label="Close Profile Center">
            <X size={20} />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="pc-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="pc-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Split Content Container */}
        <div className="pc-body">
          {/* Left Panel (30%) */}
          <aside className="pc-left-panel">
            <div className="pc-avatar-container">
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="User Avatar" className="pc-avatar-img" />
              ) : (
                <div className="pc-avatar-initials">{initials}</div>
              )}
              <button 
                type="button" 
                className="pc-avatar-upload-btn" 
                onClick={() => fileInputRef.current?.click()}
                title="Upload avatar photo"
              >
                <Camera size={14} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </div>

            <h3 className="pc-user-name">{formData.name || user.name || 'Admin'}</h3>
            <div className="pc-role-badge">{userRoleDisplay}</div>

            <div className="pc-meta-list">
              <div className="pc-meta-item">
                <Building size={14} className="pc-meta-icon" />
                <span>{formData.department}</span>
              </div>
              <div className="pc-meta-item">
                <span className="pc-status-dot active"></span>
                <span>Account Status: <strong>Active</strong></span>
              </div>
              <div className="pc-meta-item">
                <Clock size={14} className="pc-meta-icon" />
                <span>Member Since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2025'}</span>
              </div>
            </div>

            {/* Mini Statistics Cards */}
            <div className="pc-stats-grid">
              {isSuperAdmin ? (
                <>
                  <div className="pc-stat-card">
                    <div className="pc-stat-value blue">Full</div>
                    <div className="pc-stat-label">Platform Access</div>
                  </div>
                  <div className="pc-stat-card">
                    <div className="pc-stat-value orange">All</div>
                    <div className="pc-stat-label">Editions Managed</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="pc-stat-card">
                    <div className="pc-stat-value blue">—</div>
                    <div className="pc-stat-label">Applications Reviewed</div>
                  </div>
                  <div className="pc-stat-card">
                    <div className="pc-stat-value orange">—</div>
                    <div className="pc-stat-label">Pending Reviews</div>
                  </div>
                </>
              )}
              <div className="pc-stat-card full-width">
                <div className="pc-stat-label">Last Login</div>
                <div className="pc-stat-subvalue">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </aside>

          {/* Right Panel (70%) */}
          <main className="pc-right-panel">
            {/* Tab Header Navigation */}
            <nav className="pc-tabs-header">
              <button 
                type="button"
                className={`pc-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <UserIcon size={16} /> Profile
              </button>
              <button 
                type="button"
                className={`pc-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <ShieldCheck size={16} /> Security
              </button>
              {!isSuperAdmin && (
                <button 
                  type="button"
                  className={`pc-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preferences')}
                >
                  <Sliders size={16} /> Preferences
                </button>
              )}
            </nav>

            {/* Tab Contents */}
            <div className="pc-tab-content">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <form className="pc-form-grid">
                  <div className="pc-form-group col-2">
                    <label>Full Name <span className="text-red">*</span></label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
                      placeholder="Enter full name"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group col-2">
                    <label>Email Address <span className="text-red">*</span></label>
                    <input 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
                      placeholder="user@srf.gov.in"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group">
                    <label>Phone Number</label>
                    <input 
                      type="text" 
                      value={formData.phone} 
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} 
                      placeholder="+91 98765 43210"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group">
                    <label>Designation</label>
                    <input 
                      type="text" 
                      value={formData.designation} 
                      onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))} 
                      placeholder="e.g. Senior Evaluator"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group">
                    <label>State / Region</label>
                    <input 
                      type="text" 
                      value={formData.state} 
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))} 
                      placeholder="e.g. Andhra Pradesh"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group">
                    <label>District</label>
                    <input 
                      type="text" 
                      value={formData.district} 
                      onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))} 
                      placeholder="e.g. Visakhapatnam"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group">
                    <label>Organization</label>
                    <input 
                      type="text" 
                      value={formData.organization} 
                      onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))} 
                      placeholder="e.g. SRF Directorate"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group">
                    <label>Employee ID</label>
                    <input 
                      type="text" 
                      value={formData.employeeId} 
                      onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))} 
                      placeholder="e.g. SRF-EV-2026"
                      className="pc-input"
                    />
                  </div>

                  <div className="pc-form-group full-width">
                    <label>About Me</label>
                    <textarea 
                      rows={3} 
                      value={formData.aboutMe} 
                      onChange={(e) => setFormData(prev => ({ ...prev, aboutMe: e.target.value }))} 
                      placeholder="Brief description about your role or specialization..."
                      className="pc-textarea"
                    />
                  </div>

                  {/* Read-Only Info */}
                  <div className="pc-readonly-box full-width">
                    <div className="pc-readonly-item">
                      <span className="label">Assigned Role:</span>
                      <span className="value">{userRoleDisplay}</span>
                    </div>
                    <div className="pc-readonly-item">
                      <span className="label">Account Created:</span>
                      <span className="value">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                    <div className="pc-readonly-item">
                      <span className="label">System Permissions:</span>
                      <span className="value text-green">
                        {isSuperAdmin
                          ? 'Full Platform Access — Super Administrator'
                          : user.role === 'ADMIN'
                          ? 'Admin Access Granted'
                          : 'User Access Granted'}
                      </span>
                    </div>
                  </div>
                </form>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="pc-security-panel">
                  <div className="pc-security-card">
                    <h4><Key size={18} /> Password & Authentication</h4>
                    <p className="subtext">Manage your password settings and authorization state.</p>

                    {passwordStep === 1 && (
                      <div className="pc-form-grid mt-4">
                        <div className="pc-form-group full-width">
                          <label>Email Address</label>
                          <input type="email" value={user.email} disabled className="pc-input disabled" />
                        </div>
                        <p className="pc-info-text">
                          To update your password securely, we will dispatch a verification OTP to your registered email.
                        </p>
                        <button type="button" className="pc-btn-secondary" onClick={handleSendOtp} disabled={loading}>
                          {loading ? 'Dispatching OTP...' : 'Send Verification OTP'}
                        </button>
                      </div>
                    )}

                    {passwordStep === 2 && (
                      <div className="pc-form-grid mt-4">
                        <div className="pc-form-group full-width">
                          <label>Enter 6-Digit OTP</label>
                          <input 
                            type="text" 
                            value={securityData.otp} 
                            onChange={(e) => setSecurityData(prev => ({ ...prev, otp: e.target.value }))} 
                            placeholder="Enter 6-digit OTP code"
                            className="pc-input"
                          />
                        </div>

                        <div className="pc-form-group col-2">
                          <label>New Password</label>
                          <div className="pc-input-wrapper">
                            <input 
                              type={showNewPassword ? 'text' : 'password'} 
                              value={securityData.newPassword} 
                              onChange={(e) => setSecurityData(prev => ({ ...prev, newPassword: e.target.value }))} 
                              placeholder="Enter new password"
                              className="pc-input"
                            />
                            <button 
                              type="button" 
                              className="pc-eye-btn" 
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {securityData.newPassword && (
                            <div className={`pc-pwd-meter ${passwordStrength.toLowerCase()}`}>
                              Strength: <strong>{passwordStrength}</strong>
                            </div>
                          )}
                        </div>

                        <div className="pc-form-group col-2">
                          <label>Confirm Password</label>
                          <input 
                            type="password" 
                            value={securityData.confirmPassword} 
                            onChange={(e) => setSecurityData(prev => ({ ...prev, confirmPassword: e.target.value }))} 
                            placeholder="Re-enter new password"
                            className="pc-input"
                          />
                        </div>

                        <div className="full-width flex justify-end gap-3 mt-4">
                          <button type="button" className="pc-btn-outline" onClick={() => setPasswordStep(1)}>
                            Back
                          </button>
                          <button type="button" className="pc-btn-primary" onClick={handleVerifyOtpAndChangePwd} disabled={loading}>
                            {loading ? 'Updating Password...' : 'Update Password'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="pc-preferences-panel">
                  {/* Theme Preference */}
                  <div className="pc-pref-section">
                    <h4>Interface Theme</h4>
                    <div className="pc-theme-selector">
                      {['Light', 'Dark', 'System'].map((t) => (
                        <button 
                          key={t}
                          type="button" 
                          className={`pc-theme-card ${preferences.theme === t ? 'active' : ''}`}
                          onClick={() => setPreferences(prev => ({ ...prev, theme: t }))}
                        >
                          <span className="title">{t} Theme</span>
                          {preferences.theme === t && <Check size={16} className="check-icon" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notifications Preferences */}
                  <div className="pc-pref-section">
                    <h4>Notification Settings</h4>
                    <div className="pc-toggle-list">
                      <label className="pc-toggle-item">
                        <div>
                          <span className="title">Email Alerts</span>
                          <span className="desc">Receive instant email notifications for task evaluations.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={preferences.emailAlerts} 
                          onChange={(e) => setPreferences(prev => ({ ...prev, emailAlerts: e.target.checked }))} 
                        />
                      </label>

                      <label className="pc-toggle-item">
                        <div>
                          <span className="title">SMS Notifications</span>
                          <span className="desc">Receive SMS updates for high priority tasks.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={preferences.smsAlerts} 
                          onChange={(e) => setPreferences(prev => ({ ...prev, smsAlerts: e.target.checked }))} 
                        />
                      </label>

                      <label className="pc-toggle-item">
                        <div>
                          <span className="title">System In-App Alerts</span>
                          <span className="desc">Show popup alerts on the dashboard toolbar.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={preferences.systemNotifications} 
                          onChange={(e) => setPreferences(prev => ({ ...prev, systemNotifications: e.target.checked }))} 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Localization Preferences */}
                  <div className="pc-pref-section">
                    <h4>Regional & Localization</h4>
                    <div className="pc-form-grid">
                      <div className="pc-form-group col-2">
                        <label>Language</label>
                        <select 
                          value={preferences.language} 
                          onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                          className="pc-select"
                        >
                          <option value="English (US)">English (US)</option>
                          <option value="Telugu">Telugu</option>
                          <option value="Hindi">Hindi</option>
                          <option value="Kannada">Kannada</option>
                        </select>
                      </div>

                      <div className="pc-form-group col-2">
                        <label>Timezone</label>
                        <select 
                          value={preferences.timezone} 
                          onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                          className="pc-select"
                        >
                          <option value="UTC+05:30 (IST)">UTC+05:30 (IST)</option>
                          <option value="UTC+00:00 (GMT)">UTC+00:00 (GMT)</option>
                          <option value="UTC-05:00 (EST)">UTC-05:00 (EST)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Modal Footer Bar */}
        <div className="pc-modal-footer">
          <button type="button" className="pc-btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            type="button" 
            className="pc-btn-primary" 
            onClick={() => handleSaveProfile()} 
            disabled={!isDirty || loading}
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCenterModal;
