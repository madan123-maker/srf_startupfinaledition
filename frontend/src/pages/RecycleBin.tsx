import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Trash2 } from 'lucide-react';
import './RecycleBin.css';

interface RecycleBinStats {
  total: number;
  editions: number;
  assignments: number;
  applications: number;
  users: number;
  reformAreas: number;
  actionPoints: number;
}

interface DeletedItem {
  _id: string;
  originalId: string;
  entityType: string;
  entityName: string;
  deletedBy?: { _id: string; name?: string; email?: string; role?: string };
  deletedAt: string;
}

const TABS = [
  'All Deleted Items', 'SRFs', 'Assignments', 'Applications', 'Users', 'Departments', 'Reform Areas', 'Action Points'
];

const RecycleBin: React.FC = () => {
  const [stats, setStats] = useState<RecycleBinStats>({
    total: 0, editions: 0, assignments: 0, applications: 0, users: 0, reformAreas: 0, actionPoints: 0
  });
  
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<DeletedItem[]>([]);
  
  const [activeTab, setActiveTab] = useState('All Deleted Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletedByFilter, setDeletedByFilter] = useState('All Users');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [statsRes, itemsRes] = await Promise.all([
          fetch('${API_BASE_URL}/api/recyclebin/stats', { headers }),
          fetch('${API_BASE_URL}/api/recyclebin', { headers })
        ]);
        
        if (statsRes.ok) setStats(await statsRes.json());
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setItems(data);
          setFilteredItems(data);
        }
      } catch (error) {
        console.error('Failed to fetch recycle bin data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = items;

    // Filter by Tab (entityType)
    if (activeTab !== 'All Deleted Items') {
      const typeMap: Record<string, string> = {
        'SRFs': 'Edition',
        'Assignments': 'Assignment',
        'Applications': 'Application',
        'Users': 'User',
        'Departments': 'Department',
        'Reform Areas': 'Reform Area',
        'Action Points': 'Action Point'
      };
      result = result.filter(item => item.entityType === typeMap[activeTab]);
    }

    // Filter by Search (entityName or deletedBy name/email)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.entityName.toLowerCase().includes(q) || 
        (item.deletedBy?.name || item.deletedBy?.email || 'admin user').toLowerCase().includes(q)
      );
    }

    // Filter by Dates
    if (dateFrom) {
      result = result.filter(item => new Date(item.deletedAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      result = result.filter(item => new Date(item.deletedAt) <= end);
    }

    setFilteredItems(result);
  }, [items, activeTab, searchQuery, dateFrom, dateTo]);

  const handleRestore = async (id: string) => {
    if (!window.confirm('Are you sure you want to restore this item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/recyclebin/${id}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setItems(prev => prev.filter(i => i._id !== id));
        // Soft reload stats
        fetch('${API_BASE_URL}/api/recyclebin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(setStats);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to restore');
      }
    } catch (error) {
      console.error('Restore failed', error);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('WARNING: This will permanently delete the item. This cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/recyclebin/${id}/permanent`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setItems(prev => prev.filter(i => i._id !== id));
        // Soft reload stats
        fetch('${API_BASE_URL}/api/recyclebin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(setStats);
      }
    } catch (error) {
      console.error('Permanent delete failed', error);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDeletedByFilter('All Users');
    setDateFrom('');
    setDateTo('');
  };

  const formatTabName = (tabName: string) => {
    if (tabName === 'All Deleted Items') return `All Deleted Items (${stats.total})`;
    if (tabName === 'SRFs') return `SRFs (${stats.editions})`;
    if (tabName === 'Assignments') return `Assignments (${stats.assignments})`;
    if (tabName === 'Applications') return `Applications (${stats.applications})`;
    if (tabName === 'Users') return `Users (${stats.users})`;
    if (tabName === 'Reform Areas') return `Reform Areas (${stats.reformAreas})`;
    if (tabName === 'Action Points') return `Action Points (${stats.actionPoints})`;
    return `${tabName} (0)`; // Mock 0 for others until fully wired
  };

  return (
    <div className="rb-page">
      {/* Header Card */}
      <div className="rb-header-card">
        <span className="rb-badge">SUPER ADMIN</span>
        <h1>Recycle Bin</h1>
        <p>Deleted items are stored for <strong>30 days</strong> before permanent removal. Only Super Admin has access to view, restore, or permanently delete items.</p>
      </div>

      {/* Metrics Row */}
      <div className="rb-metrics-row">
        <div className="rb-metric-card" style={{ borderColor: '#6366f1' }}>
          <div className="rb-metric-value" style={{ color: '#6366f1' }}>{stats.total}</div>
          <div className="rb-metric-label">Total Items</div>
        </div>
        <div className="rb-metric-card" style={{ borderColor: '#ef4444' }}>
          <div className="rb-metric-value" style={{ color: '#ef4444' }}>{stats.editions}</div>
          <div className="rb-metric-label">SRFs (Editions)</div>
        </div>
        <div className="rb-metric-card" style={{ borderColor: '#f59e0b' }}>
          <div className="rb-metric-value" style={{ color: '#f59e0b' }}>{stats.assignments}</div>
          <div className="rb-metric-label">Assignments</div>
        </div>
        <div className="rb-metric-card" style={{ borderColor: '#3b82f6' }}>
          <div className="rb-metric-value" style={{ color: '#3b82f6' }}>{stats.applications}</div>
          <div className="rb-metric-label">Applications</div>
        </div>
        <div className="rb-metric-card" style={{ borderColor: '#10b981' }}>
          <div className="rb-metric-value" style={{ color: '#10b981' }}>{stats.users}</div>
          <div className="rb-metric-label">Users</div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="rb-filters-card">
        <div className="rb-search-wrapper">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by item name, deleted by..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="rb-date-filters">
          <div className="rb-filter-group">
            <label>Deleted By:</label>
            <select value={deletedByFilter} onChange={(e) => setDeletedByFilter(e.target.value)}>
              <option>All Users</option>
            </select>
          </div>
          
          <div className="rb-filter-group">
            <label>Date From:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          
          <div className="rb-filter-group">
            <label>To:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>

          <button className="rb-clear-btn" onClick={clearFilters}>Clear</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="rb-content-card">
        <div className="rb-tabs">
          {TABS.map(tab => (
            <button 
              key={tab} 
              className={`rb-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {formatTabName(tab)}
            </button>
          ))}
        </div>

        <div className="rb-table-container">
          {loading ? (
            <div className="rb-empty-state">Loading deleted items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="rb-empty-state">
              <Trash2 size={48} className="empty-icon" />
              <h3>No Items Found</h3>
              <p>No deleted records match your active search filter or date ranges.</p>
            </div>
          ) : (
            <table className="rb-table">
              <thead>
                <tr>
                  <th>ITEM NAME</th>
                  <th>TYPE</th>
                  <th>DELETED BY</th>
                  <th>DELETED AT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item._id}>
                    <td className="font-medium text-slate-800">{item.entityName}</td>
                    <td>{item.entityType}</td>
                    <td>{item.deletedBy?.name || item.deletedBy?.email || 'Admin User'}</td>
                    <td>{new Date(item.deletedAt).toLocaleString()}</td>
                    <td>
                      <div className="rb-actions">
                        <button className="rb-btn-restore" onClick={() => handleRestore(item._id)}>
                          <RotateCcw size={14} /> Restore
                        </button>
                        <button className="rb-btn-delete" onClick={() => handlePermanentDelete(item._id)}>
                          <Trash2 size={14} /> Delete
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
  );
};

export default RecycleBin;
