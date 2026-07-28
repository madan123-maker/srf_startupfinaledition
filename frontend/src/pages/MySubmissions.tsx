import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight, AlertCircle, MessageSquare, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import './MySubmissions.css';

interface Assignment {
  _id: string;
  scope: string;
  editionId: { _id: string; name: string; version: string };
  reformAreaTitle?: string;
  actionPointTitle?: string;
  questionTitle?: string;
  status: 'SUBMITTED' | 'EVALUATED';
  evaluationStatus?: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  evaluationRemarks?: string;
  updatedAt: string;
}

const SCOPE_LABELS: Record<string, string> = {
  EDITION: 'Entire Edition',
  REFORM_AREA: 'Reform Area',
  ACTION_POINT: 'Action Point',
  QUESTION: 'Question'
};

const MySubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('${API_BASE_URL}/api/assignments/my-submissions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data);
        }
      } catch (error) {
        console.error('Error fetching submissions', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const getBreadcrumb = (a: Assignment) => {
    const parts = [];
    if (a.editionId?.name) parts.push(a.editionId.name);
    if (a.reformAreaTitle) parts.push(a.reformAreaTitle);
    if (a.actionPointTitle) parts.push(a.actionPointTitle);
    if (a.questionTitle) parts.push(a.questionTitle);
    return parts.join(' > ');
  };

  if (loading) {
    return (
      <div className="mys-loading">
        <Clock size={32} className="mys-spin" />
        <p>Loading your submissions...</p>
      </div>
    );
  }

  return (
    <div className="mys-container">
      <div className="mys-header">
        <span className="mys-badge">MY ACTIVITY</span>
        <h1>My Submissions</h1>
        <p>Track the status of the tasks you have submitted for admin review.</p>
      </div>

      {submissions.length === 0 ? (
        <div className="mys-empty">
          <FileText size={48} className="mys-empty-icon" />
          <h3>No Submissions Yet</h3>
          <p>You have not submitted any assigned tasks for evaluation.</p>
          <button onClick={() => navigate('/user-dashboard/assigned-tasks')} className="mys-btn-primary">
            View Assigned Tasks
          </button>
        </div>
      ) : (
        <div className="mys-list">
          {submissions.map((sub) => (
            <div key={sub._id} className={`mys-card ${sub.evaluationStatus ? sub.evaluationStatus.toLowerCase() : 'pending'}`}>
              <div className="mys-card-top">
                <div className="mys-info">
                  <div className="mys-scope-tag">{SCOPE_LABELS[sub.scope]}</div>
                  <div className="mys-path">{getBreadcrumb(sub)}</div>
                  <div className="mys-date">Submitted on {new Date(sub.updatedAt).toLocaleDateString()}</div>
                </div>
                
                <div className="mys-status-area">
                  {sub.status === 'SUBMITTED' ? (
                    <div className="mys-status pending">
                      <Clock size={16} /> Pending Review
                    </div>
                  ) : (
                    <div className={`mys-status ${sub.evaluationStatus?.toLowerCase()}`}>
                      {sub.evaluationStatus === 'APPROVED' && <><ThumbsUp size={16} /> Approved</>}
                      {sub.evaluationStatus === 'REJECTED' && <><ThumbsDown size={16} /> Rejected</>}
                      {sub.evaluationStatus === 'NEEDS_REVISION' && <><AlertCircle size={16} /> Needs Revision</>}
                    </div>
                  )}
                </div>
              </div>

              {sub.evaluationRemarks && (
                <div className="mys-feedback">
                  <div className="mys-feedback-title">
                    <MessageSquare size={14} /> Admin Remarks
                  </div>
                  <p>{sub.evaluationRemarks}</p>
                </div>
              )}

              <div className="mys-card-bottom">
                <button 
                  className="mys-btn-view"
                  onClick={() => navigate(`/user-dashboard/task/${sub._id}`)}
                >
                  View Details <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MySubmissions;
