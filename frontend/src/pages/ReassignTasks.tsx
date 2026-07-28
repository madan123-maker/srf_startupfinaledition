import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Trash2, Search, Filter, UserPlus, X } from 'lucide-react';
import './ReassignTasks.css';

interface Assignment {
  _id: string;
  scope: string;
  editionId: { _id: string; name: string; version: string };
  userId: { _id: string; name?: string; email: string; state?: string };
  assignedBy: { _id: string; name?: string; email: string };
  reformAreaTitle?: string;
  actionPointTitle?: string;
  questionTitle?: string;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  state: string;
  role: string;
}

const ReassignTasks: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  const token = localStorage.getItem('token');

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Failed to fetch assignments', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchUsers();
  }, []);

  const handleRemove = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this task assignment?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setAssignments(prev => prev.filter(a => a._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete assignment', error);
    }
  };

  const openReassignModal = (id: string) => {
    setSelectedAssignmentId(id);
    setTargetUserId('');
    setIsModalOpen(true);
  };

  const handleReassign = async () => {
    if (!selectedAssignmentId || !targetUserId) return;
    setIsReassigning(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments/${selectedAssignmentId}/reassign`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ userId: targetUserId })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchAssignments(); // Refetch to get populated user details
        alert('Task reassigned successfully');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reassign task');
      }
    } catch (error) {
      console.error('Failed to reassign task', error);
      alert('Failed to reassign task');
    } finally {
      setIsReassigning(false);
    }
  };


  const filteredAssignments = assignments.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      (a.userId?.name || '').toLowerCase().includes(q) ||
      (a.userId?.email || '').toLowerCase().includes(q) ||
      (a.userId?.state || '').toLowerCase().includes(q) ||
      (a.editionId?.name || '').toLowerCase().includes(q)
    );
  });

  const getScopeBreadcrumb = (a: Assignment) => {
    const parts = [];
    if (a.reformAreaTitle) parts.push(a.reformAreaTitle);
    if (a.actionPointTitle) parts.push(a.actionPointTitle);
    if (a.questionTitle) parts.push(a.questionTitle);
    return parts.join(' > ') || 'Entire Edition';
  };

  return (
    <div className="reassign-container">
      <div className="reassign-header">
        <div>
          <span className="reassign-badge">TASK MANAGEMENT</span>
          <h1>Assigned Tasks History</h1>
          <p>View and manage all tasks assigned to users across different editions.</p>
        </div>
      </div>

      <div className="reassign-toolbar">
        <div className="reassign-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by user, email, state, or edition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn-filter">
          <Filter size={16} /> Filter
        </button>
      </div>

      <div className="reassign-table-wrapper">
        <table className="reassign-table">
          <thead>
            <tr>
              <th>User</th>
              <th>State</th>
              <th>Edition</th>
              <th>Assigned Scope</th>
              <th>Assigned Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading tasks...</td></tr>
            ) : filteredAssignments.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No tasks found.</td></tr>
            ) : (
              filteredAssignments.map((a) => (
                <tr key={a._id}>
                  <td>
                    <div className="rt-user-info">
                      <div className="rt-avatar">
                        {(a.userId?.name || a.userId?.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="rt-user-details">
                        <span className="rt-user-name">{a.userId?.name || 'Unknown User'}</span>
                        <span className="rt-user-email">{a.userId?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{a.userId?.state || '—'}</td>
                  <td>
                    <div className="rt-edition-info">
                      <span className="rt-edition-name">{a.editionId?.name}</span>
                      <span className="rt-edition-version">v{a.editionId?.version}</span>
                    </div>
                  </td>
                  <td>
                    <div className="rt-scope-info">
                      <span className="rt-scope-badge">{a.scope.replace('_', ' ')}</span>
                      <span className="rt-scope-path" title={getScopeBreadcrumb(a)}>
                        {getScopeBreadcrumb(a)}
                      </span>
                    </div>
                  </td>
                  <td className="rt-date">
                    {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="rt-actions">
                    <button className="rt-btn-reassign" onClick={() => openReassignModal(a._id)} title="Reassign Task">
                      <UserPlus size={16} />
                    </button>
                    <button className="rt-btn-revoke" onClick={() => handleRemove(a._id)} title="Revoke Task">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="rt-modal-overlay">
          <div className="rt-modal">
            <div className="rt-modal-header">
              <h2>Re-assign Task</h2>
              <button className="rt-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="rt-modal-body">
              <p>Select a user to re-assign this task to. The current user will lose access.</p>
              <div className="rt-form-group">
                <label>Target User</label>
                <select 
                  value={targetUserId} 
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="rt-select"
                >
                  <option value="">-- Select User --</option>
                  {users.filter(u => {
                    const currentAssignment = assignments.find(a => a._id === selectedAssignmentId);
                    return (u.role === 'USER' || u.role === 'user') && u._id !== currentAssignment?.userId?._id;
                  }).map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email}) - {u.state || 'No State'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="rt-modal-footer">
              <button className="rt-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button 
                className="rt-btn-primary" 
                onClick={handleReassign}
                disabled={!targetUserId || isReassigning}
              >
                {isReassigning ? 'Reassigning...' : 'Re-assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReassignTasks;
