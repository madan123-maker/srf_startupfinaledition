import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileText, Loader2, AlertCircle, Download, Eye, BookOpen, Award, RotateCcw, Paperclip } from 'lucide-react';
import './AdminSubmissionView.css';
import { API_BASE_URL } from '../config/api';

import { openDocumentPreview, downloadDocument } from '../utils/documentUtils';

interface FieldResponse {
  fieldId: string;
  value: any;
  fileUrl?: string;
  fileName?: string;
  status?: 'DRAFT' | 'SUBMITTED';
  evaluationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  evaluationRemarks?: string;
  googleDriveFileId?: string;
  history?: {
    fileUrl: string;
    fileName: string;
    evaluationStatus: string;
    evaluationRemarks?: string;
    submittedAt: string;
  }[];
}

interface QuestionResponse {
  questionId: string;
  score?: number;
  isApplying?: boolean;
  fieldResponses: FieldResponse[];
  additionalFiles?: {
    fileId: string;
    fileUrl: string;
    fileName: string;
    status: 'DRAFT' | 'SUBMITTED';
    evaluationStatus: string;
    evaluationRemarks?: string;
    history?: {
      fileUrl: string;
      fileName: string;
      evaluationStatus: string;
      evaluationRemarks?: string;
      submittedAt: string;
    }[];
  }[];
  supportingDocumentResponses?: {
    documentId: string;
    files: {
      fileId: string;
      fileUrl: string;
      fileName: string;
      status?: string;
      evaluationStatus?: string;
      evaluationRemarks?: string;
      submittedAt?: string;
      history?: any[];
    }[];
  }[];
}

interface Submission {
  _id: string;
  editionId?: any;
  userId: { _id: string; name: string; email: string };
  stateName: string;
  status: string;
  totalScore: number;
  isConsolidated?: boolean;
  responses: QuestionResponse[];
  createdAt: string;
}

export default function AdminSubmissionView() {
  const { editionId, id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canEvaluate = currentUser?.role !== 'SUPER_ADMIN' && !submission?.isConsolidated;

  // Fetch both the Submission and the Edition (Schema)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/admin-login');
          return;
        }

        const [subRes, schemaRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/submissions/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/schemas/${editionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API_BASE_URL}/api/evaluations/submission/${id}/summary`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!subRes.ok || !schemaRes.ok) {
          throw new Error('Failed to load application data');
        }

        const subData = await subRes.json();
        const schemaData = await schemaRes.json();
        
        let summaryData = null;
        if (summaryRes.ok) {
          summaryData = await summaryRes.json();
        }

        setSubmission(subData);
        setSchema(schemaData);
        setSummary(summaryData);
      } catch (err: any) {
        setError(err.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, editionId, navigate]);

  const handleEvaluateDocument = async (questionId: string, fieldId: string, status: 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED', isAdditionalFile = false) => {
    let remarks = '';
    if (status === 'REJECTED' || status === 'RESUBMISSION_REQUIRED') {
      const actionStr = status === 'REJECTED' ? 'rejecting' : 'asking to resubmit';
      const input = window.prompt(`Please provide a reason for ${actionStr} this document:`);
      if (input === null) return; // User cancelled
      if (!input.trim()) {
        alert('Remarks are required.');
        return;
      }
      remarks = input.trim();
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/submissions/${id}/evaluate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionId, fieldId, status, remarks, isAdditionalFile })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const updatedSubmission = await res.json();
      setSubmission(updatedSubmission);
      
      // Fetch updated summary to reflect score changes
      const summaryRes = await fetch(`${API_BASE_URL}/api/evaluations/submission/${id}/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to evaluate document: ${err.message}`);
    }
  };

  const handleEvaluateSupportingDocument = async (questionId: string, documentId: string, fileId: string, status: 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED') => {
    let remarks = '';
    if (status === 'REJECTED' || status === 'RESUBMISSION_REQUIRED') {
      const input = window.prompt(`Please provide a reason for marking this document as ${status.replace('_', ' ')}:`);
      if (input === null) return; // User cancelled
      if (!input.trim()) {
        alert('Remarks are required.');
        return;
      }
      remarks = input.trim();
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/submissions/${id}/evaluate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionId, fieldId: fileId, documentId, status, remarks, isSupportingDocument: true })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const updatedSubmission = await res.json();
      setSubmission(updatedSubmission);

      // Fetch updated summary to reflect score changes
      const summaryRes = await fetch(`${API_BASE_URL}/api/evaluations/submission/${id}/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Failed to evaluate supporting document: ${err.message}`);
    }
  };





  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
        <Loader2 className="animate-spin" size={40} color="#4f46e5" />
        <p style={{ color: '#64748b', fontWeight: 500 }}>Loading Application Data...</p>
      </div>
    );
  }

  if (error || !submission || !schema) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={40} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
        <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>Error</h3>
        <p style={{ color: '#64748b' }}>{error || 'Application not found'}</p>
        <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="admin-submission-view">
      <div className="admin-sub-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>
        <div className="header-content">
          <div className="title-section">
            <h2>{submission.stateName}</h2>
            <span className={`status-badge ${submission.status.toLowerCase()}`}>
              {submission.status.replace('_', ' ')}
            </span>
          </div>
          <div className="meta-info">
            <div className="meta-item">
              <span className="label">Total Score</span>
              <span className="value">{submission.totalScore}</span>
            </div>
            <div className="meta-item">
              <span className="label">Submitted Date</span>
              <span className="value">{new Date(submission.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

        {schema?.areas?.map((area: any) => {
          return (
            <div key={area.id} className="area-section">
              <h3 className="area-title">{area.title}</h3>
            
            {area.actionPoints?.map((ap: any) => (
              <div key={ap.id} className="action-point-section">
                <h4 className="ap-title">{ap.title}</h4>
                
                {ap.questions?.map((q: any) => {
                  const qResp = submission?.responses?.find((r: any) => r.questionId === q.id);
                  const fieldResponses = qResp?.fieldResponses || [];
                  
                  return (
                    <div key={q.id} className="question-card" style={{ padding: '24px' }}>
                      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ fontWeight: 800, fontSize: '20px', color: '#1e1b4b', lineHeight: '1.4', flex: 1 }}>
                            <span style={{ color: '#6366f1', marginRight: '8px' }}>{q.id.toUpperCase().replace('_', '.')}.</span>
                            {q.title || q.text}
                          </div>
                          
                          {(() => {
                            let qSummary = null;
                            if (summary?.reformAreas) {
                              for (const area of summary.reformAreas) {
                                for (const ap of area.actionPoints) {
                                  const qs = ap.questions.find((x: any) => x.id === q.id);
                                  if (qs) { qSummary = qs; break; }
                                }
                                if (qSummary) break;
                              }
                            }
                            
                            let awardedVal = 0;
                            const isExplicitlyApproved = fieldResponses.some((f: any) => f.evaluationStatus === 'APPROVED') ||
                              (qResp?.supportingDocumentResponses || []).some((d: any) => d.files?.some((f: any) => f.evaluationStatus === 'APPROVED')) ||
                              (qResp?.additionalFiles || []).some((f: any) => f.evaluationStatus === 'APPROVED');

                            if (qSummary && qSummary.awarded > 0) {
                              awardedVal = qSummary.awarded;
                            } else if (isExplicitlyApproved && qResp && qResp.score !== undefined && qResp.score !== null && qResp.score > 0) {
                              awardedVal = qResp.score;
                            } else if (isExplicitlyApproved) {
                              awardedVal = q.maxScore || q.weightage || 1;
                            }

                            const maxVal = qSummary ? qSummary.max : (q.maxScore || q.weightage || 1);
                            
                            return (
                              <div style={{ 
                                display: 'flex', flexDirection: 'column', alignItems: 'flex-end', 
                                background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', 
                                border: '1px solid #e2e8f0', minWidth: '140px' 
                              }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Awarded Score
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#4338ca', marginTop: '4px' }}>
                                  {awardedVal} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ {maxVal}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div className="elegant-details-box">
                          {q.guidelinesRef && (
                            <div className="elegant-detail-item">
                              <BookOpen size={16} className="detail-icon guidelines" />
                              <span className="detail-label">Guidelines:</span> 
                              {(() => {
                                const rawEd = editionId || (submission as any)?.editionId;
                                const edId = typeof rawEd === 'object' ? (rawEd?._id || rawEd?.id) : rawEd;
                                const activeEd = edId || '';
                                const baseUrl = `${API_BASE_URL}/api/guidelines/${activeEd}.pdf`;
                                const match = q.guidelinesRef.match(/page\s*(\d+)/i) || q.guidelinesRef.match(/(\d+)/);
                                const href = match ? `${baseUrl}#page=${match[1]}` : baseUrl;
                                console.log('[FRONTEND GUIDELINES LINK OPENED]', { guidelinesRef: q.guidelinesRef, editionId: activeEd, href });
                                return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{q.guidelinesRef}</a>;
                              })()}
                            </div>
                          )}
                          {q.scoringCriteria && (
                            <div className="elegant-detail-item">
                              <Award size={16} className="detail-icon scoring" />
                              <span className="detail-label">Scoring Criteria:</span> <span style={{ color: '#475569' }}>{q.scoringCriteria}</span>
                            </div>
                          )}
                          {q.requiredDocuments && (
                            <div className="elegant-detail-item evidence">
                              <FileText size={16} className="detail-icon evidence-icon" />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="detail-label evidence-label">Required Evidence:</span> 
                                <span className="evidence-value">{q.requiredDocuments}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="responses-grid">
                        {q.fields?.map((field: any) => {
                          const resp = fieldResponses.find((r: any) => r.fieldId === field.id);
                          const fieldType = (field.type || '').toLowerCase();
                          const isFile = fieldType.includes('file') || fieldType.includes('pdf') || fieldType.includes('image') || fieldType.includes('upload') || Boolean(resp?.fileUrl);

                          if (!resp) {
                            if (field.type === 'Heading' || field.type === 'Sub Heading' || field.type === 'Instruction' || field.type === 'Description') {
                              return null;
                            }
                            return (
                              <div key={field.id} className="response-item">
                                <span className="field-label">{field.label}</span>
                                <div className="field-value">
                                  <span className="empty-val">{isFile ? 'No document uploaded' : 'Not provided'}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={field.id} className="response-item">
                              <span className="field-label">{field.label}</span>
                              
                              {!isFile ? (
                                <div className="field-value">
                                  {resp.value ? resp.value.toString() : <span className="empty-val">Not provided</span>}
                                </div>
                              ) : (
                                <div className="document-eval-card">
                                  {resp.fileUrl ? (
                                    <div className="doc-content">
                                      <div className="doc-link-container">
                                        <button 
                                          onClick={() => resp.googleDriveFileId ? window.open(resp.fileUrl, '_blank') : openDocumentPreview(resp.fileUrl, resp.fileName)}
                                          className="doc-link"
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600 }}
                                        >
                                          <FileText size={18} />
                                          {resp.fileName || 'Document'}
                                        </button>
                                        <button 
                                          onClick={() => resp.googleDriveFileId ? window.open(resp.fileUrl, '_blank') : openDocumentPreview(resp.fileUrl, resp.fileName)}
                                          className="icon-action-btn view-btn"
                                          title="View Document"
                                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}
                                        >
                                          <Eye size={16} />
                                        </button>
                                        <button 
                                          onClick={() => resp.googleDriveFileId ? window.open(resp.fileUrl, '_blank') : downloadDocument(resp.fileUrl, resp.fileName || 'Document')}
                                          className="icon-action-btn download-btn"
                                          title="Download Document"
                                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}
                                        >
                                          <Download size={16} />
                                        </button>
                                      </div>
                                      
                                      <div className="eval-controls">
                                        {resp.evaluationStatus === 'APPROVED' && (
                                          <div className="status-indicator approved">
                                            <CheckCircle size={16} /> Approved (Saved in Database)
                                          </div>
                                        )}
                                        {resp.evaluationStatus === 'REJECTED' && (
                                          <div className="status-indicator rejected">
                                            <XCircle size={16} /> Rejected: {resp.evaluationRemarks}
                                          </div>
                                        )}
                                        {resp.evaluationStatus === 'RESUBMISSION_REQUIRED' && (
                                          <div className="status-indicator" style={{ color: '#ea580c', backgroundColor: '#ffedd5', padding: '6px 12px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                                            <RotateCcw size={16} /> Ask Resubmission: {resp.evaluationRemarks}
                                          </div>
                                        )}
                                        {(!resp.evaluationStatus || resp.evaluationStatus === 'PENDING') && (
                                          canEvaluate ? (
                                            <div className="action-buttons" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', marginTop: '8px', width: '100%' }}>
                                              <button 
                                                className="btn-approve"
                                                style={{ flex: 1, padding: '6px 8px', fontSize: '11px', justifyContent: 'center' }}
                                                onClick={() => handleEvaluateDocument(q.id, field.id, 'APPROVED')}
                                              >
                                                Approve & Save to Drive
                                              </button>
                                              <button 
                                                className="btn-reject"
                                                style={{ flex: 1, padding: '6px 8px', fontSize: '11px', justifyContent: 'center' }}
                                                onClick={() => handleEvaluateDocument(q.id, field.id, 'REJECTED')}
                                              >
                                                Reject
                                              </button>
                                              <button 
                                                className="btn-outline"
                                                style={{ flex: 1, padding: '6px 8px', fontSize: '11px', borderColor: '#ea580c', color: '#ea580c', justifyContent: 'center' }}
                                                onClick={() => handleEvaluateDocument(q.id, field.id, 'RESUBMISSION_REQUIRED')}
                                              >
                                                Ask Resubmit
                                              </button>
                                            </div>
                                          ) : (
                                            <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '6px' }}>Pending Evaluation</div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                    ) : (
                                      <span className="empty-val">No document uploaded</span>
                                    )}
                                  
                                  {resp.history && resp.history.length > 0 && (
                                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Previously Rejected Documents</div>
                                      {resp.history.map((hist, idx) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: idx !== resp.history!.length - 1 ? '6px' : '0' }}>
                                          <span
                                            onClick={() => downloadDocument(hist.fileUrl, hist.fileName)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500, cursor: 'pointer' }}
                                          >
                                            <Paperclip size={12} /> {hist.fileName}
                                          </span>
                                          {hist.evaluationRemarks && (
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                                              Remarks: {hist.evaluationRemarks}
                                            </div>
                                          )}
                                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                                            Rejected on: {new Date(hist.submittedAt).toLocaleDateString()}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Supporting Documents section */}
                      {(() => {
                        if (!qResp || !qResp.supportingDocumentResponses || qResp.supportingDocumentResponses.length === 0) return null;
                        
                        return (
                          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <h5 style={{ fontSize: '15px', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <BookOpen size={16} color="#4f46e5" /> Schema-Driven Supporting Documents
                            </h5>
                            
                            <div className="responses-grid" style={{ gridTemplateColumns: '1fr' }}>
                              {qResp.supportingDocumentResponses.map((docResp: any) => {
                                const validFiles = docResp.files?.filter((f: any) => f.fileUrl) || [];
                                if (validFiles.length === 0) return null;

                                return (
                                  <div key={docResp.documentId} style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '12px', textTransform: 'uppercase' }}>Requirement ID: {docResp.documentId}</div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                                      {validFiles.map((file: any) => (
                                        <div key={file.fileId} className="document-eval-card" style={{ margin: 0 }}>
                                          <div className="doc-content" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '12px' }}>
                                            <div className="doc-link-container">
                                              <button 
                                                onClick={() => openDocumentPreview(file.fileUrl, file.fileName)}
                                                className="doc-link"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600 }}
                                              >
                                                <FileText size={18} /> {file.fileName}
                                              </button>
                                              <button 
                                                onClick={() => downloadDocument(file.fileUrl, file.fileName)}
                                                className="icon-action-btn download-btn"
                                                title="Download Document"
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}
                                              >
                                                <Download size={16} />
                                              </button>
                                            </div>
                                            <div className="eval-controls">
                                              {file.evaluationStatus === 'APPROVED' && (
                                                <div className="status-indicator approved">
                                                  <CheckCircle size={16} /> Approved
                                                </div>
                                              )}
                                              {file.evaluationStatus === 'REJECTED' && (
                                                <div className="status-indicator rejected">
                                                  <XCircle size={16} /> Rejected: {file.evaluationRemarks}
                                                </div>
                                              )}
                                              {file.evaluationStatus === 'RESUBMISSION_REQUIRED' && (
                                                <div className="status-indicator" style={{ color: '#ea580c', backgroundColor: '#ffedd5' }}>
                                                  <RotateCcw size={16} /> Ask Resubmission: {file.evaluationRemarks}
                                                </div>
                                              )}
                                              {(!file.evaluationStatus || file.evaluationStatus === 'PENDING') && (
                                                canEvaluate ? (
                                                  <div className="action-buttons" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', marginTop: '8px', width: '100%' }}>
                                                    <button className="btn-approve" onClick={() => handleEvaluateSupportingDocument(q.id, docResp.documentId, file.fileId, 'APPROVED')} style={{ flex: 1, padding: '6px 8px', fontSize: '11px', justifyContent: 'center' }}>
                                                      Approve
                                                    </button>
                                                    <button className="btn-reject" onClick={() => handleEvaluateSupportingDocument(q.id, docResp.documentId, file.fileId, 'REJECTED')} style={{ flex: 1, padding: '6px 8px', fontSize: '11px', justifyContent: 'center' }}>
                                                      Reject
                                                    </button>
                                                    <button className="btn-outline" onClick={() => handleEvaluateSupportingDocument(q.id, docResp.documentId, file.fileId, 'RESUBMISSION_REQUIRED')} style={{ flex: 1, padding: '6px 8px', fontSize: '11px', borderColor: '#ea580c', color: '#ea580c', justifyContent: 'center' }}>
                                                      Ask Resubmit
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '6px' }}>Pending Evaluation</div>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {q.additionalFiles && q.additionalFiles.filter((af: any) => af.fileUrl).length > 0 && (
                        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                          <h5 style={{ fontSize: '13px', color: '#475569', marginBottom: '12px' }}>Additional Evidence Documents</h5>
                          <div className="responses-grid">
                            {q.additionalFiles.filter((af: any) => af.fileUrl).map((af: any) => (
                              <div key={af.fileId} className="response-item">
                                <div className="document-eval-card">
                                  <div className="doc-content">
                                    <div className="doc-link-container">
                                      <button 
                                        onClick={() => openDocumentPreview(af.fileUrl, af.fileName)}
                                        className="doc-link"
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600 }}
                                      >
                                        <FileText size={18} /> {af.fileName}
                                      </button>
                                      <button 
                                        onClick={() => downloadDocument(af.fileUrl, af.fileName)}
                                        className="icon-action-btn download-btn"
                                        title="Download Document"
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '6px' }}
                                      >
                                        <Download size={16} />
                                      </button>
                                    </div>
                                    <div className="eval-controls">
                                      {af.evaluationStatus === 'APPROVED' && (
                                        <div className="status-indicator approved">
                                          <CheckCircle size={16} /> Approved
                                        </div>
                                      )}
                                      {af.evaluationStatus === 'REJECTED' && (
                                        <div className="status-indicator rejected">
                                          <XCircle size={16} /> Rejected: {af.evaluationRemarks}
                                        </div>
                                      )}
                                      {(!af.evaluationStatus || af.evaluationStatus === 'PENDING') && (
                                        canEvaluate ? (
                                          <div className="action-buttons">
                                            <button className="btn-approve" onClick={() => handleEvaluateDocument(q.id, af.fileId, 'APPROVED', true)}>
                                              Approve
                                            </button>
                                            <button className="btn-reject" onClick={() => handleEvaluateDocument(q.id, af.fileId, 'REJECTED', true)}>
                                              Reject
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '6px' }}>Pending Evaluation</div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                  
                                  {af.history && af.history.length > 0 && (
                                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Previously Rejected</div>
                                      {af.history.map((hist: any, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: idx !== af.history.length - 1 ? '6px' : '0' }}>
                                          <button 
                                            onClick={() => openDocumentPreview(hist.fileUrl, hist.fileName)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}
                                          >
                                            <Paperclip size={12} /> {hist.fileName}
                                          </button>
                                          {hist.evaluationRemarks && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>Remarks: {hist.evaluationRemarks}</div>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
