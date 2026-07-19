import React, { useState } from 'react';
import { X } from 'lucide-react';
import './CreateAdminModal.css';

interface CreateAdminModalProps {
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

const DEPARTMENTS = [
  'DPIIT', 'Ministry of Commerce', 'SIDBI', 'Startup India Cell',
  'State Nodal Agency', 'District Industries Centre', 'Other',
];

const CreateAdminModal: React.FC<CreateAdminModalProps> = ({ onClose, onSuccess }) => {
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate username from name
    if (name === 'name') {
      const autoUsername = 'admin_' + value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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
      const response = await fetch('http://localhost:5001/api/users/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      setSuccessMsg(`Admin created! Credentials sent to ${formData.email}`);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {/* Header */}
        <div className="cam-header">
          <div>
            <h2>Create Admin Account</h2>
            <p>Fill out the details to register a new administrator.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="modal-alert error">{error}</div>}
        {successMsg && <div className="modal-alert success">✅ {successMsg}</div>}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="cam-form">
            {/* Row 1: State + District */}
            <div className="cam-row">
              <div className="form-group">
                <label>State / UT</label>
                <input
                  type="text"
                  value="Andhra Pradesh"
                  readOnly
                  className="input-frozen"
                />
              </div>
              <div className="form-group">
                <label>District</label>
                <select name="district" value={formData.district} onChange={handleChange} required>
                  <option value="">Select District</option>
                  {AP_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Full Name + Organization */}
            <div className="cam-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Organization / Department</label>
                <select name="organization" value={formData.organization} onChange={handleChange} required>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Email + Username */}
            <div className="cam-row">
              <div className="form-group">
                <label>Official Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="admin.srf@dpiit.gov.in"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="e.g. admin_john"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Row 4: Password (system generated) */}
            <div className="form-group">
              <label>Password</label>
              <div className="password-tag-box">
                <span className="password-tag">System Generated</span>
                <span className="password-hint">A secure password will be auto-generated and emailed to the admin.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="cam-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateAdminModal;
