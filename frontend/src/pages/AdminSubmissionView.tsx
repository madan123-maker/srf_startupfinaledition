import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileText, Loader2, AlertCircle, Download, Eye, BookOpen, Award, RotateCcw } from 'lucide-react';
import './AdminSubmissionView.css';

interface FieldResponse {
  fieldId: string;
  value: any;
  fileUrl?: string;
  fileName?: string;
  status?: 'DRAFT' | 'SUBMITTED';
  evaluationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
}

interface Submission {
  _id: string;
  userId: { _id: string; name: string; email: string };
  stateName: string;
  status: string;
  totalScore: number;
  responses: QuestionResponse[];
  createdAt: string;
}

export default function AdminSubmissionView() {
  const { editionId, id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<any>(null);
  const [schema, setSchema] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          fetch(`http://localhost:5001/api/submissions/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`http://localhost:5001/api/schemas/${editionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`http://localhost:5001/api/evaluations/submission/${id}/summary`, {
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
      const res = await fetch(`http://localhost:5001/api/submissions/${id}/evaluate-document`, {
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
      const summaryRes = await fetch(`http://localhost:5001/api/evaluations/submission/${id}/summary`, {
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
      const res = await fetch(`http://localhost:5001/api/submissions/${id}/evaluate-document`, {
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
      const summaryRes = await fetch(`http://localhost:5001/api/evaluations/submission/${id}/summary`, {
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

  const getQuestionResponses = (questionId: string) => {
    return submission?.responses.find(r => r.questionId === questionId)?.fieldResponses || [];
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName || 'Document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download file. It might not be available or there is a network issue.');
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

      <div className="submission-content">
        {schema?.areas?.map((area: any) => (
          <div key={area.id} className="area-section">
            <h3 className="area-title">{area.title}</h3>
            
            {area.actionPoints?.map((ap: any) => (
              <div key={ap.id} className="action-point-section">
                <h4 className="ap-title">{ap.title}</h4>
                
                {ap.questions?.map((q: any) => {
                  const qResp = submission?.responses?.find((r: any) => r.questionId === q.id);
                  const fieldResponses = qResp?.fieldResponses || [];
                  
                  // Check if there are any submitted fields, supporting documents, or additional files
                  const submittedFields = fieldResponses.filter((r: any) => (r.value !== undefined && r.value !== '') || r.fileUrl);
                  const hasSupportingDocs = qResp?.supportingDocumentResponses?.some((doc: any) => doc.files?.some((f: any) => f.fileUrl));
                  const hasAdditionalFiles = qResp?.additionalFiles?.some((af: any) => af.fileUrl);

                  if (submittedFields.length === 0 && !hasSupportingDocs && !hasAdditionalFiles) return null; // Skip unanswered questions
                  
                  return (
                    <div key={q.id} className="question-card" style={{ padding: '24px' }}>
                      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                          <div style={{ fontWeight: 800, fontSize: '20px', color: '#1e1b4b', lineHeight: '1.4', flex: 1 }}>
                            <span style={{ color: '#6366f1', marginRight: '8px' }}>{q.id.toUpperCase().replace('_', '.')}.</span>
                            {q.title || q.text}
                          </div>
                          
                          {(() => {
                            if (!summary) return null;
                            let qSummary = null;
                            for (const area of summary.reformAreas) {
                              for (const ap of area.actionPoints) {
                                const qs = ap.questions.find((x: any) => x.id === q.id);
                                if (qs) { qSummary = qs; break; }
                              }
                              if (qSummary) break;
                            }
                            if (!qSummary) return null;
                            
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
                                  {qSummary.awarded} <span style={{ fontSize: '14px', color: '#94a3b8' }}>/ {qSummary.max}</span>
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
                              {q.guidelinesRef.toLowerCase().includes('page') 
                                ? (() => {
                                    const match = q.guidelinesRef.match(/page\s*(\d+)/i);
                                    const href = match ? `/guidelines.pdf#page=${match[1]}` : `/guidelines.pdf`;
                                    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{q.guidelinesRef}</a>;
                                  })()
                                : <span style={{ color: '#475569' }}>{q.guidelinesRef}</span>}
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
                          const resp = submittedFields.find((r: any) => r.fieldId === field.id);
                          if (!resp) return null;

                          const isFile = field.type === 'File Upload' || field.type === 'PDF Upload';

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
                                        <a 
                                          href={resp.googleDriveFileId ? resp.fileUrl : `http://localhost:5001${resp.fileUrl}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="doc-link"
                                        >
                                          <FileText size={18} />
                                          {resp.fileName || 'Document'}
                                        </a>
                                        <a 
                                          href={resp.googleDriveFileId ? resp.fileUrl : `http://localhost:5001${resp.fileUrl}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="icon-action-btn view-btn"
                                          title="View Document"
                                        >
                                          <Eye size={16} />
                                        </a>
                                        <button 
                                          onClick={() => handleDownload(resp.googleDriveFileId ? resp.fileUrl : `http://localhost:5001${resp.fileUrl}`, resp.fileName || 'Document')}
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
                                            <CheckCircle size={16} /> Approved (Saved to Drive)
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
                                          <a 
                                            href={`http://localhost:5001${hist.fileUrl}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
                                          >
                                            <Paperclip size={12} /> {hist.fileName}
                                          </a>
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
                                // Find title from SUPPORTING_DOCS_DATA if needed, but we don't have it directly here.
                                // We rely on the uploaded file UI.
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
                                              <a href={`http://localhost:5001${file.fileUrl}`} target="_blank" rel="noopener noreferrer" className="doc-link">
                                                <FileText size={18} /> {file.fileName}
                                              </a>
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
                                      <a href={`http://localhost:5001${af.fileUrl}`} target="_blank" rel="noopener noreferrer" className="doc-link">
                                        <FileText size={18} /> {af.fileName}
                                      </a>
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
                                        <div className="action-buttons">
                                          <button className="btn-approve" onClick={() => handleEvaluateDocument(q.id, af.fileId, 'APPROVED', true)}>
                                            Approve
                                          </button>
                                          <button className="btn-reject" onClick={() => handleEvaluateDocument(q.id, af.fileId, 'REJECTED', true)}>
                                            Reject
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {af.history && af.history.length > 0 && (
                                    <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Previously Rejected</div>
                                      {af.history.map((hist: any, idx: number) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: idx !== af.history.length - 1 ? '6px' : '0' }}>
                                          <a href={`http://localhost:5001${hist.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                                            <Paperclip size={12} /> {hist.fileName}
                                          </a>
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
        ))}
      </div>
    </div>
  );
}
