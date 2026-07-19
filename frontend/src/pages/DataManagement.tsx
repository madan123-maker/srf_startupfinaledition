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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5001/api/data/stats', {
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

    fetchStats();
  }, []);

  const handleDownload = async (endpoint: string, filename: string) => {
    setDownloading(endpoint);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/data/export/${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to download data');
      }

      // Convert response to blob
      const blob = await response.blob();
      
      // Create a temporary link element to trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      alert(`Download failed: ${error.message}`);
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

      {/* Exports Section */}
      <div className="dm-export-section">
        <div className="dm-section-header">
          <h3>Export & Downloads</h3>
          <p>Download real-time data of all user submissions and documents.</p>
        </div>
        
        <div className="dm-buttons-row">
          <button 
            className="dm-btn dm-btn-green"
            onClick={() => handleDownload('submissions', 'all_submissions.csv')}
            disabled={downloading === 'submissions'}
          >
            <Download size={16} />
            {downloading === 'submissions' ? 'Downloading...' : 'Download All Submissions (Excel)'}
          </button>
          
          <button 
            className="dm-btn dm-btn-purple"
            onClick={() => handleDownload('submissions', 'applications_report.csv')}
            disabled={downloading === 'submissions'}
          >
            <FileSpreadsheet size={16} />
            Applications Report (CSV)
          </button>
          
          <button 
            className="dm-btn dm-btn-blue"
            onClick={() => handleDownload('users', 'registered_users.csv')}
            disabled={downloading === 'users'}
          >
            <Users size={16} />
            Export Users (CSV)
          </button>
          
          <button 
            className="dm-btn dm-btn-orange"
            onClick={() => handleDownload('admins', 'system_admins.csv')}
            disabled={downloading === 'admins'}
          >
            <ShieldAlert size={16} />
            Export Admins (CSV)
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataManagement;
