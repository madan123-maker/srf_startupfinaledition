import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import DepartmentModal from '../components/DepartmentModal';
import './ManageDepartments.css';

interface Department {
  _id: string;
  name: string;
  code: string;
  description: string;
  createdAt: string;
}

const ManageDepartments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="departments-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: '#64748b' }}>Only Super Admins have permission to manage departments.</p>
      </div>
    );
  }
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
        setFilteredDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDepartments(departments);
    } else {
      const lowerQ = searchQuery.toLowerCase();
      setFilteredDepartments(
        departments.filter(d => 
          d.name.toLowerCase().includes(lowerQ) || 
          d.code.toLowerCase().includes(lowerQ) ||
          (d.description && d.description.toLowerCase().includes(lowerQ))
        )
      );
    }
  }, [searchQuery, departments]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/departments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        fetchDepartments();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department', error);
    }
  };

  const openAddModal = () => {
    setDepartmentToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setDepartmentToEdit(dept);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    fetchDepartments();
  };

  return (
    <div className="manage-dept-page">
      <div className="md-header-card">
        <div className="md-header-top">
          <div>
            <span className="md-badge">SUPER ADMIN VIEW</span>
            <h1>Manage Departments</h1>
            <p>Create and manage governmental departments and organizations participating in the SRF ranking.</p>
          </div>
          <button className="md-btn-add" onClick={openAddModal}>
            <Plus size={16} /> Add Department
          </button>
        </div>

        <div className="md-search-row">
          <div className="md-search-box">
            <input 
              type="text" 
              placeholder="Search departments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="md-table-card">
        <div className="md-table-wrapper">
          <table className="md-table">
            <thead>
              <tr>
                <th>DEPARTMENT NAME</th>
                <th>CODE</th>
                <th>DESCRIPTION</th>
                <th>CREATED DATE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="md-empty">Loading departments...</td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="md-empty">No departments found.</td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept._id}>
                    <td>
                      <span className="md-dept-name">{dept.name}</span>
                    </td>
                    <td>
                      <span className="md-dept-code">{dept.code}</span>
                    </td>
                    <td>
                      <span className="md-dept-desc">{dept.description || '—'}</span>
                    </td>
                    <td>
                      <span className="md-dept-date">
                        {new Date(dept.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      <div className="md-actions">
                        <button className="md-btn-edit" onClick={() => openEditModal(dept)}>
                          <Edit2 size={14} /> Edit
                        </button>
                        <button className="md-btn-delete" onClick={() => handleDelete(dept._id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <DepartmentModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleModalSuccess} 
          departmentToEdit={departmentToEdit} 
        />
      )}
    </div>
  );
};

export default ManageDepartments;
