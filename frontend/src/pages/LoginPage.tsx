import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

import logoUrl from '../assets/logo.png';
import { API_BASE_URL } from '../config/api';

interface LoginPageProps {
  isAdminLogin: boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ isAdminLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, isAdminLogin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === 'SUPER_ADMIN' || data.user.role === 'ADMIN') {
        navigate('/admin-dashboard'); // To be implemented later
      } else {
        navigate('/user-dashboard'); // To be implemented later
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-color)' }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
        <button
          onClick={() => navigate('/')}
          aria-label="Back to landing page"
          style={{ position: 'absolute', top: '20px', left: '20px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </button>

        <div className="text-center" style={{ marginBottom: '32px', marginTop: '20px' }}>
          <div style={{ display: 'inline-block', marginBottom: '16px' }}>
            <img src={logoUrl} alt="AP Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '28px', color: 'var(--primary-color)' }}>
            {isAdminLogin ? 'ADMIN LOGIN' : 'User Login'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Sign in to access the SRF Management Platform
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  minWidth: '32px',
                  minHeight: '32px'
                }}
              >
                {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && (
            <div id="login-error" role="alert" aria-live="assertive" className="error-message" style={{ marginBottom: '16px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', marginTop: '16px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default LoginPage;
