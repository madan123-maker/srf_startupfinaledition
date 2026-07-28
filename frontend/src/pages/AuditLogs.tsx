import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Search, Download } from 'lucide-react';
import './AuditLogs.css';

interface AuditLog {
  _id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="audit-logs-container" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: '#64748b' }}>Only Super Admins have permission to view Audit Logs.</p>
      </div>
    );
  }

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    admin: 'All Admins / Reviewers',
    district: 'All Districts',
    action: 'All Actions',
    startDate: '',
    endDate: '',
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query string
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.action !== 'All Actions') params.append('action', filters.action);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/api/audit-logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters.action, filters.startDate, filters.endDate]);

  // Debounced search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLogs();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [filters.search]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Format date correctly according to screenshot: 16/7/2026, 9:43:50 pm
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      dateStr: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'numeric', year: 'numeric' }),
      timeStr: date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }),
    };
  };

  return (
    <div className="audit-logs-page">
      {/* Header Card */}
      <div className="al-header-card">
        <span className="al-badge">AUDIT TRAIL</span>
        <h1>Audit Logs</h1>
        <p>Complete action history — every user action, approval, submission, and system event is tracked here.</p>
      </div>

      {/* Filters & Export Section */}
      <div className="al-controls-section">
        <div className="al-filters-row">
          <div className="al-filter-group">
            <label>Filter by User</label>
            <div className="al-search-box">
              <input
                type="text"
                name="search"
                placeholder="Search user..."
                value={filters.search}
                onChange={handleFilterChange}
              />
              <button className="al-search-btn">
                <Search size={14} color="white" />
              </button>
            </div>
          </div>

          <div className="al-filter-group">
            <label>Filter by Admin</label>
            <select name="admin" value={filters.admin} onChange={handleFilterChange}>
              <option>All Admins / Reviewers</option>
              <option>Super Administrators</option>
              <option>Standard Admins</option>
            </select>
          </div>

          <div className="al-filter-group">
            <label>Filter by District</label>
            <select name="district" value={filters.district} onChange={handleFilterChange}>
              <option>All Districts</option>
              <option>Guntur</option>
              <option>Krishna</option>
              <option>Visakhapatnam</option>
            </select>
          </div>

          <div className="al-filter-group">
            <label>Filter by Action</label>
            <select name="action" value={filters.action} onChange={handleFilterChange}>
              <option>All Actions</option>
              <option>Login History</option>
              <option>Approvals (App/Doc/Q)</option>
              <option>Rejections & Resubmissions</option>
              <option>Task Assignments</option>
            </select>
          </div>

          <div className="al-filter-group">
            <label>Start Date</label>
            <div className="al-date-input">
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>

          <div className="al-filter-group">
            <label>End Date</label>
            <div className="al-date-input">
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>
        </div>

        <div className="al-export-row">
          <div className="al-export-info">
            <h3>Export & Downloads</h3>
            <p>Download real-time data of all user submissions and documents.</p>
          </div>
          <button className="al-btn-download">
            <Download size={16} />
            Download All Submissions (Enterprise Excel)
          </button>
        </div>
      </div>

      {/* Application Progress (Placeholder matching screenshot) */}
      <div className="al-section-card">
        <div className="al-section-header">
          <h3>Application Progress & Score Tracking</h3>
          <p>Track SRF compliance applications, review status, scores, and completion percentage.</p>
        </div>
        <div className="al-table-wrapper">
          <table className="al-table">
            <thead>
              <tr>
                <th>APPLICATION ID</th>
                <th>SRF USER</th>
                <th>ORGANIZATION / STATE</th>
                <th>EDITION</th>
                <th>STATUS</th>
                <th>SCORE</th>
                <th>PERCENTAGE</th>
                <th>LAST UPDATED</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="al-app-id">APP_1784218438426_CP0MN</span></td>
                <td>
                  <div className="al-user-cell">
                    <span className="al-user-name">user</span>
                    <span className="al-user-role">State Alpha</span>
                  </div>
                </td>
                <td>State Alpha Startup Cell</td>
                <td>SRF 6.0</td>
                <td><span className="al-status-badge draft">DRAFT</span></td>
                <td>—</td>
                <td><div className="al-progress-bar"><div className="al-progress-fill" style={{ width: '10%' }}></div></div></td>
                <td className="al-date-cell">16/7/2026, 9:43:50 pm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Actions (Dynamic Data) */}
      <div className="al-section-card">
        <div className="al-section-header">
          <h3>Recent Actions ({logs.length})</h3>
        </div>
        <div className="al-table-wrapper">
          <table className="al-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>USER</th>
                <th>ACTION</th>
                <th>ENTITY</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="al-empty">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="al-empty">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const { dateStr, timeStr } = formatDateTime(log.createdAt);
                  return (
                    <tr key={log._id}>
                      <td>
                        <div className="al-timestamp">
                          <span className="al-date">{dateStr},</span>
                          <span className="al-time">{timeStr}</span>
                        </div>
                      </td>
                      <td>
                        <div className="al-user-cell">
                          <span className="al-user-name">{log.userName}</span>
                          {log.userRole && (
                            <span className="al-user-role">{log.userRole.replace('_', ' ')}</span>
                          )}
                        </div>
                      </td>
                      <td>{log.action}</td>
                      <td className="al-entity">{log.entity}</td>
                      <td className="al-entity-id">{log.entityId}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
