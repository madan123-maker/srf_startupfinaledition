import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, FileText, Loader2, AlertCircle } from 'lucide-react';
import './AdminSubmissionView.css';

interface FieldResponse {
  fieldId: string;
  value: any;
  fileUrl?: string;
  fileName?: string;
  evaluationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  evaluationRemarks?: string;
  googleDriveFileId?: string;
}

interface QuestionResponse {
  questionId: string;
  fieldResponses: FieldResponse[];
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
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [schema, setSchema] = useState<any>(null);
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

        const [subRes, schemaRes] = await Promise.all([
          fetch(`http://localhost:5001/api/submissions/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`http://localhost:5001/api/schemas/${editionId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (!subRes.ok || !schemaRes.ok) {
          throw new Error('Failed to load application data');
        }

        const subData = await subRes.json();
        const schemaData = await schemaRes.json();

        setSubmission(subData);
        setSchema(schemaData);
      } catch (err: any) {
        setError(err.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, editionId, navigate]);

  const handleEvaluateDocument = async (questionId: string, fieldId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/submissions/${id}/evaluate-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questionId, fieldId, status, remarks: '' })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const updatedSubmission = await res.json();
      setSubmission(updatedSubmission);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to evaluate document: ${err.message}`);
    }
  };

  const getQuestionResponses = (questionId: string) => {
    return submission?.responses.find(r => r.questionId === questionId)?.fieldResponses || [];
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
                  const responses = getQuestionResponses(q.id);
                  if (responses.length === 0) return null; // Skip unanswered questions
                  
                  return (
                    <div key={q.id} className="question-card">
                      <div className="question-header">
                        <span className="q-id">{q.id.toUpperCase().replace('_', '.')}</span>
                        <p className="q-text">{q.text}</p>
                      </div>
                      
                      <div className="responses-grid">
                        {q.fields?.map((field: any) => {
                          const resp = responses.find(r => r.fieldId === field.id);
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
                                      <a 
                                        href={resp.googleDriveFileId ? resp.fileUrl : `http://localhost:5001${resp.fileUrl}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="doc-link"
                                      >
                                        <FileText size={18} />
                                        {resp.fileName || 'Document'}
                                      </a>
                                      
                                      <div className="eval-controls">
                                        {resp.evaluationStatus === 'APPROVED' && (
                                          <div className="status-indicator approved">
                                            <CheckCircle size={16} /> Approved (Saved to Drive)
                                          </div>
                                        )}
                                        {resp.evaluationStatus === 'REJECTED' && (
                                          <div className="status-indicator rejected">
                                            <XCircle size={16} /> Rejected
                                          </div>
                                        )}
                                        {(!resp.evaluationStatus || resp.evaluationStatus === 'PENDING') && (
                                          <div className="action-buttons">
                                            <button 
                                              className="btn-approve"
                                              onClick={() => handleEvaluateDocument(q.id, field.id, 'APPROVED')}
                                            >
                                              Approve & Save to Drive
                                            </button>
                                            <button 
                                              className="btn-reject"
                                              onClick={() => handleEvaluateDocument(q.id, field.id, 'REJECTED')}
                                            >
                                              Reject
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="empty-val">No document uploaded</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
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
