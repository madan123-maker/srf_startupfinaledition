import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ChevronRight, BookOpen, Layers, Target, HelpCircle } from 'lucide-react';
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

const SCOPE_ICONS: Record<string, React.ReactNode> = {
  EDITION: <Layers size={18} />,
  REFORM_AREA: <BookOpen size={18} />,
  ACTION_POINT: <Target size={18} />,
  QUESTION: <HelpCircle size={18} />,
};

const SCOPE_LABELS: Record<string, string> = {
  EDITION: 'Whole Edition',
  REFORM_AREA: 'Reform Area',
  ACTION_POINT: 'Action Point',
  QUESTION: 'Question',
};

const AssignedTasks: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5001/api/assignments/my', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setAssignments(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusDisplay = (task: Assignment) => {
    switch (task.status) {
      case 'NOT_STARTED': return <span className="at-status ns">Not Started</span>;
      case 'IN_PROGRESS': return <span className="at-status ip">In Progress</span>;
      case 'COMPLETED': return <span className="at-status co">Completed</span>;
      case 'SUBMITTED': return <span className="at-status co" style={{background: '#dbeafe', color: '#1e40af'}}>Submitted</span>;
      case 'EVALUATED':
        if (task.evaluationStatus === 'APPROVED') return <span className="at-status co" style={{background: '#dcfce7', color: '#166534'}}>Approved</span>;
        if (task.evaluationStatus === 'REJECTED') return <span className="at-status ns" style={{background: '#fee2e2', color: '#991b1b'}}>Rejected</span>;
        if (task.evaluationStatus === 'NEEDS_REVISION') return <span className="at-status ip" style={{background: '#fef9c3', color: '#854d0e'}}>Needs Revision</span>;
        return <span className="at-status co">Evaluated</span>;
      default: return <span className="at-status ns">Assigned</span>;
    }
  };

  const getBreadcrumb = (a: Assignment) => {
    const parts: string[] = [];
    if (a.editionId?.name) parts.push(a.editionId.name);
    if (a.reformAreaTitle) parts.push(a.reformAreaTitle);
    if (a.actionPointTitle) parts.push(a.actionPointTitle);
    if (a.questionTitle) parts.push(a.questionTitle);
    return parts;
  };

  const stats = {
    total: assignments.length,
    completed: assignments.filter((a) => a.status === 'COMPLETED').length,
    inProgress: assignments.filter((a) => a.status === 'IN_PROGRESS').length,
    notStarted: assignments.filter((a) => a.status === 'NOT_STARTED').length,
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
          <div className="at-stat-num total">{stats.total}</div>
          <div className="at-stat-label">Total Tasks</div>
        </div>
        <div className="at-stat-card">
          <div className="at-stat-num completed">{stats.completed}</div>
          <div className="at-stat-label">Completed</div>
        </div>
        <div className="at-stat-card">
          <div className="at-stat-num in-progress">{stats.inProgress}</div>
          <div className="at-stat-label">In Progress</div>
        </div>
        <div className="at-stat-card">
          <div className="at-stat-num not-started">{stats.notStarted}</div>
          <div className="at-stat-label">Not Started</div>
        </div>
      </div>

      {/* Task cards */}
      {loading ? (
        <div className="at-loading">Loading your tasks...</div>
      ) : assignments.length === 0 ? (
        <div className="at-empty">
          <ClipboardList size={48} color="#cbd5e1" />
          <h3>No tasks assigned yet</h3>
          <p>Your administrator will assign specific form sections for you to fill out.</p>
        </div>
      ) : (
        <div className="at-cards-grid">
          {assignments.map((a) => {
            const breadcrumb = getBreadcrumb(a);
            const progress = a.totalFields > 0 ? Math.round((a.filledFields / a.totalFields) * 100) : 0;

            return (
              <div key={a._id} className={`at-card ${a.status === 'COMPLETED' ? 'at-card-done' : ''}`}>
                {/* Card top */}
                <div className="at-card-top">
                  <div className="at-scope-icon">{SCOPE_ICONS[a.scope]}</div>
                  <div className="at-card-meta">
                    <div className="at-scope-label">{SCOPE_LABELS[a.scope]}</div>
                    {getStatusDisplay(a)}
                  </div>
                </div>

                {/* Breadcrumb trail */}
                <div className="at-breadcrumb">
                  {breadcrumb.map((part, i) => (
                    <span key={i} className="at-breadcrumb-item">
                      {part}
                      {i < breadcrumb.length - 1 && <ChevronRight size={13} className="at-bc-arrow" />}
                    </span>
                  ))}
                </div>

                {/* Progress bar */}
                {a.totalFields > 0 && (
                  <div className="at-progress-wrap">
                    <div className="at-progress-bar">
                      <div className="at-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="at-progress-label">{a.filledFields}/{a.totalFields} fields filled</span>
                  </div>
                )}

                {/* Fill button */}
                <button
                  className="at-fill-btn"
                  onClick={() => navigate(`/user-dashboard/task/${a._id}`)}
                >
                  {a.status === 'NOT_STARTED' ? 'Start Task' : 
                   (a.status === 'SUBMITTED' || a.status === 'EVALUATED') ? 'View Submission' : 
                   'Continue Task'}
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
