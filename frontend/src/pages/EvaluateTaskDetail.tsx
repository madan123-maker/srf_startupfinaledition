import { API_BASE_URL } from '../config/api';
import { openDocumentPreview } from '../utils/documentUtils';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Paperclip, Check, BookOpen } from 'lucide-react';
import './EvaluateTaskDetail.css';

interface Field { id: string; label: string; type: string; options?: string[]; required?: boolean; }
interface Question { id: string; questionNumber: string; title: string; fields: Field[]; points?: number; weightage?: number; guidelinesRef?: string; }
interface ActionPoint { id: string; title: string; questions: Question[]; }
interface ReformArea { id: string; title: string; actionPoints: ActionPoint[]; }

interface Assignment {
  _id: string;
  scope: string;
  editionId: { _id: string; name: string; version: string };
  userId: { _id: string; name?: string; email: string; state?: string };
  status: string;
  evaluationStatus?: string;
  evaluationRemarks?: string;
}

const EvaluateTaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [schema, setSchema] = useState<{ areas: ReformArea[] } | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldEvaluations, setFieldEvaluations] = useState<Record<string, {status: string, remarks: string}>>({});
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/assignments/${id}/admin-details`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAssignment(data.assignment);
          setSchema(data.filteredSchema);
          setResponses(data.submission?.responses || []);
          if (data.assignment.evaluationRemarks) setRemarks(data.assignment.evaluationRemarks);

          const initialFieldEvals: Record<string, {status: string, remarks: string}> = {};
          const initialScores: Record<string, number> = {};
          (data.submission?.responses || []).forEach((r: any) => {
            if (r.score !== undefined) {
              initialScores[r.questionId] = r.score;
            }
            r.fieldResponses?.forEach((fr: any) => {
              if (fr.evaluationStatus) {
                initialFieldEvals[`${r.questionId}_${fr.fieldId}`] = {
                  status: fr.evaluationStatus,
                  remarks: fr.evaluationRemarks || ''
                };
              }
            });

            r.supportingDocumentResponses?.forEach((docResp: any) => {
              docResp.files?.forEach((f: any) => {
                if (f.evaluationStatus) {
                  const val = { status: f.evaluationStatus, remarks: f.evaluationRemarks || '' };
                  initialFieldEvals[`${r.questionId}_${f.fileId}`] = val;
                  initialFieldEvals[`${r.questionId}_${docResp.documentId}`] = val;
                }
              });
            });

            r.additionalFiles?.forEach((af: any) => {
              if (af.evaluationStatus) {
                initialFieldEvals[`${r.questionId}_${af.fileId}`] = {
                  status: af.evaluationStatus,
                  remarks: af.evaluationRemarks || ''
                };
              }
            });
          });
          setFieldEvaluations(initialFieldEvals);
          setQuestionScores(initialScores);
        }
      } catch (err) { console.error('Failed to load detail', err); }
      finally { setLoading(false); }
    };
    fetchDetails();
  }, [id]);

  const handleSaveEvaluation = async () => {
    // Auto-calculate global status based on field evaluations
    let computedStatus = 'APPROVED';
    const evals = Object.values(fieldEvaluations);
    
    if (evals.some(e => e.status === 'REJECTED')) {
      computedStatus = 'REJECTED';
    } else if (evals.some(e => e.status === 'RESUBMISSION_REQUIRED')) {
      computedStatus = 'NEEDS_REVISION';
    } else if (evals.length === 0) {
      computedStatus = 'APPROVED';
    }

    const allQuestions = schema ? schema.areas.flatMap(a => a.actionPoints.flatMap(ap => ap.questions)) : [];
    let computedMaxScore = 0;
    let computedAwardedScore = 0;
    
    allQuestions.forEach(q => {
      computedMaxScore += (q.weightage || 0);
      computedAwardedScore += (questionScores[q.id] || 0);
    });

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/assignments/${id}/evaluate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          evaluationStatus: computedStatus, 
          evaluationRemarks: remarks, 
          fieldEvaluations,
          questionScores,
          awardedScore: computedAwardedScore,
          maxScore: computedMaxScore
        })
      });
      if (res.ok) {
        navigate('/admin/evaluate-tasks');
      } else {
        alert('Failed to save evaluation.');
      }
    } catch (err) {
      alert('Error saving evaluation.');
    } finally {
      setSaving(false);
    }
  };

  const getFieldValue = (qId: string, fId: string) => {
    const qr = responses.find(r => String(r.questionId) === String(qId));
    let fr = qr?.fieldResponses?.find((fr: any) => String(fr.fieldId) === String(fId));
    if (!fr) {
      for (const resp of responses) {
        const found = resp.fieldResponses?.find((f: any) => String(f.fieldId) === String(fId));
        if (found && found.value !== undefined && found.value !== null && found.value !== '') {
          fr = found;
          break;
        }
      }
    }
    return fr && fr.value !== undefined && fr.value !== null && fr.value !== '' ? fr.value : '—';
  };
  
  const getFieldFile = (qId: string, fId: string) => {
    const qr = responses.find(r => String(r.questionId) === String(qId));
    let fr = qr?.fieldResponses?.find((fr: any) => String(fr.fieldId) === String(fId));
    if (!fr) {
      for (const resp of responses) {
        const found = resp.fieldResponses?.find((f: any) => String(f.fieldId) === String(fId));
        if (found && (found.fileUrl || (typeof found.value === 'string' && (found.value.includes('/uploads/') || found.value.startsWith('http'))))) {
          fr = found;
          break;
        }
      }
    }
    if (fr) {
      const fUrl = fr.fileUrl || (typeof fr.value === 'string' && (fr.value.includes('/uploads/') || fr.value.startsWith('http')) ? fr.value : null);
      if (fUrl) {
        return {
          ...fr,
          fileUrl: fUrl,
          fileName: fr.fileName || (typeof fr.value === 'string' ? fr.value.split('/').pop() : 'View Document')
        };
      }
    }
    return null;
  };

  const handleFieldEvalChange = (key: string, status: string) => {
    setFieldEvaluations(prev => {
      const existing = prev[key] || { status: '', remarks: '' };
      return {
        ...prev,
        [key]: { ...existing, status }
      };
    });
  };

  const handleFieldRemarkChange = (key: string, remarks: string) => {
    setFieldEvaluations(prev => {
      const existing = prev[key] || { status: '', remarks: '' };
      return {
        ...prev,
        [key]: { ...existing, remarks }
      };
    });
  };

  if (loading) return <div style={{padding: 40}}>Loading details...</div>;
  if (!assignment || !schema) return <div style={{padding: 40}}>Task not found.</div>;

  const allQuestions = schema && schema.areas ? schema.areas.flatMap(a => (a.actionPoints || []).flatMap(ap => ap.questions || [])) : [];
  
  const isFrozen = assignment.status === 'EVALUATED';
  const currentUserObj = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = currentUserObj?.role === 'SUPER_ADMIN';

  return (
    <div className="etd-container">
      {/* Header */}
      <div className="etd-header">
        <button className="etd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to Evaluation Queue
        </button>
        <div className="etd-header-main">
          <div>
            <h1>{isSuperAdmin ? 'Task Submission Review' : 'Task Evaluation'}</h1>
            <p>Reviewing submission for <strong>{assignment.userId?.state}</strong> ({assignment.userId?.name})</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="etd-status-badge">
              Status: {assignment.status}
            </div>
            {!isFrozen && !isSuperAdmin && (
              <button 
                className="etd-save-btn" 
                onClick={handleSaveEvaluation}
                disabled={saving}
                style={{ margin: 0, padding: '10px 16px' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save Evaluation
              </button>
            )}
          </div>
        </div>
        {isSuperAdmin && (
          <div style={{ marginTop: '12px', padding: '10px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>
            ℹ️ Super Admin View Mode: Direct form scoring and document status are managed by Admin. Super Admin has read-only access to view the evaluation done by Admin.
          </div>
        )}
      </div>

      <div className="etd-layout" style={{ justifyContent: 'center' }}>
        {/* Left: User Submission View */}
        <div className="etd-main" style={{ maxWidth: '900px' }}>
          <div className="etd-section-title">User's Submitted Data</div>
          <div className="etd-scroll-area">
            {allQuestions.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>No specific questions mapped for this assigned scope.</p>
                <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>The user's assigned scope may have been updated or completed.</p>
              </div>
            ) : (
              allQuestions.map(q => {
                const qr = responses.find(r => String(r.questionId) === String(q.id));
                const supportingDocs = qr?.supportingDocumentResponses || [];
                const additionalFiles = qr?.additionalFiles || [];

                return (
                  <div key={q.id} className="etd-q-card">
                    <div className="etd-q-num">Q{q.questionNumber}</div>
                    <div className="etd-q-content" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ flex: 1, paddingRight: '16px' }}>
                          <h3 style={{ margin: 0 }}>{q.title}</h3>
                        {q.guidelinesRef && (
                          <div style={{ marginTop: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BookOpen size={15} color="#4f46e5" />
                            <span style={{ fontWeight: 600, color: '#475569' }}>Guidelines:</span>
                            {(() => {
                              const edObj = (assignment as any)?.editionId || (assignment as any)?.edition;
                              const rawEd = typeof edObj === 'object' ? (edObj?._id || edObj?.id) : edObj;
                              const activeEd = String(rawEd || '').trim();
                              const baseUrl = `${API_BASE_URL}/api/guidelines/${activeEd}.pdf`;
                              const match = q.guidelinesRef.match(/page\s*(\d+)/i) || q.guidelinesRef.match(/(\d+)/);
                              const href = match ? `${baseUrl}#page=${match[1]}` : baseUrl;
                              console.log('[FRONTEND EVALUATE TASK GUIDELINES LINK]', { inputEdition: edObj, resolvedId: activeEd, href });
                              return (
                                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600 }}>
                                  {q.guidelinesRef}
                                </a>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      {(q.weightage || 0) > 0 && (
                        <div className="etd-q-score-input" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Score:</span>
                          <input 
                            type="number" 
                            disabled={isFrozen || isSuperAdmin}
                            max={q.weightage || 0}
                            min={0}
                            value={questionScores[q.id] ?? ''}
                            onChange={e => {
                              if (isSuperAdmin) return;
                              let val = parseInt(e.target.value);
                              if (isNaN(val)) val = 0;
                              if (val > (q.weightage || 0)) val = q.weightage || 0;
                              if (val < 0) val = 0;
                              setQuestionScores(prev => ({...prev, [q.id]: val}));
                            }}
                            style={{ width: '50px', textAlign: 'center', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600, cursor: isSuperAdmin ? 'not-allowed' : 'text' }}
                          /> 
                          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>/ {q.weightage || 0} pts</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="etd-fields">
                      {q.fields.map(f => {
                        const isDocField = f.type === 'file' || f.type === 'pdf' || f.label.toLowerCase().includes('document') || f.label.toLowerCase().includes('pdf') || f.label.toLowerCase().includes('upload');
                        const file = getFieldFile(q.id, f.id);
                        const val = getFieldValue(q.id, f.id);
                        const fieldKey = `${q.id}_${f.id}`;

                        if (file) {
                          const evalData = fieldEvaluations[fieldKey] || { status: file.evaluationStatus || 'PENDING', remarks: file.evaluationRemarks || '' };

                          return (
                            <div key={f.id} className="etd-field">
                              <div className="etd-field-label">{f.label}</div>
                              <div className="etd-file-eval-box">
                                <button 
                                  onClick={() => openDocumentPreview(file.fileUrl, file.fileName)}
                                  className="etd-file-link"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600, padding: 0 }}
                                >
                                  <Paperclip size={14} /> {file.fileName || 'View Document'}
                                </button>
                                {isSuperAdmin ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                      <span style={{ fontWeight: 600, color: '#475569' }}>Status:</span>
                                      <span className={`etd-fe-status-badge ${evalData.status || 'PENDING'}`}>
                                        {evalData.status === 'RESUBMISSION_REQUIRED' ? 'RESUBMIT' : (evalData.status || 'PENDING')}
                                      </span>
                                    </div>
                                    {evalData.remarks && (
                                      <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <strong>Admin Remarks:</strong> {evalData.remarks}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <div className="etd-field-eval-controls">
                                      <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[fieldKey]?.status === 'APPROVED' ? 'active approve' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(fieldKey, 'APPROVED') }}>Approve</button>
                                      <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[fieldKey]?.status === 'RESUBMISSION_REQUIRED' ? 'active resubmit' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(fieldKey, 'RESUBMISSION_REQUIRED') }}>Resubmit</button>
                                      <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[fieldKey]?.status === 'REJECTED' ? 'active reject' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(fieldKey, 'REJECTED') }}>Reject</button>
                                    </div>
                                    <input 
                                      type="text" 
                                      className="etd-fe-remark" 
                                      placeholder="Remarks for this file..." 
                                      value={fieldEvaluations[fieldKey]?.remarks || ''}
                                      onChange={(e) => handleFieldRemarkChange(fieldKey, e.target.value)}
                                      disabled={isFrozen}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        }

                        if (isDocField && supportingDocs.length > 0) {
                          return (
                            <div key={f.id} className="etd-field">
                              <div className="etd-field-label">{f.label}</div>
                              {supportingDocs.map((docResp: any) => (
                                (docResp.files || []).map((sf: any) => {
                                  const sfKey = `${q.id}_${sf.fileId}`;
                                  const docKey = `${q.id}_${docResp.documentId}`;
                                  const activeKey = fieldEvaluations[sfKey] ? sfKey : docKey;
                                  const evalData = fieldEvaluations[activeKey] || { status: sf.evaluationStatus || docResp.evaluationStatus || 'PENDING', remarks: sf.evaluationRemarks || docResp.evaluationRemarks || '' };

                                  return (
                                    <div key={sf.fileId || sf._id} className="etd-file-eval-box" style={{ marginBottom: '12px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <button 
                                          onClick={() => openDocumentPreview(sf.fileUrl, sf.fileName)}
                                          className="etd-file-link"
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600, padding: 0 }}
                                        >
                                          <Paperclip size={14} /> {sf.fileName || 'View Submitted Document'}
                                        </button>
                                      </div>
                                      {(docResp.issuedBy || docResp.issueDate || docResp.validTill || docResp.remarks) && (
                                        <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px' }}>
                                          {docResp.issuedBy && <span style={{ marginRight: '12px' }}><strong>Issued By:</strong> {docResp.issuedBy}</span>}
                                          {docResp.issueDate && <span style={{ marginRight: '12px' }}><strong>Issue Date:</strong> {docResp.issueDate}</span>}
                                          {docResp.validTill && <span style={{ marginRight: '12px' }}><strong>Valid Till:</strong> {docResp.validTill}</span>}
                                          {docResp.remarks && <span><strong>Remarks:</strong> {docResp.remarks}</span>}
                                        </div>
                                      )}
                                      {isSuperAdmin ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                            <span style={{ fontWeight: 600, color: '#475569' }}>Status:</span>
                                            <span className={`etd-fe-status-badge ${evalData.status || 'PENDING'}`}>
                                              {evalData.status === 'RESUBMISSION_REQUIRED' ? 'RESUBMIT' : (evalData.status || 'PENDING')}
                                            </span>
                                          </div>
                                          {evalData.remarks && (
                                            <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                              <strong>Admin Remarks:</strong> {evalData.remarks}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <>
                                          <div className="etd-field-eval-controls">
                                            <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[activeKey]?.status === 'APPROVED' ? 'active approve' : ''}`} onClick={() => { if (!isFrozen) { handleFieldEvalChange(sfKey, 'APPROVED'); handleFieldEvalChange(docKey, 'APPROVED'); } }}>Approve</button>
                                            <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[activeKey]?.status === 'RESUBMISSION_REQUIRED' ? 'active resubmit' : ''}`} onClick={() => { if (!isFrozen) { handleFieldEvalChange(sfKey, 'RESUBMISSION_REQUIRED'); handleFieldEvalChange(docKey, 'RESUBMISSION_REQUIRED'); } }}>Resubmit</button>
                                            <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[activeKey]?.status === 'REJECTED' ? 'active reject' : ''}`} onClick={() => { if (!isFrozen) { handleFieldEvalChange(sfKey, 'REJECTED'); handleFieldEvalChange(docKey, 'REJECTED'); } }}>Reject</button>
                                          </div>
                                          <input 
                                            type="text" 
                                            className="etd-fe-remark" 
                                            placeholder="Remarks for this document..." 
                                            value={fieldEvaluations[activeKey]?.remarks || ''}
                                            onChange={(e) => { handleFieldRemarkChange(sfKey, e.target.value); handleFieldRemarkChange(docKey, e.target.value); }}
                                            disabled={isFrozen}
                                          />
                                        </>
                                      )}
                                    </div>
                                  );
                                })
                              ))}
                            </div>
                          );
                        }

                        return (
                          <div key={f.id} className="etd-field">
                            <div className="etd-field-label">{f.label}</div>
                            <div className="etd-field-val">
                              {Array.isArray(val) ? val.join(', ') : val}
                            </div>
                          </div>
                        );
                      })}

                      {/* Fallback for supportingDocs if not mapped to a specific doc field */}
                      {supportingDocs.length > 0 && !q.fields.some(f => f.type === 'file' || f.type === 'pdf' || f.label.toLowerCase().includes('document') || f.label.toLowerCase().includes('pdf') || f.label.toLowerCase().includes('upload')) && (
                        <div className="etd-field">
                          <div className="etd-field-label">Uploaded Supporting Documents</div>
                          {supportingDocs.map((docResp: any) => (
                            (docResp.files || []).map((sf: any) => {
                              const sfKey = `${q.id}_${sf.fileId}`;
                              const docKey = `${q.id}_${docResp.documentId}`;
                              const activeKey = fieldEvaluations[sfKey] ? sfKey : docKey;
                              const evalData = fieldEvaluations[activeKey] || { status: sf.evaluationStatus || docResp.evaluationStatus || 'PENDING', remarks: sf.evaluationRemarks || docResp.evaluationRemarks || '' };

                              return (
                                <div key={sf.fileId || sf._id} className="etd-file-eval-box" style={{ marginBottom: '12px' }}>
                                  <button 
                                    onClick={() => openDocumentPreview(sf.fileUrl, sf.fileName)}
                                    className="etd-file-link"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600, padding: 0 }}
                                  >
                                    <Paperclip size={14} /> {sf.fileName || 'View Submitted Document'}
                                  </button>
                                  {(docResp.issuedBy || docResp.issueDate || docResp.validTill || docResp.remarks) && (
                                    <div style={{ fontSize: '12px', color: '#475569', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '6px', margin: '6px 0' }}>
                                      {docResp.issuedBy && <span style={{ marginRight: '12px' }}><strong>Issued By:</strong> {docResp.issuedBy}</span>}
                                      {docResp.issueDate && <span style={{ marginRight: '12px' }}><strong>Issue Date:</strong> {docResp.issueDate}</span>}
                                      {docResp.validTill && <span style={{ marginRight: '12px' }}><strong>Valid Till:</strong> {docResp.validTill}</span>}
                                      {docResp.remarks && <span><strong>Remarks:</strong> {docResp.remarks}</span>}
                                    </div>
                                  )}
                                  {isSuperAdmin ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                        <span style={{ fontWeight: 600, color: '#475569' }}>Status:</span>
                                        <span className={`etd-fe-status-badge ${evalData.status || 'PENDING'}`}>
                                          {evalData.status === 'RESUBMISSION_REQUIRED' ? 'RESUBMIT' : (evalData.status || 'PENDING')}
                                        </span>
                                      </div>
                                      {evalData.remarks && (
                                        <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                          <strong>Admin Remarks:</strong> {evalData.remarks}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div className="etd-field-eval-controls">
                                        <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[activeKey]?.status === 'APPROVED' ? 'active approve' : ''}`} onClick={() => { if (!isFrozen) { handleFieldEvalChange(sfKey, 'APPROVED'); handleFieldEvalChange(docKey, 'APPROVED'); } }}>Approve</button>
                                        <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[activeKey]?.status === 'RESUBMISSION_REQUIRED' ? 'active resubmit' : ''}`} onClick={() => { if (!isFrozen) { handleFieldEvalChange(sfKey, 'RESUBMISSION_REQUIRED'); handleFieldEvalChange(docKey, 'RESUBMISSION_REQUIRED'); } }}>Resubmit</button>
                                        <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[activeKey]?.status === 'REJECTED' ? 'active reject' : ''}`} onClick={() => { if (!isFrozen) { handleFieldEvalChange(sfKey, 'REJECTED'); handleFieldEvalChange(docKey, 'REJECTED'); } }}>Reject</button>
                                      </div>
                                      <input 
                                        type="text" 
                                        className="etd-fe-remark" 
                                        placeholder="Remarks for this document..." 
                                        value={fieldEvaluations[activeKey]?.remarks || ''}
                                        onChange={(e) => { handleFieldRemarkChange(sfKey, e.target.value); handleFieldRemarkChange(docKey, e.target.value); }}
                                        disabled={isFrozen}
                                      />
                                    </>
                                  )}
                                </div>
                              );
                            })
                          ))}
                        </div>
                      )}

                      {/* Additional files if present */}
                      {additionalFiles.length > 0 && (
                        <div className="etd-field">
                          <div className="etd-field-label">Uploaded Additional Files</div>
                          {additionalFiles.map((af: any) => {
                            const afLinkUrl = af.fileUrl.startsWith('http') ? af.fileUrl : `${API_BASE_URL}${af.fileUrl}`;
                            const afKey = `${q.id}_${af.fileId}`;
                            const evalData = fieldEvaluations[afKey] || { status: af.evaluationStatus || 'PENDING', remarks: af.evaluationRemarks || '' };

                            return (
                              <div key={af.fileId || af._id} className="etd-file-eval-box" style={{ marginBottom: '12px' }}>
                                <a href={afLinkUrl} target="_blank" rel="noopener noreferrer" className="etd-file-link">
                                  <Paperclip size={14} /> {af.fileName || 'View Additional File'}
                                </a>
                                {isSuperAdmin ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                      <span style={{ fontWeight: 600, color: '#475569' }}>Status:</span>
                                      <span className={`etd-fe-status-badge ${evalData.status || 'PENDING'}`}>
                                        {evalData.status === 'RESUBMISSION_REQUIRED' ? 'RESUBMIT' : (evalData.status || 'PENDING')}
                                      </span>
                                    </div>
                                    {evalData.remarks && (
                                      <div style={{ fontSize: '13px', color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <strong>Admin Remarks:</strong> {evalData.remarks}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <div className="etd-field-eval-controls">
                                      <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[afKey]?.status === 'APPROVED' ? 'active approve' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(afKey, 'APPROVED') }}>Approve</button>
                                      <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[afKey]?.status === 'RESUBMISSION_REQUIRED' ? 'active resubmit' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(afKey, 'RESUBMISSION_REQUIRED') }}>Resubmit</button>
                                      <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[afKey]?.status === 'REJECTED' ? 'active reject' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(afKey, 'REJECTED') }}>Reject</button>
                                    </div>
                                    <input 
                                      type="text" 
                                      className="etd-fe-remark" 
                                      placeholder="Remarks for this file..." 
                                      value={fieldEvaluations[afKey]?.remarks || ''}
                                      onChange={(e) => handleFieldRemarkChange(afKey, e.target.value)}
                                      disabled={isFrozen}
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EvaluateTaskDetail;
