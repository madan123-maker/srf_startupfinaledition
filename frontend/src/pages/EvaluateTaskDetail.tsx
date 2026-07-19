import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Loader2, Paperclip, Check } from 'lucide-react';
import './EvaluateTaskDetail.css';

interface Field { id: string; label: string; type: string; options?: string[]; required?: boolean; }
interface Question { id: string; questionNumber: string; title: string; fields: Field[]; points?: number; }
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
  
  const [evalStatus, setEvalStatus] = useState<string>('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

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
          if (data.assignment.evaluationStatus) setEvalStatus(data.assignment.evaluationStatus);
          if (data.assignment.evaluationRemarks) setRemarks(data.assignment.evaluationRemarks);
        }
      } catch (err) { console.error('Failed to load detail', err); }
      finally { setLoading(false); }
    };
    fetchDetails();
  }, [id]);

  const handleSaveEvaluation = async () => {
    if (!evalStatus) return alert('Please select an evaluation status (Approve, Reject, or Needs Revision).');
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/assignments/${id}/evaluate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ evaluationStatus: evalStatus, evaluationRemarks: remarks })
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

  if (loading) return <div style={{padding: 40}}>Loading details...</div>;
  if (!assignment || !schema) return <div style={{padding: 40}}>Task not found.</div>;

  const allQuestions = schema.areas.flatMap(a => a.actionPoints.flatMap(ap => ap.questions));

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
          <div className="etd-status-badge">
            Status: {assignment.status}
          </div>
        </div>
      </div>

      <div className="etd-layout">
        {/* Left: User Submission View */}
        <div className="etd-main">
          <div className="etd-section-title">User's Submitted Data</div>
          <div className="etd-scroll-area">
            {allQuestions.map(q => (
              <div key={q.id} className="etd-q-card">
                <div className="etd-q-num">Q{q.questionNumber}</div>
                <div className="etd-q-content">
                  <h3>{q.title}</h3>
                  <div className="etd-fields">
                    {q.fields.map(f => {
                      const file = getFieldFile(q.id, f.id);
                      const val = getFieldValue(q.id, f.id);
                      return (
                        <div key={f.id} className="etd-field">
                          <div className="etd-field-label">{f.label}</div>
                          {file ? (
                            <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="etd-file-link">
                              <Paperclip size={14} /> {file.fileName || 'View Document'}
                            </a>
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

        {/* Right: Evaluation Panel */}
        <div className="etd-sidebar">
          <div className="etd-section-title">Evaluation</div>
          
          <div className="etd-eval-form">
            <label className="etd-label">Decision</label>
            <div className="etd-decision-btns">
              <button 
                className={`etd-d-btn approve ${evalStatus === 'APPROVED' ? 'active' : ''}`}
                onClick={() => setEvalStatus('APPROVED')}
              >
                <CheckCircle2 size={16} /> Approve
              </button>
              <button 
                className={`etd-d-btn revision ${evalStatus === 'NEEDS_REVISION' ? 'active' : ''}`}
                onClick={() => setEvalStatus('NEEDS_REVISION')}
              >
                <AlertCircle size={16} /> Needs Revision
              </button>
              <button 
                className={`etd-d-btn reject ${evalStatus === 'REJECTED' ? 'active' : ''}`}
                onClick={() => setEvalStatus('REJECTED')}
              >
                <XCircle size={16} /> Reject
              </button>
            </div>

            <label className="etd-label" style={{marginTop: 20}}>Remarks (Optional)</label>
            <textarea 
              className="etd-remarks" 
              placeholder="Leave feedback for the user..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />

            <button 
              className="etd-save-btn" 
              onClick={handleSaveEvaluation}
              disabled={saving}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save Evaluation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluateTaskDetail;
