import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Paperclip, Check } from 'lucide-react';
import './EvaluateTaskDetail.css';

interface Field { id: string; label: string; type: string; options?: string[]; required?: boolean; }
interface Question { id: string; questionNumber: string; title: string; fields: Field[]; points?: number; weightage?: number; }
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
        const res = await fetch(`http://localhost:5001/api/assignments/${id}/admin-details`, {
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
              if (fr.evaluationStatus && fr.evaluationStatus !== 'PENDING') {
                initialFieldEvals[`${r.questionId}_${fr.fieldId}`] = {
                  status: fr.evaluationStatus,
                  remarks: fr.evaluationRemarks || ''
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
      computedStatus = 'APPROVED'; // Default if no file fields exist or were evaluated
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
      const res = await fetch(`http://localhost:5001/api/assignments/${id}/evaluate`, {
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
    const qr = responses.find(r => r.questionId === qId);
    if (!qr) return '—';
    const fr = qr.fieldResponses?.find((fr: any) => fr.fieldId === fId);
    return fr && fr.value ? fr.value : '—';
  };
  
  const getFieldFile = (qId: string, fId: string) => {
    const qr = responses.find(r => r.questionId === qId);
    if (!qr) return null;
    const fr = qr.fieldResponses?.find((fr: any) => fr.fieldId === fId);
    return fr && fr.fileUrl ? fr : null;
  };

  const handleFieldEvalChange = (qId: string, fId: string, status: string) => {
    setFieldEvaluations(prev => {
      const key = `${qId}_${fId}`;
      const existing = prev[key] || { status: '', remarks: '' };
      return {
        ...prev,
        [key]: { ...existing, status }
      };
    });
  };

  const handleFieldRemarkChange = (qId: string, fId: string, remarks: string) => {
    setFieldEvaluations(prev => {
      const key = `${qId}_${fId}`;
      const existing = prev[key] || { status: '', remarks: '' };
      return {
        ...prev,
        [key]: { ...existing, remarks }
      };
    });
  };

  if (loading) return <div style={{padding: 40}}>Loading details...</div>;
  if (!assignment || !schema) return <div style={{padding: 40}}>Task not found.</div>;

  const allQuestions = schema.areas.flatMap(a => a.actionPoints.flatMap(ap => ap.questions));
  
  const isFrozen = assignment.status === 'EVALUATED';

  return (
    <div className="etd-container">
      {/* Header */}
      <div className="etd-header">
        <button className="etd-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back to Evaluation Queue
        </button>
        <div className="etd-header-main">
          <div>
            <h1>Task Evaluation</h1>
            <p>Reviewing submission for <strong>{assignment.userId?.state}</strong> ({assignment.userId?.name})</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="etd-status-badge">
              Status: {assignment.status}
            </div>
            {!isFrozen && (
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
      </div>

      <div className="etd-layout" style={{ justifyContent: 'center' }}>
        {/* Left: User Submission View */}
        <div className="etd-main" style={{ maxWidth: '900px' }}>
          <div className="etd-section-title">User's Submitted Data</div>
          <div className="etd-scroll-area">
            {allQuestions.map(q => (
              <div key={q.id} className="etd-q-card">
                <div className="etd-q-num">Q{q.questionNumber}</div>
                <div className="etd-q-content" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, flex: 1, paddingRight: '16px' }}>{q.title}</h3>
                    {(q.weightage || 0) > 0 && (
                      <div className="etd-q-score-input" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Score:</span>
                        <input 
                          type="number" 
                          disabled={isFrozen}
                          max={q.weightage || 0}
                          min={0}
                          value={questionScores[q.id] ?? ''}
                          onChange={e => {
                            let val = parseInt(e.target.value);
                            if (isNaN(val)) val = 0;
                            if (val > (q.weightage || 0)) val = q.weightage || 0;
                            if (val < 0) val = 0;
                            setQuestionScores(prev => ({...prev, [q.id]: val}));
                          }}
                          style={{ width: '50px', textAlign: 'center', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600 }}
                        /> 
                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>/ {q.weightage || 0} pts</span>
                      </div>
                    )}
                  </div>
                  <div className="etd-fields">
                    {q.fields.map(f => {
                      const file = getFieldFile(q.id, f.id);
                      const val = getFieldValue(q.id, f.id);
                      const fileLinkUrl = file && file.fileUrl ? (file.fileUrl.startsWith('http') ? file.fileUrl : `http://localhost:5001${file.fileUrl}`) : '#';
                      return (
                        <div key={f.id} className="etd-field">
                          <div className="etd-field-label">{f.label}</div>
                          {file ? (
                            <div className="etd-file-eval-box">
                              <a href={fileLinkUrl} target="_blank" rel="noopener noreferrer" className="etd-file-link">
                                <Paperclip size={14} /> {file.fileName || 'View Document'}
                              </a>
                              <div className="etd-field-eval-controls">
                                <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[`${q.id}_${f.id}`]?.status === 'APPROVED' ? 'active approve' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(q.id, f.id, 'APPROVED') }}>Approve</button>
                                <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[`${q.id}_${f.id}`]?.status === 'RESUBMISSION_REQUIRED' ? 'active resubmit' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(q.id, f.id, 'RESUBMISSION_REQUIRED') }}>Resubmit</button>
                                <button disabled={isFrozen} className={`etd-fe-btn ${fieldEvaluations[`${q.id}_${f.id}`]?.status === 'REJECTED' ? 'active reject' : ''}`} onClick={() => { if (!isFrozen) handleFieldEvalChange(q.id, f.id, 'REJECTED') }}>Reject</button>
                              </div>
                              <input 
                                type="text" 
                                className="etd-fe-remark" 
                                placeholder="Remarks for this file..." 
                                value={fieldEvaluations[`${q.id}_${f.id}`]?.remarks || ''}
                                onChange={(e) => handleFieldRemarkChange(q.id, f.id, e.target.value)}
                                disabled={isFrozen}
                              />
                            </div>
                          ) : (
                            <div className="etd-field-val">
                              {Array.isArray(val) ? val.join(', ') : val}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EvaluateTaskDetail;
