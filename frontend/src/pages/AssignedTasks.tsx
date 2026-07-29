import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronRight, BookOpen, Layers } from 'lucide-react';
import './AssignedTasks.css';

interface Assignment {
  _id: string;
  scope: 'EDITION' | 'REFORM_AREA' | 'ACTION_POINT' | 'QUESTION';
  editionId: {
    _id: string;
    name: string;
    version: string;
    description?: string;
    status: string;
  };
  reformAreaId?: string;
  reformAreaTitle?: string;
  actionPointId?: string;
  actionPointTitle?: string;
  questionId?: string;
  questionTitle?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ASSIGNED' | 'SUBMITTED' | 'EVALUATED';
  totalFields: number;
  filledFields: number;
  assignedAt: string;
  createdAt: string;
  evaluationStatus?: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
}

interface EditionGroup {
  editionId: string;
  editionName: string;
  editionVersion: string;
  editionDescription?: string;
  assignments: Assignment[];
  totalFields: number;
  filledFields: number;
  overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'EVALUATED';
}

const AssignedTasks: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/assignments/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setAssignments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Group assignments by Edition
  const editionGroupsMap = new Map<string, EditionGroup>();

  assignments.forEach((a) => {
    const edId = a.editionId?._id || 'unknown';
    const edName = a.editionId?.name || 'Assigned Edition';
    const edVersion = a.editionId?.version || '';
    const edDesc = a.editionId?.description;

    if (!editionGroupsMap.has(edId)) {
      editionGroupsMap.set(edId, {
        editionId: edId,
        editionName: edName,
        editionVersion: edVersion,
        editionDescription: edDesc,
        assignments: [],
        totalFields: 0,
        filledFields: 0,
        overallStatus: 'NOT_STARTED',
      });
    }

    const group = editionGroupsMap.get(edId)!;
    group.assignments.push(a);
    group.totalFields += a.totalFields || 0;
    group.filledFields += a.filledFields || 0;
  });

  const editionGroups: EditionGroup[] = Array.from(editionGroupsMap.values()).map((g) => {
    const statuses = g.assignments.map((a) => a.status);
    let overallStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SUBMITTED' | 'EVALUATED' = 'NOT_STARTED';

    if (statuses.every((s) => s === 'EVALUATED')) {
      overallStatus = 'EVALUATED';
    } else if (statuses.every((s) => s === 'SUBMITTED' || s === 'EVALUATED')) {
      overallStatus = 'SUBMITTED';
    } else if (statuses.every((s) => s === 'COMPLETED')) {
      overallStatus = 'COMPLETED';
    } else if (statuses.some((s) => s === 'IN_PROGRESS' || s === 'COMPLETED' || s === 'SUBMITTED')) {
      overallStatus = 'IN_PROGRESS';
    }

    return { ...g, overallStatus };
  });

  const stats = {
    totalAssignments: assignments.length,
    completedAssignments: assignments.filter((a) => a.status === 'COMPLETED' || a.status === 'SUBMITTED' || a.status === 'EVALUATED').length,
    inProgressAssignments: assignments.filter((a) => a.status === 'IN_PROGRESS').length,
    notStartedAssignments: assignments.filter((a) => a.status === 'NOT_STARTED').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NOT_STARTED':
        return <span className="at-status ns">Not Started</span>;
      case 'IN_PROGRESS':
        return <span className="at-status ip">In Progress</span>;
      case 'COMPLETED':
        return <span className="at-status co">Completed</span>;
      case 'SUBMITTED':
        return <span className="at-status co" style={{ background: '#dbeafe', color: '#1e40af' }}>Submitted</span>;
      case 'EVALUATED':
        return <span className="at-status co" style={{ background: '#dcfce7', color: '#166534' }}>Evaluated</span>;
      default:
        return <span className="at-status ns">Assigned</span>;
    }
  };

  return (
    <div className="at-page">
      {/* Header */}
      <div className="at-header">
        <div className="at-header-left">
          <span className="at-badge">MY TASKS</span>
          <h1>Assigned Tasks</h1>
          <p>Complete the form sections assigned to you by the administrator.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="at-stats-row">
        <div className="at-stat-card">
          <div className="at-stat-num total">{stats.totalAssignments}</div>
          <div className="at-stat-label">Total Assigned Tasks</div>
        </div>
        <div className="at-stat-card">
          <div className="at-stat-num completed">{stats.completedAssignments}</div>
          <div className="at-stat-label">Completed / Submitted</div>
        </div>
        <div className="at-stat-card">
          <div className="at-stat-num in-progress">{stats.inProgressAssignments}</div>
          <div className="at-stat-label">In Progress</div>
        </div>
        <div className="at-stat-card">
          <div className="at-stat-num not-started">{stats.notStartedAssignments}</div>
          <div className="at-stat-label">Not Started</div>
        </div>
      </div>

      {/* Task cards */}
      {loading ? (
        <div className="at-loading">Loading your tasks...</div>
      ) : editionGroups.length === 0 ? (
        <div className="at-empty">
          <ClipboardList size={48} color="#cbd5e1" />
          <h3>No tasks assigned yet</h3>
          <p>Your administrator will assign specific form sections for you to fill out.</p>
        </div>
      ) : (
        <div className="at-cards-grid">
          {editionGroups.map((g) => {
            const progress = g.totalFields > 0 ? Math.round((g.filledFields / g.totalFields) * 100) : 0;

            return (
              <div key={g.editionId} className={`at-card ${g.overallStatus === 'COMPLETED' || g.overallStatus === 'SUBMITTED' ? 'at-card-done' : ''}`}>
                {/* Card top */}
                <div className="at-card-top">
                  <div className="at-scope-icon">
                    <Layers size={20} />
                  </div>
                  <div className="at-card-meta">
                    <div className="at-edition-title">
                      {g.editionName} {g.editionVersion ? `(v${g.editionVersion})` : ''}
                    </div>
                    {getStatusBadge(g.overallStatus)}
                  </div>
                </div>

                {/* Number of Reform Areas Assigned */}
                <div className="at-allocated-section">
                  <div className="at-allocated-info-row">
                    <BookOpen size={18} className="at-allocated-icon" />
                    <span className="at-allocated-count-text">
                      Assigned Reform Areas: <strong>{g.assignments.length}</strong>
                    </span>
                  </div>
                </div>

                {/* Aggregate Progress bar */}
                {g.totalFields > 0 && (
                  <div className="at-progress-wrap">
                    <div className="at-progress-bar">
                      <div className="at-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="at-progress-label">
                      {g.filledFields}/{g.totalFields} fields filled ({progress}%)
                    </span>
                  </div>
                )}

                {/* Fill button */}
                <button
                  className="at-fill-btn"
                  onClick={() => navigate(`/user-dashboard/workspace/${g.editionId}`)}
                >
                  {g.overallStatus === 'NOT_STARTED'
                    ? 'Start Task'
                    : g.overallStatus === 'SUBMITTED' || g.overallStatus === 'EVALUATED'
                    ? 'View Submission'
                    : 'Continue Task'}
                  <ChevronRight size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignedTasks;
