import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, Upload, Paperclip, Trash2,
  Loader2, CheckCircle2, ChevronRight, BookOpen,
  Layers, Target, Award, FileText, HelpCircle, Circle
} from 'lucide-react';
import './FocusedFormView.css';

interface Field {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

interface Question {
  id: string;
  questionNumber: string;
  weightage: number;
  title: string;
  requiredDocuments: string;
  guidelinesRef: string;
  scoringCriteria: string;
  fields: Field[];
}

interface ActionPoint { id: string; title: string; questions: Question[]; }
interface ReformArea  { id: string; title: string; description: string; actionPoints: ActionPoint[]; }

interface IFieldResponse {
  fieldId: string; value: any; fileUrl?: string; fileName?: string;
  evaluationStatus?: string; evaluationRemarks?: string;
}
interface ISubmissionResponse { questionId: string; fieldResponses: IFieldResponse[]; }
interface ISubmission {
  _id: string; editionId: string; status: string;
  responses: ISubmissionResponse[]; totalScore: number; adminRemarks?: string;
}

interface Assignment {
  _id: string;
  scope: 'EDITION' | 'REFORM_AREA' | 'ACTION_POINT' | 'QUESTION';
  editionId: { _id: string; name: string; version: string };
  reformAreaTitle?: string;
  actionPointTitle?: string;
  questionTitle?: string;
  status: 'ASSIGNED' | 'SUBMITTED' | 'EVALUATED';
  evaluationStatus?: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  evaluationRemarks?: string;
}

const SCOPE_ICONS: Record<string, React.ReactNode> = {
  EDITION: <Layers size={16} />,
  REFORM_AREA: <BookOpen size={16} />,
  ACTION_POINT: <Target size={16} />,
  QUESTION: <HelpCircle size={16} />,
};

const FocusedFormView: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [filteredSchema, setFilteredSchema] = useState<{ areas: ReformArea[] } | null>(null);
  const [submission, setSubmission] = useState<ISubmission | null>(null);
  const [responses, setResponses] = useState<ISubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!assignmentId) return;
    const load = async () => {
      try {
        // 1. Fetch filtered schema for this assignment
        const schemaRes = await fetch(`http://localhost:5001/api/assignments/${assignmentId}/schema`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!schemaRes.ok) throw new Error('Assignment not found');
        const { assignment: asgn, filteredSchema: fs } = await schemaRes.json();
        setAssignment(asgn);
        setFilteredSchema(fs);
        
        // 2. Fetch/create submission for the edition
        const editionId = typeof asgn.editionId === 'object' ? asgn.editionId._id : asgn.editionId;
        const subRes = await fetch(
          `http://localhost:5001/api/submissions/edition/${editionId}/my-submission`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubmission(subData);
          setResponses(subData.responses || []);
        }

        // Auto-select first question in the filtered schema
        if (fs?.areas?.[0]?.actionPoints?.[0]?.questions?.[0]) {
          setSelectedQuestionId(fs.areas[0].actionPoints[0].questions[0].id);
        }
      } catch (err) {
        console.error(err);
        showToast('Failed to load task.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [assignmentId]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getFieldResponse = (questionId: string, fieldId: string): IFieldResponse | undefined => {
    const qResp = responses.find((r) => r.questionId === questionId);
    return qResp?.fieldResponses?.find((f) => f.fieldId === fieldId);
  };

  const getFieldValue = (questionId: string, fieldId: string): any => {
    return getFieldResponse(questionId, fieldId)?.value ?? '';
  };

  const getFieldFile = (questionId: string, fieldId: string) => {
    const fResp = getFieldResponse(questionId, fieldId);
    return fResp?.fileUrl ? { fileUrl: fResp.fileUrl, fileName: fResp.fileName } : null;
  };

  const handleFieldChange = (questionId: string, fieldId: string, value: any, extra: any = {}) => {
    setResponses((prev) => {
      const qIdx = prev.findIndex((r) => r.questionId === questionId);
      if (qIdx === -1) {
        return [...prev, { questionId, fieldResponses: [{ fieldId, value, ...extra }] }];
      }
      const qResp = prev[qIdx];
      const fIdx = qResp.fieldResponses?.findIndex((fr) => fr.fieldId === fieldId) ?? -1;
      let updated = qResp.fieldResponses ? [...qResp.fieldResponses] : [];
      if (fIdx === -1) updated.push({ fieldId, value, ...extra });
      else updated[fIdx] = { ...updated[fIdx], value, ...extra };
      const next = [...prev];
      next[qIdx] = { ...qResp, fieldResponses: updated };
      return next;
    });
  };

  const handleFileUpload = async (questionId: string, fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:5001/api/submissions/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const fd = await res.json();
        handleFieldChange(questionId, fieldId, fd.fileUrl, { fileUrl: fd.fileUrl, fileName: fd.fileName });
      } else {
        showToast('File upload failed.', 'error');
      }
    } catch { showToast('Error uploading file.', 'error'); }
  };

  const handleRemoveFile = (questionId: string, fieldId: string) => {
    handleFieldChange(questionId, fieldId, '', { fileUrl: undefined, fileName: undefined });
    if (fileInputRefs.current[fieldId]) fileInputRefs.current[fieldId]!.value = '';
  };

  const saveSubmission = async () => {
    if (!submission) return;
    setSaving(true);
    try {
      // Always save draft first to persist fields
      const res = await fetch(`http://localhost:5001/api/submissions/${submission._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ responses, status: submission.status }), // keep original status
      });
      if (res.ok) {
        const updated = await res.json();
        setSubmission(updated);
        showToast('Draft saved successfully!', 'success');
      } else {
        showToast('Failed to save draft.', 'error');
      }
    } catch { showToast('Error saving draft.', 'error'); }
    finally { setSaving(false); }
  };

  const submitAssignment = async () => {
    if (!assignment) return;
    setSaving(true);
    try {
      // Save fields first
      await fetch(`http://localhost:5001/api/submissions/${submission?._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ responses, status: submission?.status }),
      });

      // Then mark assignment as submitted
      const res = await fetch(`http://localhost:5001/api/assignments/${assignment._id}/submit`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAssignment({ ...assignment, status: 'SUBMITTED' });
        showToast('Task submitted successfully!', 'success');
        setTimeout(() => navigate('/user-dashboard/assigned-tasks'), 1500);
      } else {
        showToast('Failed to submit task.', 'error');
      }
    } catch { showToast('Error submitting task.', 'error'); }
    finally { setSaving(false); }
  };

  const isQuestionAnswered = (q: Question): boolean => {
    const qResp = responses.find((r) => r.questionId === q.id);
    if (!qResp) return false;
    return q.fields.every((f) => {
      if (!f.required) return true;
      const fr = qResp.fieldResponses?.find((r) => r.fieldId === f.id);
      return fr && fr.value;
    });
  };

  // Flatten all questions in the filtered schema
  const allQuestions: Question[] = filteredSchema?.areas.flatMap((a) =>
    a.actionPoints.flatMap((ap) => ap.questions)
  ) ?? [];

  const currentQuestion = allQuestions.find((q) => q.id === selectedQuestionId) ?? allQuestions[0] ?? null;
  const currentIndex = allQuestions.findIndex((q) => q.id === currentQuestion?.id);

  const getBreadcrumb = () => {
    if (!assignment) return [];
    const parts: string[] = [(assignment.editionId as any)?.name || 'Edition'];
    if (assignment.reformAreaTitle) parts.push(assignment.reformAreaTitle);
    if (assignment.actionPointTitle) parts.push(assignment.actionPointTitle);
    if (assignment.questionTitle) parts.push(assignment.questionTitle);
    return parts;
  };

  const isGlobalReadOnly = assignment?.status === 'SUBMITTED' || (assignment?.status === 'EVALUATED' && assignment.evaluationStatus !== 'NEEDS_REVISION');

  const renderField = (question: Question, field: Field) => {
    const fResp = getFieldResponse(question.id, field.id);
    const value = getFieldValue(question.id, field.id);
    const fileData = getFieldFile(question.id, field.id);

    const fieldRequiresResubmission = fResp?.evaluationStatus === 'RESUBMISSION_REQUIRED';
    const fieldIsReadOnly = assignment?.status === 'SUBMITTED' || (assignment?.status === 'EVALUATED' && !fieldRequiresResubmission);

    const evalAlert = fieldRequiresResubmission ? (
      <div className="ffv-field-eval-alert">
        <strong>Needs Resubmission:</strong> {fResp.evaluationRemarks || 'Please update this file/field.'}
      </div>
    ) : null;

    let fieldContent = null;

    switch (field.type) {
      case 'textarea':
      case 'Textarea':
        fieldContent = (
          <textarea
            className="ffv-input ffv-textarea"
            value={value}
            disabled={fieldIsReadOnly}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            onChange={(e) => handleFieldChange(question.id, field.id, e.target.value)}
          />
        );
        break;
      case 'select':
      case 'Dropdown':
        fieldContent = (
          <select
            className="ffv-input ffv-select"
            value={value}
            disabled={fieldIsReadOnly}
            onChange={(e) => handleFieldChange(question.id, field.id, e.target.value)}
          >
            <option value="">— Select —</option>
            {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
        break;
      case 'radio':
      case 'Radio Button':
        fieldContent = (
          <div className="elegant-radio-group">
            {field.options?.map((opt) => (
              <label key={opt} className={`elegant-radio-card ${value === opt ? 'selected' : ''}`}>
                <input
                  type="radio" 
                  name={`${question.id}-${field.id}`} 
                  value={opt}
                  checked={value === opt}
                  disabled={fieldIsReadOnly}
                  onChange={() => handleFieldChange(question.id, field.id, opt)}
                  className="hidden-radio"
                />
                <div className="radio-content">
                  <div className="radio-circle"></div>
                  <span className="radio-text">{opt}</span>
                </div>
              </label>
            ))}
          </div>
        );
        break;
      case 'checkbox':
      case 'Checkbox':
        fieldContent = (
          <div className="ffv-radio-group">
            {field.options?.map((opt) => {
              const vals: string[] = Array.isArray(value) ? value : [];
              return (
                <label key={opt} className="ffv-radio-label">
                  <input
                    type="checkbox" value={opt} checked={vals.includes(opt)}
                    disabled={fieldIsReadOnly}
                    onChange={(e) => {
                      const next = e.target.checked ? [...vals, opt] : vals.filter((v) => v !== opt);
                      handleFieldChange(question.id, field.id, next);
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        );
        break;
      case 'file':
      case 'File Upload':
      case 'PDF Upload':
        fieldContent = (
          <div className="ffv-file-area">
            {fileData ? (
              <div className="ffv-file-uploaded">
                <Paperclip size={14} />
                <a href={fileData.fileUrl} target="_blank" rel="noopener noreferrer" className="ffv-file-link">
                  {fileData.fileName || 'Uploaded file'}
                </a>
                {!fieldIsReadOnly && (
                  <button className="ffv-file-remove" onClick={() => handleRemoveFile(question.id, field.id)}>
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>
            ) : (
              !fieldIsReadOnly && (
                <label className="ffv-upload-btn">
                  <Upload size={14} /> Upload Document
                  <input
                    type="file" hidden
                    ref={(el) => { fileInputRefs.current[field.id] = el; }}
                    onChange={(e) => handleFileUpload(question.id, field.id, e)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </label>
              )
            )}
          </div>
        );
        break;
      default:
        fieldContent = (
          <input
            className="ffv-input"
            type={(field.type === 'number' || field.type === 'Number Field') ? 'number' : (field.type === 'URL Field' ? 'url' : 'text')}
            value={value}
            disabled={fieldIsReadOnly}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            onChange={(e) => handleFieldChange(question.id, field.id, e.target.value)}
          />
        );
        break;
    }

    return (
      <div className="ffv-field-wrapper">
        {evalAlert}
        {fieldContent}
      </div>
    );
  };


  if (loading) {
    return (
      <div className="ffv-loading">
        <Loader2 size={32} className="ffv-spin" />
        <p>Loading your task...</p>
      </div>
    );
  }

  if (!assignment || !filteredSchema) {
    return (
      <div className="ffv-loading">
        <p>Task not found or you don't have access.</p>
        <button onClick={() => navigate('/user-dashboard/assigned-tasks')} className="ffv-back-link">
          ← Back to Assigned Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="ffv-page">
      {/* Toast */}
      {toast && <div className={`ffv-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Top bar */}
      <div className="ffv-topbar">
        <button className="ffv-back" onClick={() => navigate('/user-dashboard/assigned-tasks')}>
          <ArrowLeft size={16} /> Back to Tasks
        </button>

        <div className="ffv-breadcrumb">
          {getBreadcrumb().map((part, i, arr) => (
            <span key={i} className="ffv-bc-part">
              {part}
              {i < arr.length - 1 && <ChevronRight size={13} className="ffv-bc-arrow" />}
            </span>
          ))}
        </div>

        <div className="ffv-scope-tag">
          {SCOPE_ICONS[assignment.scope]}
          {assignment.scope.replace('_', ' ')}
        </div>
      </div>

      <div className="ffv-layout">
        {/* ── Left sidebar: question navigator ── */}
        <aside className="ffv-sidebar">
          <div className="ffv-sidebar-title">Questions</div>
          {filteredSchema.areas.map((area) =>
            area.actionPoints.map((ap) => (
              <div key={ap.id} className="ffv-nav-group">
                <div className="ffv-nav-group-title">{ap.title}</div>
                {ap.questions.map((q) => {
                  const answered = isQuestionAnswered(q);
                  const isActive = q.id === currentQuestion?.id;
                  return (
                    <button
                      key={q.id}
                      className={`ffv-nav-item ${isActive ? 'active' : ''} ${answered ? 'answered' : ''}`}
                      onClick={() => setSelectedQuestionId(q.id)}
                    >
                      {answered
                        ? <CheckCircle2 size={14} className="ffv-nav-check" />
                        : <Circle size={14} className="ffv-nav-circle" />
                      }
                      <span className="ffv-nav-num">{q.questionNumber}</span>
                      <span className="ffv-nav-title">{q.title}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </aside>

        {/* ── Main: question form ── */}
        <main className="ffv-main">
          {currentQuestion ? (
            <div className="ffv-question-card">
              {/* Admin Evaluation Remarks (if evaluated) */}
              {assignment.status === 'EVALUATED' && (
                <div className={`ffv-eval-banner ${assignment.evaluationStatus?.toLowerCase()}`}>
                  <div className="ffv-eval-status">
                    <strong>Status:</strong> {assignment.evaluationStatus?.replace('_', ' ')}
                  </div>
                  {assignment.evaluationRemarks && (
                    <div className="ffv-eval-remarks">
                      <strong>Admin Remarks:</strong> {assignment.evaluationRemarks}
                    </div>
                  )}
                </div>
              )}

              {/* Question header */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 800, fontSize: '22px', color: '#1e1b4b', marginBottom: '16px', lineHeight: '1.4' }}>
                  <span style={{ color: '#6366f1', marginRight: '8px' }}>Q{currentQuestion.questionNumber}.</span>
                  {currentQuestion.title}
                  {currentQuestion.weightage > 0 && (
                    <span style={{ marginLeft: '12px', fontSize: '14px', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '12px', verticalAlign: 'middle' }}>
                      {currentQuestion.weightage} pts
                    </span>
                  )}
                </div>
                
                <div className="elegant-details-box">
                  {currentQuestion.guidelinesRef && (
                    <div className="elegant-detail-item">
                      <BookOpen size={16} className="detail-icon guidelines" />
                      <span className="detail-label">Guidelines:</span> 
                      {currentQuestion.guidelinesRef.toLowerCase().includes('page') 
                        ? (() => {
                            const match = currentQuestion.guidelinesRef.match(/page\s*(\d+)/i);
                            const href = match ? `/guidelines.pdf#page=${match[1]}` : `/guidelines.pdf`;
                            return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{currentQuestion.guidelinesRef}</a>;
                          })()
                        : <span style={{ color: '#475569' }}>{currentQuestion.guidelinesRef}</span>}
                    </div>
                  )}
                  {currentQuestion.scoringCriteria && (
                    <div className="elegant-detail-item">
                      <Award size={16} className="detail-icon scoring" />
                      <span className="detail-label">Scoring Criteria:</span> <span style={{ color: '#475569' }}>{currentQuestion.scoringCriteria}</span>
                    </div>
                  )}
                  {currentQuestion.requiredDocuments && (
                    <div className="elegant-detail-item evidence">
                      <FileText size={16} className="detail-icon evidence-icon" />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="detail-label evidence-label">Required Evidence:</span> 
                        <span className="evidence-value">{currentQuestion.requiredDocuments}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fields */}
              <div className="ffv-fields">
                {currentQuestion.fields.map((field) => (
                  <div key={field.id} className="ffv-field">
                    <label className="ffv-field-label">
                      {field.label}
                      {field.required && <span className="ffv-required">*</span>}
                    </label>
                    {renderField(currentQuestion, field)}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="ffv-nav-buttons">
                <button
                  className="ffv-nav-prev"
                  disabled={currentIndex === 0}
                  onClick={() => setSelectedQuestionId(allQuestions[currentIndex - 1]?.id)}
                >
                  ← Previous
                </button>
                <span className="ffv-nav-count">{currentIndex + 1} / {allQuestions.length}</span>
                <button
                  className="ffv-nav-next"
                  disabled={currentIndex === allQuestions.length - 1}
                  onClick={() => setSelectedQuestionId(allQuestions[currentIndex + 1]?.id)}
                >
                  Next →
                </button>
              </div>
            </div>
          ) : (
            <div className="ffv-no-question">No questions found in this assignment.</div>
          )}
        </main>
      </div>

      {/* Bottom action bar */}
      <div className="ffv-action-bar">
        <div className="ffv-progress-info">
          {allQuestions.filter(isQuestionAnswered).length} / {allQuestions.length} questions answered
        </div>
        <div className="ffv-action-btns">
          {!isGlobalReadOnly && (
            <button className="ffv-btn-draft" onClick={saveSubmission} disabled={saving}>
              {saving ? <Loader2 size={15} className="ffv-spin" /> : <Save size={15} />}
              Save Draft
            </button>
          )}
          <button
            className="ffv-btn-submit"
            onClick={() => {
              if (isGlobalReadOnly) return;
              if (window.confirm('Submit this task? You won\'t be able to edit it after submission.')) {
                submitAssignment();
              }
            }}
            disabled={saving || isGlobalReadOnly}
          >
            {isGlobalReadOnly ? <CheckCircle2 size={15} /> : <Send size={15} />}
            {assignment.status === 'SUBMITTED' ? 'Task Submitted' : assignment.status === 'EVALUATED' ? 'Task Evaluated' : 'Submit Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FocusedFormView;
