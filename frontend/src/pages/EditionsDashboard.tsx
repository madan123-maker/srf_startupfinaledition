import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import CreateEditionModal from '../components/CreateEditionModal';
import './EditionsDashboard.css';

interface Edition {
  _id: string;
  name: string;
  version: string;
  status: string;
  stats: {
    totalSubmissions: number;
    pending: number;
    approved: number;
    rejected: number;
    avgScore: number;
  };
}

const EditionsDashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const fetchEditions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/editions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEditions(data);
      }
    } catch (error) {
      console.error('Failed to fetch editions', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/editions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchEditions(); // Refresh list to reflect new status
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Failed to toggle status', error);
      alert('An error occurred while changing status.');
    }
  };

  const deleteEdition = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this edition? This item will be stored in the recycle bin for 30 days before permanent removal.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/editions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchEditions(); // Refresh list to remove deleted item
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete edition');
      }
    } catch (error) {
      console.error('Failed to delete edition', error);
      alert('An error occurred while deleting the edition.');
    }
  };

  useEffect(() => {
    fetchEditions();
  }, []);

  return (
    <div className="editions-dashboard">
      <div className="editions-header">
        <div className="header-text">
          <span className="badge">EDITIONS DASHBOARD</span>
          <h1>SRF Editions</h1>
          <p>Create and manage ranking framework editions. Click any edition to open its workspace.</p>
        </div>
        {isSuperAdmin && (
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Edition
          </button>
        )}
      </div>

      <div className="editions-grid">
        {loading ? (
          <p>Loading editions...</p>
        ) : (
          editions.map((edition) => (
            <div 
              key={edition._id} 
              className="edition-card cursor-pointer"
              onClick={() => window.location.href = `/admin/editions/${edition._id}`}
            >
              <div className="card-header">
                <div className="card-title">
                  <div className="icon-box">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                      <polyline points="2 12 12 17 22 12"></polyline>
                      <polyline points="2 17 12 22 22 17"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h3>{edition.name}</h3>
                    <p>States' Startup Ranking Framework...</p>
                  </div>
                </div>
                <div className={`status-badge ${edition.status.toLowerCase()}`}>
                  <span className="dot"></span> {edition.status === 'PUBLISHED' ? 'Live' : 'Draft'}
                </div>
              </div>

              <div className="card-stats">
                <div className="stat-item">
                  <span className="stat-value">{edition.stats.totalSubmissions}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value orange">{edition.stats.pending}</span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value green">{edition.stats.approved}</span>
                  <span className="stat-label">Approved</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value red">{edition.stats.rejected}</span>
                  <span className="stat-label">Rejected</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value purple">{typeof edition.stats.avgScore === 'number' ? edition.stats.avgScore.toFixed(1) : edition.stats.avgScore}</span>
                  <span className="stat-label">Avg Score</span>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="card-actions">
                  <button className="btn-secondary" onClick={(e) => e.stopPropagation()}><Edit size={14} /> Edit</button>
                  <button 
                    className="btn-secondary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(edition._id);
                    }}
                  >
                    {edition.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button 
                    className="btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEdition(edition._id);
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {isSuperAdmin && (
          <div className="create-new-card" onClick={() => setIsModalOpen(true)}>
            <div className="create-content">
              <Plus size={24} color="#64748b" />
              <span>Create New Edition</span>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateEditionModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchEditions();
          }} 
        />
      )}
    </div>
  );
};

export default EditionsDashboard;
