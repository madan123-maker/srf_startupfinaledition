import { API_BASE_URL } from '../config/api';
import React, { useState } from 'react';
import { X } from 'lucide-react';
import './CreateUserModal.css'; // Reusing the sleek styles

interface EditProfileModalProps {
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    state: user.state || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const userId = user.id || user._id;
      
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update local storage with new user info
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onSuccess();
        window.location.reload(); // Refresh to update layouts
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '400px' }}>
        {/* Header */}
        <div className="cum-header">
          <div>
            <h2>Edit Profile</h2>
            <p>Update your personal details below.</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="modal-alert error">{error}</div>}
        {successMsg && <div className="modal-alert success">✅ {successMsg}</div>}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="cum-form">
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
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>State / Region</label>
              <input
                type="text"
                name="state"
                placeholder="e.g. Karnataka"
                value={formData.state}
                onChange={handleChange}
              />
            </div>

            {/* Actions */}
            <div className="cum-actions" style={{ marginTop: '24px' }}>
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

export default EditProfileModal;
