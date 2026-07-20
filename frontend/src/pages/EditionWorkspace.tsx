import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ChevronLeft, FileText, Download, Edit } from 'lucide-react';
import SchemaEditor from '../components/SchemaEditor/SchemaEditor';
import './EditionWorkspace.css';

interface Edition {
  _id: string;
  name: string;
  version: string;
  description: string;
  status: string;
}

interface Submission {
  _id: string;
  stateName: string;
  status: string;
  totalScore: number;
  createdAt: string;
  userId?: {
    name: string;
    email: string;
  };
}

const EditionWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [edition, setEdition] = useState<Edition | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('applications');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Role check for Schema Editor
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    additionalDocs: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch Edition Details
      const editionRes = await fetch(`http://localhost:5001/api/editions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (editionRes.ok) {
        setEdition(await editionRes.json());
      }

      // Fetch Submissions
      const subRes = await fetch(`http://localhost:5001/api/submissions/edition/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(subData);
        
        // Calculate metrics
        let pending = 0, approved = 0, rejected = 0;
        subData.forEach((s: Submission) => {
          if (s.status === 'UNDER_REVIEW') pending++;
          if (s.status === 'APPROVED') approved++;
          if (s.status === 'REJECTED') rejected++;
        });
        
        setMetrics({
          total: subData.length,
          pending,
          approved,
          rejected,
          additionalDocs: 0 // Placeholder as it's not in the model yet
        });
      }
    } catch (error) {
      console.error('Failed to fetch workspace data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // Derive filtered submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch = sub.stateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub._id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? sub.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="workspace-loading">Loading Workspace...</div>;
  }

  if (!edition) {
    return <div className="workspace-loading">Edition not found.</div>;
  }

  return (
    <div className="edition-workspace">
      {/* Top Header Card */}
      <div className="workspace-header-card">
        <div className="workspace-title-row">
          <div>
            <span className="badge">APPLICATION WORKSPACE</span>
            <h1>{edition.name} Workspace</h1>
            <p>{edition.description || `States' Startup Ranking Framework ${edition.version}`}</p>
          </div>
          <div className="workspace-actions">
            <span className="last-updated">Updated: {new Date().toLocaleTimeString()}</span>
            <button className="btn-secondary" onClick={fetchData}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn-secondary" onClick={() => navigate('/admin/editions')}>
              <ChevronLeft size={16} /> All Editions
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="workspace-tabs">
          <button 
            className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            Applications
          </button>
          {isSuperAdmin && (
            <button 
              className={`tab-btn ${activeTab === 'schema' ? 'active' : ''}`}
              onClick={() => setActiveTab('schema')}
            >
              Schema Editor
            </button>
          )}
        </div>
      </div>

      {activeTab === 'applications' && (
        <div className="workspace-content">
          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-value blue">{metrics.total}</span>
              <span className="stat-label">Total Applications</span>
            </div>
            <div className="stat-card">
              <span className="stat-value orange">{metrics.pending}</span>
              <span className="stat-label">Pending Review</span>
            </div>
            <div className="stat-card">
              <span className="stat-value green">{metrics.approved}</span>
              <span className="stat-label">Approved</span>
            </div>
            <div className="stat-card">
              <span className="stat-value red">{metrics.rejected}</span>
              <span className="stat-label">Rejected</span>
            </div>
            <div className="stat-card">
              <span className="stat-value blue">{metrics.additionalDocs}</span>
              <span className="stat-label">Additional Docs</span>
            </div>
          </div>

          {/* Applications Table Area */}
          <div className="applications-container">
            <div className="app-filters">
              <h3 className="app-title">Applications</h3>
              <div className="filter-controls">
                <div className="search-box">
                  <input 
                    type="text" 
                    placeholder="Search state / ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <div className="applications-list">
              {filteredSubmissions.length === 0 ? (
                <div className="empty-state">
                  <FileText size={48} color="#cbd5e1" />
                  <h4>No applications found</h4>
                  <p>No applications match the current filters.</p>
                </div>
              ) : (
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>State</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Submitted Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub._id}>
                        <td>{sub.stateName}</td>
                        <td>
                          {sub.userId ? (
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{sub.userId.name}</div>
                              <div style={{ fontSize: '12px', color: '#64748b' }}>{sub.userId.email}</div>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>N/A</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-badge ${sub.status.toLowerCase()}`}>
                            {sub.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold', color: '#4338ca', backgroundColor: '#e0e7ff', padding: '4px 10px', borderRadius: '12px', display: 'inline-block', fontSize: '13px' }}>
                            {sub.totalScore || 0} pts
                          </div>
                        </td>
                        <td>{new Date(sub.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons-group" style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="btn-secondary btn-sm"
                              onClick={() => navigate(`/admin/editions/${edition._id}/submissions/${sub._id}`)}
                              title="View"
                            >
                              View
                            </button>
                            <button 
                              className="btn-secondary btn-sm"
                              title="Download"
                              onClick={() => alert('Download starting...')}
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schema' && isSuperAdmin && (
        <div className="workspace-content" style={{ padding: 0, background: 'transparent', boxShadow: 'none' }}>
          <SchemaEditor editionId={edition._id} editionName={edition.name} />
        </div>
      )}
    </div>
  );
};

export default EditionWorkspace;
