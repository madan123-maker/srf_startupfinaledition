import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, Users, ShieldAlert } from 'lucide-react';
import './DataManagement.css';

interface SystemStats {
  editions: number;
  applications: number;
  registeredUsers: number;
  auditLogs: number;
}

const DataManagement: React.FC = () => {
  const [stats, setStats] = useState<SystemStats>({
    editions: 0,
    applications: 0,
    registeredUsers: 0,
    auditLogs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  
  const [editions, setEditions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedEdition, setSelectedEdition] = useState('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Custom Filters State
  const [filterUser, setFilterUser] = useState('all');
  const [filterEdition, setFilterEdition] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/data/stats`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch system stats', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchEditions = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/editions`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setEditions(data);
        }
      } catch (error) {
        console.error('Failed to fetch editions', error);
      }
    };

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Failed to fetch users', error);
      }
    };

    fetchStats();
    fetchEditions();
    fetchUsers();
  }, []);

  const handleDownload = async (endpoint: string, filename: string, overrideEditionId?: string) => {
    setDownloading(endpoint);
    try {
      const token = localStorage.getItem('token');
      
      let fetchUrl = `${API_BASE_URL}/api/data/export/${endpoint}`;
      const targetEdition = overrideEditionId !== undefined ? overrideEditionId : selectedEdition;
      if (endpoint === 'submissions' && targetEdition !== 'all') {
        fetchUrl += `?editionId=${targetEdition}`;
      }

      const response = await fetch(fetchUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to download data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Download failed: ${error.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleFilteredDownload = async () => {
    setDownloading('filtered');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterUser !== 'all') params.append('userId', filterUser);
      if (filterEdition !== 'all') params.append('editionId', filterEdition);
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`${API_BASE_URL}/api/data/export/filtered-submissions?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'No records found for selected filters.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filtered_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="data-mgmt-page">
      {/* Header Card */}
      <div className="dm-header-card">
        <span className="dm-badge">PLATFORM OPERATIONS</span>
        <h1>Data Management</h1>
        <p>Monitor database metrics, view raw system data, export collections, and perform database operations.</p>
      </div>

      {/* Metrics Row */}
      <div className="dm-metrics-row">
        <div className="dm-metric-card">
          <div className="dm-metric-label">EDITIONS</div>
          <div className="dm-metric-value">{loading ? '...' : stats.editions}</div>
        </div>
        <div className="dm-metric-card">
          <div className="dm-metric-label">APPLICATIONS</div>
          <div className="dm-metric-value">{loading ? '...' : stats.applications}</div>
        </div>
        <div className="dm-metric-card">
          <div className="dm-metric-label">REGISTERED USERS</div>
          <div className="dm-metric-value">{loading ? '...' : stats.registeredUsers}</div>
        </div>
        <div className="dm-metric-card">
          <div className="dm-metric-label">AUDIT LOGS</div>
          <div className="dm-metric-value">{loading ? '...' : stats.auditLogs}</div>
        </div>
      </div>

      {/* Custom Filtered Export Section */}
      <div className="dm-export-section" style={{ marginBottom: '24px' }}>
        <div className="dm-section-header">
          <h3>Custom Filtered Export (User, Edition & Status)</h3>
          <p>Filter data by specific Nodal Officer / User, Edition, and Approval Status (Approved, Rejected, Resubmission Required) to download a comprehensive Excel report.</p>
        </div>

        <div className="dm-filters-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Filter by User / Nodal Officer</label>
            <select 
              value={filterUser} 
              onChange={(e) => setFilterUser(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#ffffff', color: '#1e293b' }}
            >
              <option value="all">All Users / Nodal Officers</option>
              {users.filter(u => u.role === 'USER').map(u => (
                <option key={u._id} value={u._id}>
                  {u.name || u.email} ({u.state || u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Filter by Edition</label>
            <select 
              value={filterEdition} 
              onChange={(e) => setFilterEdition(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#ffffff', color: '#1e293b' }}
            >
              <option value="all">All Editions</option>
              {editions.map(ed => (
                <option key={ed._id} value={ed._id}>
                  {ed.name} (v{ed.version})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Filter by Status</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#ffffff', color: '#1e293b' }}
            >
              <option value="all">All Statuses</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="RESUBMISSION_REQUIRED">RESUBMISSION REQUIRED</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="DRAFT">DRAFT</option>
            </select>
          </div>
        </div>

        <button 
          className="dm-btn dm-btn-purple"
          onClick={handleFilteredDownload}
          disabled={downloading === 'filtered'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#4f46e5', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          <FileSpreadsheet size={18} />
          {downloading === 'filtered' ? 'Generating Filtered Excel Report...' : 'Download Filtered Excel Report'}
        </button>
      </div>

      {/* Global Exports Section */}
      <div className="dm-export-section">
        <div className="dm-section-header">
          <h3>Global Export & Downloads</h3>
          <p>Download full system data collections in Excel format.</p>
        </div>
        
        <div className="dm-buttons-row">
          <div className="dm-dropdown-container">
            <button 
              className="dm-btn dm-btn-green"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={downloading === 'submissions'}
            >
              <Download size={16} />
              {downloading === 'submissions' ? 'Downloading...' : 'Download Submissions'}
            </button>
            {isDropdownOpen && (
              <div className="dm-dropdown-menu">
                <div 
                  className="dm-dropdown-item" 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setSelectedEdition('all');
                    handleDownload('submissions', 'all_submissions.xlsx', 'all');
                  }}
                >
                  All Editions
                </div>
                {editions.map(ed => (
                  <div 
                    key={ed._id} 
                    className="dm-dropdown-item"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setSelectedEdition(ed._id);
                      handleDownload('submissions', `submissions_${ed._id}.xlsx`, ed._id);
                    }}
                  >
                    {ed.name} (v{ed.version})
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button 
            className="dm-btn dm-btn-purple"
            onClick={() => handleDownload('submissions', 'applications_report.xlsx')}
            disabled={downloading === 'submissions'}
          >
            <FileSpreadsheet size={16} />
            Applications Report (Excel)
          </button>
          
          <button 
            className="dm-btn dm-btn-blue"
            onClick={() => handleDownload('users', 'registered_users.xlsx')}
            disabled={downloading === 'users'}
          >
            <Users size={16} />
            Export Users (Excel)
          </button>
          
          <button 
            className="dm-btn dm-btn-orange"
            onClick={() => handleDownload('admins', 'system_admins.xlsx')}
            disabled={downloading === 'admins'}
          >
            <ShieldAlert size={16} />
            Export Admins (Excel)
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
