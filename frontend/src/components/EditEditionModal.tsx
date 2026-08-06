import { API_BASE_URL } from '../config/api';
import React, { useState } from 'react';
import './CreateEditionModal.css';

export interface EditionData {
  _id: string;
  name: string;
  version: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

interface EditEditionModalProps {
  edition: EditionData;
  onClose: () => void;
  onSuccess: () => void;
}

const EditEditionModal: React.FC<EditEditionModalProps> = ({ edition, onClose, onSuccess }) => {
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    name: edition.name || '',
    version: edition.version || '',
    description: edition.description || '',
    startDate: formatDateForInput(edition.startDate),
    endDate: formatDateForInput(edition.endDate)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/editions/${edition._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update edition');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <h2 className="modal-title">Edit SRF Edition</h2>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Edition Name *</label>
              <input 
                type="text" 
                name="name" 
                placeholder="e.g. SRF 7.0" 
                required 
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group flex-1">
              <label>Version *</label>
              <input 
                type="text" 
                name="version" 
                placeholder="7.0" 
                required
                value={formData.version}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description / Subtitle</label>
            <textarea 
              name="description" 
              rows={3} 
              placeholder="e.g. States' Startup Ranking Framework 7th Edition"
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Start Date</label>
              <input 
                type="date" 
                name="startDate" 
                value={formData.startDate}
                onChange={handleChange}
              />
            </div>
            <div className="form-group flex-1">
              <label>End Date</label>
              <input 
                type="date" 
                name="endDate" 
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEditionModal;
