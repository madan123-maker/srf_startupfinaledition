import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './DepartmentModal.css';

interface DepartmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  departmentToEdit?: any;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({ onClose, onSuccess, departmentToEdit }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (departmentToEdit) {
      setFormData({
        name: departmentToEdit.name || '',
        code: departmentToEdit.code || '',
        description: departmentToEdit.description || '',
      });
    }
  }, [departmentToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Force uppercase for code
    const processedValue = name === 'code' ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const isEdit = !!departmentToEdit;
      const url = isEdit 
        ? `${API_BASE_URL}/api/departments/${departmentToEdit._id}`
        : '${API_BASE_URL}/api/departments';
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save department');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dept-modal-overlay">
      <div className="dept-modal">
        <div className="dept-modal-header">
          <h2>{departmentToEdit ? 'Edit Department' : 'Add Department'}</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="dept-modal-body">
          {error && <div className="dept-error-banner">{error}</div>}
          
          <div className="dept-form-group">
            <label>Department Name <span className="req">*</span></label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="e.g. Department of Science & Technology"
              required 
            />
          </div>

          <div className="dept-form-group">
            <label>Department Code <span className="req">*</span></label>
            <input 
              type="text" 
              name="code" 
              value={formData.code} 
              onChange={handleChange} 
              placeholder="e.g. SNT"
              maxLength={10}
              required 
            />
            <span className="help-text">A short, unique uppercase identifier.</span>
          </div>

          <div className="dept-form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="Brief description of the department's role..."
              rows={3}
            />
          </div>

          <div className="dept-modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DepartmentModal;
