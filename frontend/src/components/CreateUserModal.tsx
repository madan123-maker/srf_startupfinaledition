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
        const res = await fetch('http://localhost:5001/api/departments', {
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
      const response = await fetch('http://localhost:5001/api/users/create-user', {
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

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        {/* Header */}
        <div className="cum-header">
          <div>
            <h2>Create User Account</h2>
            <p>Fill out the details to register a new user.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="modal-alert error">{error}</div>}
        {successMsg && <div className="modal-alert success">✅ {successMsg}</div>}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="cum-form">
            {/* Row 1: State + District */}
            <div className="cum-row">
              <div className="form-group">
                <label>State / UT</label>
                <select name="state" value={formData.state} onChange={handleChange} required>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                </select>
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
            <div className="cum-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Organization / Department</label>
                <select name="organization" value={formData.organization} onChange={handleChange} required>
                  <option value="">Select Department</option>
                  {departmentsList.map((d) => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 3: Email + Username */}
            <div className="cum-row">
              <div className="form-group">
                <label>Official Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="user.srf@dpiit.gov.in"
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
                  placeholder="e.g. user_jane"
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
                <span className="password-hint">A secure password will be auto-generated and emailed to the user.</span>
              </div>
            </div>

            {/* Actions */}
            <div className="cum-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateUserModal;
