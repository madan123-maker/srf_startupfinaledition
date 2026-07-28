import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../pages/EditionsDashboard.css';

interface PublicEdition {
  _id: string;
  name: string;
  version: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}

const UserDashboard: React.FC = () => {
  const [editions, setEditions] = useState<PublicEdition[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPublicEditions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${API_BASE_URL}/api/editions/public', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEditions(data);
      }
    } catch (error) {
      console.error('Failed to fetch public editions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicEditions();
    
    // Poll every 5 seconds to update dynamically if admin publishes/unpublishes
    const intervalId = setInterval(() => {
      fetchPublicEditions();
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="editions-dashboard">
      <div className="editions-header">
        <div className="header-text">
          <span className="badge">STATE PORTAL</span>
          <h1>Available SRF Editions</h1>
          <p>Select an active Startup Ranking Framework edition below to begin or continue your state's submission.</p>
        </div>
      </div>

      <div className="editions-grid">
        {loading ? (
          <p>Loading available editions...</p>
        ) : editions.length === 0 ? (
          <div style={{ padding: '40px', backgroundColor: 'white', borderRadius: '12px', width: '100%', textAlign: 'center' }}>
            <h3>No active editions available.</h3>
            <p style={{ color: '#64748b' }}>Please check back later or contact the DPIIT administrator.</p>
          </div>
        ) : (
          editions.map((edition) => (
            <div 
              key={edition._id} 
              className="edition-card" 
              style={{ cursor: 'pointer', transition: 'transform 0.2s' }} 
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} 
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              onClick={() => navigate(`/user-dashboard/workspace/${edition._id}`)}
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
                    <p>Version {edition.version}</p>
                  </div>
                </div>
                <div className={`status-badge published`}>
                  <span className="dot"></span> Open for Submission
                </div>
              </div>

              <div style={{ marginBottom: '20px', fontSize: '14px', color: '#475569', minHeight: '60px' }}>
                {edition.description || 'States Startup Ranking Framework Evaluation'}
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Enter Workspace
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
