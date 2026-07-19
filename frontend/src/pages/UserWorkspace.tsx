import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, 
  Send, 
  Upload, 
  Paperclip, 
  Trash2, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle
} from 'lucide-react';
import './UserWorkspace.css';

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

interface ActionPoint {
  id: string;
  title: string;
  questions: Question[];
}

interface ReformArea {
  id: string;
  title: string;
  description: string;
  actionPoints: ActionPoint[];
}

interface IFieldResponse {
  fieldId: string;
  value: any;
  fileUrl?: string;
  fileName?: string;
}

interface ISubmissionResponse {
  questionId: string;
  fieldResponses: IFieldResponse[];
}

interface ISubmission {
  _id: string;
  editionId: string;
  userId: string;
  stateName: string;
  status: string;
  responses: ISubmissionResponse[];
  totalScore: number;
  adminRemarks?: string;
}

const renderGuidelinesRef = (refText: string) => {
  const match = refText.match(/Page\s*(\d+)/i) || refText.match(/(\d+)/);
  if (match) {
    const pageNum = match[1];
    const parts = refText.split(match[0]);
    return (
      <span style={{ color: '#475569' }}>
        {parts[0]}
        <a 
          href={`/guidelines.pdf#page=${pageNum}`} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          {match[0]}
        </a>
        {parts.slice(1).join(match[0])}
      </span>
    );
  }
  return <span style={{ color: '#475569' }}>{refText}</span>;
};

const UserWorkspace: React.FC = () => {
  const { editionId } = useParams<{ editionId: string }>();
  const navigate = useNavigate();

  const [schema, setSchema] = useState<{ areas: ReformArea[] } | null>(null);
  const [submission, setSubmission] = useState<ISubmission | null>(null);
  const [responses, setResponses] = useState<ISubmissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selection states
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);

  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    if (editionId) {
      fetchSchemaAndSubmission();
    }
  }, [editionId]);

  const fetchSchemaAndSubmission = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 1. Fetch Form Schema
      const schemaRes = await fetch(`http://localhost:5001/api/schemas/${editionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let schemaData = null;
      if (schemaRes.ok) {
        schemaData = await schemaRes.json();
        setSchema(schemaData);
      }

      // 2. Fetch or Create Submission
      const subRes = await fetch(`http://localhost:5001/api/submissions/edition/${editionId}/my-submission`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubmission(subData);
        setResponses(subData.responses || []);
        
        // Auto-select first question
        if (schemaData && schemaData.areas?.length > 0 && schemaData.areas[0].actionPoints?.length > 0) {
          const firstAp = schemaData.areas[0].actionPoints[0];
          if (firstAp.questions?.length > 0) {
            setSelectedQuestionId(firstAp.questions[0].id);
            setExpandedAreaId(schemaData.areas[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFieldValue = (questionId: string, fieldId: string): any => {
    const qResp = responses.find(r => r.questionId === questionId);
    const fResp = qResp?.fieldResponses?.find(f => f.fieldId === fieldId);
    return fResp ? fResp.value : '';
  };

  const getFieldFile = (questionId: string, fieldId: string): { fileUrl?: string; fileName?: string } | null => {
    const qResp = responses.find(r => r.questionId === questionId);
    const fResp = qResp?.fieldResponses?.find(f => f.fieldId === fieldId);
    return fResp && fResp.fileUrl ? { fileUrl: fResp.fileUrl, fileName: fResp.fileName } : null;
  };

  const handleFieldChange = (questionId: string, fieldId: string, value: any, extra = {}) => {
    setResponses(prev => {
      const qIndex = prev.findIndex(r => r.questionId === questionId);
      if (qIndex === -1) {
        return [...prev, {
          questionId,
          fieldResponses: [{ fieldId, value, ...extra }]
        }];
      }
      
      const qResp = prev[qIndex];
      const fIndex = qResp.fieldResponses?.findIndex(fr => fr.fieldId === fieldId) ?? -1;
      let updatedFieldResponses = qResp.fieldResponses ? [...qResp.fieldResponses] : [];
      
      if (fIndex === -1) {
        updatedFieldResponses.push({ fieldId, value, ...extra });
      } else {
        updatedFieldResponses[fIndex] = { ...updatedFieldResponses[fIndex], value, ...extra };
      }
      
      const updatedResponses = [...prev];
      updatedResponses[qIndex] = { ...qResp, fieldResponses: updatedFieldResponses };
      return updatedResponses;
    });
  };

  const handleFileUpload = async (questionId: string, fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/submissions/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const fileData = await response.json();
        handleFieldChange(questionId, fieldId, fileData.fileUrl, {
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName
        });
      } else {
        alert('File upload failed.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Error uploading file.');
    }
  };

  const handleRemoveFile = (questionId: string, fieldId: string) => {
    handleFieldChange(questionId, fieldId, '', { fileUrl: undefined, fileName: undefined });
    if (fileInputRefs.current[fieldId]) {
      fileInputRefs.current[fieldId]!.value = '';
    }
  };

  const saveSubmission = async (status: string) => {
    if (!submission) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/submissions/${submission._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ responses, status })
      });

      if (response.ok) {
        const updatedSub = await response.json();
        setSubmission(updatedSub);
        alert(status === 'SUBMITTED' ? 'Application submitted successfully!' : 'Draft saved successfully!');
        if (status === 'SUBMITTED') {
          navigate('/user-dashboard');
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to save: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving submission:', err);
      alert('Error saving submission.');
    } finally {
      setSaving(false);
    }
  };

  const isQuestionAnswered = (question: Question): boolean => {
    const qResp = responses.find(r => r.questionId === question.id);
    if (!qResp) return false;
    
    if (!question.fields) return true; // If no fields, technically answered or N/A
    for (const field of question.fields) {
      if (field.required) {
        const fResp = qResp.fieldResponses?.find(f => f.fieldId === field.id);
        if (!fResp || !fResp.value) {
          return false;
        }
      }
    }
    return true;
  };

  // Flatten all questions
  const allQuestions: { areaId: string; question: Question }[] = [];
  schema?.areas?.forEach(area => {
    area.actionPoints?.forEach(ap => {
      ap.questions?.forEach(q => {
        allQuestions.push({ areaId: area.id, question: q });
      });
    });
  });

  const currentIndex = allQuestions.findIndex(q => q.question.id === selectedQuestionId);
  const selectedQuestionData = allQuestions[currentIndex];
  const selectedQuestion = selectedQuestionData?.question;
  const currentAreaId = selectedQuestionData?.areaId;

  // Auto-expand area when navigating via Next/Prev
  useEffect(() => {
    if (currentAreaId) setExpandedAreaId(currentAreaId);
  }, [currentAreaId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px' }}>
        <Loader2 className="animate-spin" size={40} color="#4f46e5" />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Loading state compliance workspace...</p>
      </div>
    );
  }

  const handleNext = () => {
    if (currentIndex < allQuestions.length - 1) {
      setSelectedQuestionId(allQuestions[currentIndex + 1].question.id);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setSelectedQuestionId(allQuestions[currentIndex - 1].question.id);
    }
  };

  const answeredCount = allQuestions.filter(q => isQuestionAnswered(q.question)).length;
  const progressPercent = allQuestions.length > 0 ? Math.round((answeredCount / allQuestions.length) * 100) : 0;
  const isReadOnly = submission?.status !== 'DRAFT' && submission?.status !== 'REJECTED';

  return (
    <div className="user-workspace-container">
      {/* Top Header */}
      <div className="workspace-header">
        <div className="header-title-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="icon-btn" onClick={() => navigate('/user-dashboard')}>
              <ArrowLeft size={16} />
            </button>
            <div className="workspace-title">SRF Assessment Form</div>
          </div>
          <div className="workspace-meta">
            <span>State: <strong>{submission?.stateName}</strong></span>
            <span className={`status-indicator ${submission?.status?.toLowerCase() || ''}`}>
              <span className="dot"></span> Status: {submission?.status}
            </span>
          </div>
        </div>
        
        <div className="workspace-actions">
          <button 
            className="btn-secondary" 
            onClick={() => saveSubmission('DRAFT')} 
            disabled={saving || isReadOnly}
          >
            <Save size={16} /> Save Draft
          </button>
          <button 
            className="btn-submit" 
            onClick={() => {
              if (window.confirm('Are you sure you want to finalize and submit this evaluation? You will not be able to edit it afterwards.')) {
                saveSubmission('SUBMITTED');
              }
            }} 
            disabled={saving || isReadOnly}
          >
            <Send size={16} /> Submit Application
          </button>
        </div>
      </div>

      {/* Workspace Columns (2-Column Wizard) */}
      <div className="workspace-body">
        
        {/* Left Column: Progress & Navigation */}
        <div className="workspace-column">
          <div className="progress-container">
            <div className="progress-label">
              <span>Overall Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
              {answeredCount} of {allQuestions.length} questions completed
            </div>
          </div>

          <div className="column-content" style={{ padding: '0' }}>
            {schema?.areas?.map((area) => {
              const isExpanded = expandedAreaId === area.id;
              
              // Calculate how many questions answered in this area
              let areaTotal = 0;
              let areaAnswered = 0;
              area.actionPoints?.forEach(ap => {
                ap.questions?.forEach(q => {
                  areaTotal++;
                  if (isQuestionAnswered(q)) areaAnswered++;
                });
              });

              return (
                <div key={area.id}>
                  <div 
                    className="accordion-header"
                    onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isExpanded ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
                      <span>{area.title.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: areaAnswered === areaTotal ? '#10b981' : '#64748b', fontWeight: 'bold' }}>
                      {areaAnswered}/{areaTotal}
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="accordion-content">
                      {area.actionPoints?.map((ap) => (
                        <div key={ap.id}>
                          {/* We can hide action point titles to save space, or show them minimalistically */}
                          <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', backgroundColor: '#f8fafc', textTransform: 'uppercase' }}>
                            {ap.title.length > 30 ? ap.title.substring(0, 30) + '...' : ap.title}
                          </div>
                          {ap.questions?.map(q => {
                            const isSelected = selectedQuestionId === q.id;
                            const isAnswered = isQuestionAnswered(q);
                            return (
                              <div 
                                key={q.id}
                                className={`nav-question-item ${isSelected ? 'active' : ''}`}
                                onClick={() => setSelectedQuestionId(q.id)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {isAnswered ? (
                                    <CheckCircle2 size={14} color="#10b981" />
                                  ) : (
                                    <Circle size={14} color="#cbd5e1" />
                                  )}
                                  <span>Q {q.questionNumber}</span>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#3b82f6' : '#94a3b8' }}>
                                  [{q.weightage}M]
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Main Form Area */}
        <div className="workspace-column">
          <div className="column-header">
            <h3>Question Form</h3>
            {selectedQuestion && <span style={{ fontSize: '11px', color: '#6366f1', background: '#ede9fe', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>ID: {selectedQuestion.id}</span>}
          </div>
          
          <div className="column-content" style={{ padding: '24px 32px' }}>
            {selectedQuestion ? (
              <div className="form-container">
                {/* Question Details Header */}
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '20px', color: '#0f172a', marginBottom: '16px' }}>
                    <span style={{ color: '#4f46e5', marginRight: '8px' }}>Q{selectedQuestion.questionNumber}.</span>
                    {selectedQuestion.title}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                    {selectedQuestion.guidelinesRef && (
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#334155' }}>Guidelines:</strong> {renderGuidelinesRef(selectedQuestion.guidelinesRef)}
                      </div>
                    )}
                    {selectedQuestion.scoringCriteria && (
                      <div style={{ fontSize: '13px' }}>
                        <strong style={{ color: '#334155' }}>Scoring Criteria:</strong> <span style={{ color: '#475569' }}>{selectedQuestion.scoringCriteria}</span>
                      </div>
                    )}
                    {selectedQuestion.requiredDocuments && (
                      <div style={{ fontSize: '13px', marginTop: '6px' }}>
                        <strong style={{ color: '#b91c1c' }}>Required Evidence:</strong> 
                        <div style={{ color: '#475569', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{selectedQuestion.requiredDocuments}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Inputs Renderer */}
                <div className="dynamic-form-fields" style={{ minHeight: '300px' }}>
                  {(() => {
                    // Check if any Radio Button in this question is set to 'No'
                    const isNoSelected = selectedQuestion.fields?.some(f => 
                      f.type === 'Radio Button' && getFieldValue(selectedQuestion.id, f.id) === 'No'
                    );

                    return selectedQuestion.fields?.map(field => {
                      // If 'No' is selected, hide all other fields (uploads, textboxes, dates, etc.)
                      if (isNoSelected && field.type !== 'Radio Button') {
                        return null;
                      }

                      const fieldValue = getFieldValue(selectedQuestion.id, field.id);
                      return (
                        <div key={field.id} className="dynamic-field-group">
                        <label className="field-label" style={{ fontSize: '14px', marginBottom: '4px' }}>
                          {field.label}
                          {field.required && <span className="field-required">*</span>}
                        </label>

                        {field.type === 'Textbox' && (
                          <input 
                            type="text" 
                            className="field-input"
                            value={fieldValue}
                            onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Enter text response"
                          />
                        )}

                        {field.type === 'URL Field' && (
                          <input 
                            type="url" 
                            className="field-input"
                            value={fieldValue}
                            onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                            disabled={isReadOnly}
                            placeholder="https://example.gov.in"
                          />
                        )}

                        {field.type === 'Number Field' && (
                          <input 
                            type="number" 
                            className="field-input"
                            value={fieldValue}
                            onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Enter numeric value"
                          />
                        )}

                        {field.type === 'Textarea' && (
                          <textarea 
                            rows={5}
                            className="field-input"
                            value={fieldValue}
                            onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Provide details..."
                          />
                        )}

                        {field.type === 'Date Picker' && (
                          <input 
                            type="date" 
                            className="field-input"
                            value={fieldValue}
                            onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                            disabled={isReadOnly}
                          />
                        )}

                        {field.type === 'Radio Button' && (
                          <div className="options-layout">
                            {field.options?.map(opt => (
                              <label key={opt} className="option-choice">
                                <input 
                                  type="radio" 
                                  name={field.id}
                                  value={opt}
                                  checked={fieldValue === opt}
                                  onChange={() => handleFieldChange(selectedQuestion.id, field.id, opt)}
                                  disabled={isReadOnly}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        )}

                        {(field.type === 'File Upload' || field.type === 'PDF Upload') && (
                          <div style={{ marginTop: '8px' }}>
                            {getFieldFile(selectedQuestion.id, field.id) ? (
                              <div className="uploaded-file-info">
                                <a 
                                  href={`http://localhost:5001${getFieldFile(selectedQuestion.id, field.id)?.fileUrl}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="file-link"
                                >
                                  <Paperclip size={14} />
                                  <span>{getFieldFile(selectedQuestion.id, field.id)?.fileName}</span>
                                </a>
                                {!isReadOnly && (
                                  <button 
                                    className="remove-file-btn"
                                    onClick={() => handleRemoveFile(selectedQuestion.id, field.id)}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div 
                                className="file-upload-card"
                                onClick={() => !isReadOnly && fileInputRefs.current[field.id]?.click()}
                              >
                                <Upload size={24} style={{ color: '#64748b', marginBottom: '12px' }} />
                                <div style={{ fontSize: '14px', color: '#475569', fontWeight: 600 }}>
                                  {isReadOnly ? 'No file uploaded' : 'Click to Upload Document / Evidence'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                                  Supports PDF, DOC, images up to 10MB
                                </div>
                                <input 
                                  type="file" 
                                  ref={el => { fileInputRefs.current[field.id] = el; }}
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleFileUpload(selectedQuestion.id, field.id, e)}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                  })()}
                  {(!selectedQuestion.fields || selectedQuestion.fields.length === 0) && (
                    <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '14px', border: '1px dashed #cbd5e1' }}>
                      <AlertCircle size={24} style={{ margin: '0 auto 12px auto', color: '#94a3b8' }} />
                      No dynamic form inputs configured for this question yet.
                    </div>
                  )}
                </div>
                
                {/* Wizard Footer Navigation */}
                <div className="wizard-footer">
                  <button 
                    className="btn-outline" 
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                  >
                    Previous
                  </button>
                  <button 
                    className="btn-outline" 
                    onClick={handleNext}
                    disabled={currentIndex === allQuestions.length - 1}
                  >
                    Next Question
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                <CheckCircle2 size={48} color="#e2e8f0" style={{ marginBottom: '16px' }} />
                <p style={{ fontSize: '16px', fontWeight: 500 }}>Select a question from the sidebar to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserWorkspace;
