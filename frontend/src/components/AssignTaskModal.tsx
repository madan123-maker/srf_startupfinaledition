import { API_BASE_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronRight } from 'lucide-react';
import './AssignTaskModal.css';

interface AppUser {
  _id: string;
  name?: string;
  email: string;
}

interface Edition {
  _id: string;
  name: string;
  version: string;
  status: string;
}

interface ReformArea { id: string; title: string; actionPoints: ActionPoint[]; }
interface ActionPoint { id: string; title: string; questions: Question[]; }
interface Question { id: string; title: string; questionNumber: string; }

interface Assignment {
  _id: string;
  scope: string;
  editionId: { _id: string; name: string; version: string };
  reformAreaTitle?: string;
  actionPointTitle?: string;
  questionTitle?: string;
}

type Scope = 'EDITION' | 'REFORM_AREA' | 'ACTION_POINT' | 'QUESTION';

interface Props {
  user: AppUser;
  onClose: () => void;
}

const SCOPE_LABELS: Record<Scope, string> = {
  EDITION: 'Whole Edition',
  REFORM_AREA: 'Reform Area',
  ACTION_POINT: 'Action Point',
  QUESTION: 'Question',
};

const AssignTaskModal: React.FC<Props> = ({ user, onClose }) => {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);
  const [schema, setSchema] = useState<{ areas: ReformArea[] } | null>(null);

  const [selectedEditionId, setSelectedEditionId] = useState('');
  const [selectedScope, setSelectedScope] = useState<Scope>('EDITION');
  const [selectedReformArea, setSelectedReformArea] = useState<ReformArea | null>(null);
  const [selectedActionPoint, setSelectedActionPoint] = useState<ActionPoint | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const token = localStorage.getItem('token');

  // Fetch editions based on role (Super Admins can see draft editions too)
  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    fetch(`${API_BASE_URL}/api/editions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setEditions(data.filter((e: Edition) => currentUser.role === 'SUPER_ADMIN' || e.status === 'PUBLISHED')));
  }, []);

  // Fetch existing assignments for this user
  const fetchAssignments = () => {
    fetch(`${API_BASE_URL}/api/assignments/user/${user._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setExistingAssignments);
  };

  useEffect(() => { fetchAssignments(); }, [user._id]);

  // Fetch schema when edition changes
  useEffect(() => {
    if (!selectedEditionId) { setSchema(null); return; }
    fetch(`${API_BASE_URL}/api/schemas/${selectedEditionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setSchema(data));
    // reset drill-down
    setSelectedReformArea(null);
    setSelectedActionPoint(null);
    setSelectedQuestion(null);
  }, [selectedEditionId]);

  const handleScopeChange = (s: Scope) => {
    setSelectedScope(s);
    setSelectedReformArea(null);
    setSelectedActionPoint(null);
    setSelectedQuestion(null);
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAssign = async () => {
    if (!selectedEditionId) return showToast('Please select an edition.', 'error');

    const chosenEdition = editions.find((ed) => ed._id === selectedEditionId);
    if (chosenEdition && chosenEdition.status === 'PUBLISHED') {
      return showToast('Published editions cannot be assigned to users. Only unpublished editions can be assigned.', 'error');
    }

    if (selectedScope === 'REFORM_AREA' && !selectedReformArea) return showToast('Please select a Reform Area.', 'error');
    if (selectedScope === 'ACTION_POINT' && !selectedActionPoint) return showToast('Please select an Action Point.', 'error');
    if (selectedScope === 'QUESTION' && !selectedQuestion) return showToast('Please select a Question.', 'error');

    setSaving(true);
    try {
      const body: any = {
        userId: user._id,
        editionId: selectedEditionId,
        scope: selectedScope,
      };
      if (selectedReformArea) {
        body.reformAreaId = selectedReformArea.id;
        body.reformAreaTitle = selectedReformArea.title;
      }
      if (selectedActionPoint) {
        body.actionPointId = selectedActionPoint.id;
        body.actionPointTitle = selectedActionPoint.title;
      }
      if (selectedQuestion) {
        body.questionId = selectedQuestion.id;
        body.questionTitle = selectedQuestion.title;
      }

      const res = await fetch(`${API_BASE_URL}/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Task assigned successfully!', 'success');
        fetchAssignments();
        setSelectedEditionId('');
        setSelectedScope('EDITION');
        setSelectedReformArea(null);
        setSelectedActionPoint(null);
        setSelectedQuestion(null);
      } else {
        showToast(data.error || 'Failed to assign task.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    const res = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Assignment removed.', 'success');
      fetchAssignments();
    }
  };

  const getScopeBreadcrumb = (a: Assignment) => {
    const parts = [(a.editionId as any)?.name || 'Edition'];
    if (a.reformAreaTitle) parts.push(a.reformAreaTitle);
    if (a.actionPointTitle) parts.push(a.actionPointTitle);
    if (a.questionTitle) parts.push(a.questionTitle);
    return parts;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="atm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-labelledby="atm-dialog-title">
      <div className="atm-modal">
        {/* Header */}
        <div className="atm-header">
          <div>
            <h2 className="atm-title" id="atm-dialog-title">Assign Task</h2>
            <p className="atm-subtitle">
              Assigning to: <strong>{user.name || user.email}</strong>
            </p>
          </div>
          <button className="atm-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </div>

        {toast && (
          <div className={`atm-toast ${toast.type}`}>{toast.msg}</div>
        )}

        <div className="atm-body">
          {/* ── Left: Assignment form ── */}
          <div className="atm-form-col">
            <div className="atm-section-label">New Assignment</div>

            {/* Step 1: Edition */}
            <div className="atm-field">
              <label>Edition</label>
              <select
                value={selectedEditionId}
                onChange={(e) => {
                  const val = e.target.value;
                  const chosen = editions.find((ed) => ed._id === val);
                  if (chosen && chosen.status === 'PUBLISHED') {
                    showToast('Published editions cannot be assigned to users. Only unpublished editions can be assigned.', 'error');
                    setSelectedEditionId('');
                    return;
                  }
                  setSelectedEditionId(val);
                }}
              >
                <option value="">— Select Edition —</option>
                {editions.map((ed) => {
                  const isPublished = ed.status === 'PUBLISHED';
                  return (
                    <option key={ed._id} value={ed._id} disabled={isPublished}>
                      {ed.name} (v{ed.version}){isPublished ? ' (Published)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Step 2: Scope */}
            {selectedEditionId && (
              <div className="atm-field">
                <label>Assign Scope</label>
                <div className="atm-scope-grid">
                  {(['EDITION', 'REFORM_AREA', 'ACTION_POINT', 'QUESTION'] as Scope[]).map((s) => (
                    <button
                      key={s}
                      className={`atm-scope-btn ${selectedScope === s ? 'active' : ''}`}
                      onClick={() => handleScopeChange(s)}
                    >
                      {SCOPE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3a: Reform Area */}
            {selectedEditionId && selectedScope !== 'EDITION' && schema && (
              <div className="atm-field">
                <label>Reform Area</label>
                <select
                  value={selectedReformArea?.id || ''}
                  onChange={(e) => {
                    const area = schema.areas.find((a) => a.id === e.target.value) || null;
                    setSelectedReformArea(area);
                    setSelectedActionPoint(null);
                    setSelectedQuestion(null);
                  }}
                >
                  <option value="">— Select Reform Area —</option>
                  {schema.areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 3b: Action Point */}
            {selectedReformArea && (selectedScope === 'ACTION_POINT' || selectedScope === 'QUESTION') && (
              <div className="atm-field">
                <label>Action Point</label>
                <select
                  value={selectedActionPoint?.id || ''}
                  onChange={(e) => {
                    const ap = selectedReformArea.actionPoints.find((a) => a.id === e.target.value) || null;
                    setSelectedActionPoint(ap);
                    setSelectedQuestion(null);
                  }}
                >
                  <option value="">— Select Action Point —</option>
                  {selectedReformArea.actionPoints.map((ap) => (
                    <option key={ap.id} value={ap.id}>{ap.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 3c: Question */}
            {selectedActionPoint && selectedScope === 'QUESTION' && (
              <div className="atm-field">
                <label>Question</label>
                <select
                  value={selectedQuestion?.id || ''}
                  onChange={(e) => {
                    const q = selectedActionPoint.questions.find((q) => q.id === e.target.value) || null;
                    setSelectedQuestion(q);
                  }}
                >
                  <option value="">— Select Question —</option>
                  {selectedActionPoint.questions.map((q) => (
                    <option key={q.id} value={q.id}>{q.questionNumber}. {q.title}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              className="atm-assign-btn"
              onClick={handleAssign}
              disabled={saving || !selectedEditionId || editions.find(e => e._id === selectedEditionId)?.status === 'PUBLISHED'}
            >
              <Plus size={16} />
              {saving ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>

          {/* ── Right: Existing assignments ── */}
          <div className="atm-assignments-col">
            <div className="atm-section-label">
              Current Assignments
              <span className="atm-count">{existingAssignments.length}</span>
            </div>

            {existingAssignments.length === 0 ? (
              <div className="atm-empty">No tasks assigned yet.</div>
            ) : (
              <div className="atm-assignment-list">
                {existingAssignments.map((a) => {
                  const crumbs = getScopeBreadcrumb(a);
                  const isEdPublished = (a.editionId as any)?.status === 'PUBLISHED';
                  return (
                    <div key={a._id} className="atm-assignment-chip">
                      <div className="atm-chip-scope-badge">{SCOPE_LABELS[a.scope as Scope]}</div>
                      <div className="atm-chip-breadcrumb">
                        {crumbs.map((c, i) => (
                          <span key={i}>
                            {c}
                            {i < crumbs.length - 1 && <ChevronRight size={12} className="atm-chevron" />}
                          </span>
                        ))}
                        {isEdPublished && (
                          <span style={{ marginLeft: '6px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                            (Published)
                          </span>
                        )}
                      </div>
                      <button className="atm-chip-remove" onClick={() => handleRemove(a._id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignTaskModal;
