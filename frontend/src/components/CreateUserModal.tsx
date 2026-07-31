import { API_BASE_URL } from '../config/api';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import './CreateUserModal.css';

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AP_DISTRICTS = [
  'Alluri Sitharama Raju',
  'Anakapalli',
  'Annamayya',
  'Bapatla',
  'Chittoor',
  'Dr. B.R. Ambedkar Konaseema',
  'East Godavari',
  'Eluru',
  'Guntur',
  'Kakinada',
  'Krishna',
  'Kurnool',
  'Nandyal',
  'NTR District',
  'Palnadu',
  'Parvathipuram Manyam',
  'Prakasam',
  'Sri Potti Sriramulu Nellore',
  'Sri Sathya Sai',
  'Srikakulam',
  'Tirupati',
  'Visakhapatnam',
  'Vizianagaram',
  'West Godavari',
  'YSR (Kadapa)',
];

interface Department {
  _id: string;
  name: string;
  code: string;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    state: 'Andhra Pradesh',
    district: '',
    name: '',
    organization: '',
    email: '',
    username: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [departmentsList, setDepartmentsList] = useState<Department[]>([]);

  React.useEffect(() => {
    const fetchDeps = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/departments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setDepartmentsList(await res.json());
        }
      } catch (err) {}
    };
    fetchDeps();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate username from name
    if (name === 'name') {
      const autoUsername = 'user_' + value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      setFormData((prev) => ({ ...prev, name: value, username: autoUsername }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/users/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccessMsg(`User created! Credentials sent to ${formData.email}`);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
    >
      <div className="modal-box">
        {/* Header */}
        <div className="cum-header">
          <div>
            <h2 id="create-user-title">Create User Account</h2>
            <p>Fill out the details to register a new user.</p>
          </div>
          <button className="modal-close-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {error && <div className="modal-alert error" role="alert">{error}</div>}
        {successMsg && <div className="modal-alert success" role="status" aria-live="polite">✅ {successMsg}</div>}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="cum-form">
            {/* Row 1: State + District */}
            <div className="cum-row">
              <div className="form-group">
                <label htmlFor="cu-state">State / UT <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span></label>
                <select id="cu-state" name="state" value={formData.state} onChange={handleChange} required aria-required="true">
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="cu-district">District <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span></label>
                <select id="cu-district" name="district" value={formData.district} onChange={handleChange} required aria-required="true">
                  <option value="">Select District</option>
                  {AP_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Full Name + Organization */}
            <div className="cum-row">
              <div className="form-group">
                <label htmlFor="cu-name">Full Name <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span></label>
                <input
                  id="cu-name"
                  type="text"
                  name="name"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="cu-org">Organization / Department <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span></label>
                <select id="cu-org" name="organization" value={formData.organization} onChange={handleChange} required aria-required="true">
                  <option value="">Select Department</option>
                  {departmentsList.map((dep) => (
                    <option key={dep._id} value={dep.name}>{dep.name} ({dep.code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Email + Username */}
            <div className="cum-row">
              <div className="form-group">
                <label htmlFor="cu-email">Email Address <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span></label>
                <input
                  id="cu-email"
                  type="email"
                  name="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  aria-required="true"
                />
              </div>
              <div className="form-group">
                <label htmlFor="cu-username">Username <span aria-hidden="true" style={{ color: '#ef4444' }}>*</span></label>
                <input
                  id="cu-username"
                  type="text"
                  name="username"
                  placeholder="johndoe"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  aria-required="true"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="cum-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateUserModal;
