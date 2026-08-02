import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, ExternalLink, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './EvaluateTasks.css';

interface Assignment {
  _id: string;
  scope: string;
  editionId: { _id: string; name: string; version: string };
  userId: { _id: string; name?: string; email: string; state?: string };
  reformAreaTitle?: string;
  actionPointTitle?: string;
  questionTitle?: string;
  status: string;
  evaluationStatus?: string;
  evaluationRemarks?: string;
  awardedScore?: number;
  maxScore?: number;
  updatedAt: string;
}

const EvaluateTasks: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');

  const fetchSubmittedTasks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments/submitted`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittedTasks();
  }, []);

  const filteredTasks = assignments.filter(a => {
    const q = searchQuery.toLowerCase();
    return (
      (a.userId?.name || '').toLowerCase().includes(q) ||
      (a.userId?.state || '').toLowerCase().includes(q) ||
      (a.editionId?.name || '').toLowerCase().includes(q) ||
      (a.reformAreaTitle || '').toLowerCase().includes(q)
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
    <div className="eval-container">
      <div className="eval-header">
        <div>
          <span className="eval-badge">EVALUATION DASHBOARD</span>
          <h1>Evaluate Assigned Tasks</h1>
          <p>Review and score specific tasks submitted by users.</p>
        </div>
      </div>

      <div className="eval-toolbar">
        <div className="eval-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search by state, user, or reform area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="eval-table-wrapper">
        <table className="eval-table">
          <thead>
            <tr>
              <th>State / User</th>
              <th>Assigned Scope</th>
              <th>Submitted Date</th>
              <th>Score</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="eval-empty">Loading tasks...</td></tr>
            ) : filteredTasks.length === 0 ? (
              <tr><td colSpan={6} className="eval-empty">No submitted tasks found.</td></tr>
            ) : (
              filteredTasks.map((a) => (
                <tr key={a._id} className={a.status === 'EVALUATED' ? 'is-evaluated' : ''}>
                  <td>
                    <div className="eval-user">
                      <div className="eval-state">{a.userId?.state || '—'}</div>
                      <div className="eval-name">{a.userId?.name || a.userId?.email}</div>
                    </div>
                  </td>
                  <td>
                    <div className="eval-scope">
                      <span className="eval-scope-badge">{a.scope.replace('_', ' ')}</span>
                      <span className="eval-scope-path" title={getScopeBreadcrumb(a)}>
                        {getScopeBreadcrumb(a)}
                      </span>
                    </div>
                  </td>
                  <td className="eval-date">
                    {new Date(a.updatedAt).toLocaleDateString()}
                  </td>
                  <td>
                    {a.status === 'EVALUATED' && a.maxScore !== undefined ? (
                      <span className="eval-score-text" style={{ fontWeight: 700, color: '#334155' }}>
                        {a.awardedScore || 0} / {a.maxScore}
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td>
                    {a.status === 'EVALUATED' ? (
                      <span className={`eval-status-pill ${a.evaluationStatus?.toLowerCase()}`}>
                        {a.evaluationStatus === 'APPROVED' && <ThumbsUp size={12} />}
                        {a.evaluationStatus === 'REJECTED' && <ThumbsDown size={12} />}
                        {a.evaluationStatus === 'NEEDS_REVISION' && <AlertCircle size={12} />}
                        {a.evaluationStatus?.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="eval-status-pill pending">
                        <MessageSquare size={12} /> Pending Review
                      </span>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const userObj = JSON.parse(localStorage.getItem('user') || '{}');
                      const isSuperAdmin = userObj?.role === 'SUPER_ADMIN';
                      const btnLabel = a.status === 'EVALUATED' ? 'View Details' : (isSuperAdmin ? 'View Submission' : 'Evaluate Task');

                      return (
                        <button 
                          className="eval-btn-review"
                          onClick={() => navigate(`/admin/evaluate-tasks/${a._id}`)}
                        >
                          {btnLabel}
                          <ExternalLink size={14} />
                        </button>
                      );
                    })()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EvaluateTasks;
