import React, { useState } from 'react';
import { X } from 'lucide-react';
import './CreateUserModal.css';

interface EditUserModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const DEPARTMENTS = [
  'DPIIT', 'Ministry of Commerce', 'SIDBI', 'Startup India Cell',
  'State Nodal Agency', 'District Industries Centre', 'Other',
];

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    organization: user.organization || '',
    state: user.state || '',
    district: user.district || '',
    role: user.role || 'USER',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      setSuccessMsg(`User updated successfully!`);
      setTimeout(() => {
        onSuccess();
      }, 1500);
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
            <h2>Edit User</h2>
            <p>Update information for {user.email}.</p>
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
                <input
                  type="text"
                  name="state"
                  placeholder="e.g. Karnataka"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>District</label>
                <input
                  type="text"
                  name="district"
                  placeholder="e.g. Bengaluru"
                  value={formData.district}
                  onChange={handleChange}
                />
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
                <select name="organization" value={formData.organization} onChange={handleChange}>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Email + Role */}
            <div className="cum-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select 
                  name="role" 
                  value={formData.role} 
                  onChange={handleChange}
                  disabled={currentUser.role !== 'SUPER_ADMIN'}
                  title={currentUser.role !== 'SUPER_ADMIN' ? 'Only Super Admins can change roles' : ''}
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="cum-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditUserModal;
