import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ChevronLeft, FileText, Download, Trash2 } from 'lucide-react';
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

  const [metrics, setMetrics] = useState<{
    total: number | string;
    pending: number | string;
    approved: number | string;
    rejected: number | string;
    additionalDocs: number | string;
  }>({
    total: '-',
    pending: '-',
    approved: '-',
    rejected: '-',
    additionalDocs: '-'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      // Auth guard — redirect if no token
      if (!token) {
        navigate('/admin-login');
        return;
      }

      // Fetch Edition Details
      const editionRes = await fetch(`${API_BASE_URL}/api/editions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (editionRes.status === 401) {
        navigate('/admin-login');
        return;
      }

      if (editionRes.ok) {
        setEdition(await editionRes.json());
      } else {
        console.error('Failed to fetch edition, status:', editionRes.status);
      }

      // Fetch Submissions
      const subRes = await fetch(`${API_BASE_URL}/api/submissions/edition/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmissions(subData);
        
        // Calculate metrics
        let pending = 0, approved = 0, rejected = 0;
        
        subData.forEach((s: Submission) => {
          if (s.status === 'UNDER_REVIEW' || s.status === 'SUBMITTED') pending++;
          if (s.status === 'APPROVED') approved++;
          if (s.status === 'REJECTED') rejected++;
        });
        
        setMetrics({
          total: subData.length,
          pending,
          approved,
          rejected,
          additionalDocs: 0
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

  const handleDownloadApprovedDocs = async (submissionId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch submission data');
      const sub = await res.json();

      const filesToDownload: { fileName: string; fileUrl: string }[] = [];

      if (sub.responses && Array.isArray(sub.responses)) {
        for (const resp of sub.responses) {
          if (resp.fieldResponses) {
            for (const f of resp.fieldResponses) {
              if (f.fileUrl && (f.evaluationStatus === 'APPROVED' || !f.evaluationStatus)) {
                filesToDownload.push({ fileName: f.fileName || 'document.pdf', fileUrl: f.fileUrl });
              }
            }
          }
          if (resp.supportingDocumentResponses) {
            for (const docResp of resp.supportingDocumentResponses) {
              if (docResp.files) {
                for (const file of docResp.files) {
                  if (file.fileUrl && (file.evaluationStatus === 'APPROVED' || !file.evaluationStatus)) {
                    filesToDownload.push({ fileName: file.fileName || 'document.pdf', fileUrl: file.fileUrl });
                  }
                }
              }
            }
          }
        }
      }

      if (filesToDownload.length === 0) {
        alert('No documents found for this application to download.');
        return;
      }

      for (const file of filesToDownload) {
        const fullUrl = file.fileUrl.startsWith('http') ? file.fileUrl : `${API_BASE_URL}${file.fileUrl}`;
        const a = document.createElement('a');
        a.href = fullUrl;
        a.download = file.fileName;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Failed to download documents: ' + err.message);
    }
  };

  const handleDeleteApplication = async (submissionId: string) => {
    if (!window.confirm('Are you sure you want to move this application to the Recycle Bin?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        alert('Application moved to Recycle Bin successfully.');
        setSubmissions(prev => prev.filter(s => s._id !== submissionId));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete application');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      alert('Failed to delete application: ' + err.message);
    }
  };

  if (loading) {
    return <div className="workspace-loading">Loading Workspace...</div>;
  }

  if (!edition) {
    return (
      <div className="workspace-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Edition not found</div>
        <div style={{ fontSize: '14px', color: '#64748b' }}>The edition may have been deleted or you may not have permission to view it.</div>
        <button
          style={{ marginTop: '12px', padding: '10px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => navigate('/admin/editions')}
        >
          Back to Editions
        </button>
      </div>
    );
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
                      <th>Completion</th>
                      <th>Submitted Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubmissions.map((sub) => {
                      const isConsolidated = sub._id.startsWith('consolidated-') || (sub as any).isConsolidated;
                      const formattedDate = new Date(sub.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      });

                      return (
                        <tr key={sub._id} style={isConsolidated ? { backgroundColor: '#ffffff' } : {}}>
                          <td style={{ fontWeight: 600, color: '#1e293b' }}>
                            {sub.stateName}
                          </td>
                          <td>
                            {isConsolidated ? (
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>Consolidated SRF Edition</span>
                            ) : (
                              sub.userId ? (
                                <div>
                                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{sub.userId.name}</div>
                                  <div style={{ fontSize: '12px', color: '#64748b' }}>{sub.userId.email}</div>
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>N/A</span>
                              )
                            )}
                          </td>
                          <td>
                            <span className="status-badge" style={{ backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 600, padding: '4px 10px', borderRadius: '6px' }}>
                              {isConsolidated ? 'Edition Consolidated' : sub.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: '#16a34a' }}>Completed</span>
                          </td>
                          <td style={{ color: '#475569', fontSize: '13px' }}>{formattedDate}</td>
                          <td>
                            <div className="action-buttons-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button 
                                className="btn-secondary btn-sm"
                                onClick={() => navigate(`/admin/editions/${edition._id}/submissions/${sub._id}`)}
                                title="View Application"
                                style={{ fontWeight: 600 }}
                              >
                                View
                              </button>
                              <button 
                                className="btn-secondary btn-sm"
                                title="Download Approved Documents"
                                onClick={() => handleDownloadApprovedDocs(sub._id)}
                              >
                                <Download size={14} />
                              </button>
                              {isSuperAdmin && !isConsolidated && (
                                <button 
                                  className="btn-secondary btn-sm"
                                  style={{ color: '#ef4444', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                                  title="Delete Application (Send to Recycle Bin)"
                                  onClick={() => handleDeleteApplication(sub._id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
