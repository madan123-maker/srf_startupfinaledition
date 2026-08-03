import { API_BASE_URL } from '../../config/api';
import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, X, FileText, UploadCloud } from 'lucide-react';
import './SchemaEditor.css';

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
  guidelinesPage?: number;
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

const FIELD_TYPES = [
  'Heading', 'Sub Heading', 'Description', 'Instruction', 'Hyperlink', 'Textbox', 
  'Textarea', 'Number Field', 'Email Field', 'Phone Field', 'Date Picker', 'Radio Button', 
  'Checkbox', 'Dropdown', 'Multi Select', 'URL Field', 'PDF Upload', 'File Upload', 
  'Image Upload', 'Table Grid'
];

interface SchemaEditorProps {
  editionId: string;
  editionName: string;
}

const SchemaEditor: React.FC<SchemaEditorProps> = ({ editionId, editionName: _editionName }) => {
  const [areas, setAreas] = useState<ReformArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Selection states
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedActionPointId, setSelectedActionPointId] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // PDF Parser States
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      setPdfError('Please select a valid SRF Framework PDF file.');
      return;
    }
    setParsingPdf(true);
    setPdfError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', pdfFile);
      if (editionId) {
        formData.append('editionId', editionId);
      }

      const res = await fetch(`${API_BASE_URL}/api/schemas/parse-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response (${res.status}). Please verify backend endpoint ${API_BASE_URL}.`);
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse SRF PDF.');
      }

      if (data.areas && data.areas.length > 0) {
        setAreas(data.areas);
        setSelectedAreaId(data.areas[0].id);
        if (data.areas[0].actionPoints?.length > 0) {
          setSelectedActionPointId(data.areas[0].actionPoints[0].id);
          if (data.areas[0].actionPoints[0].questions?.length > 0) {
            setSelectedQuestionId(data.areas[0].actionPoints[0].questions[0].id);
          }
        }
        setShowPdfModal(false);
        setPdfFile(null);
        alert(`Successfully generated framework schema with ${data.areas.length} Reform Area(s)! You can now review and edit before saving.`);
      } else {
        throw new Error('No reform areas could be extracted from the uploaded PDF.');
      }
    } catch (err: any) {
      setPdfError(err.message || 'Error parsing PDF.');
    } finally {
      setParsingPdf(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [editionId]);

  const fetchSchema = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/schemas/${editionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAreas(data.areas || []);
        if (data.areas?.length > 0) {
          setSelectedAreaId(data.areas[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch schema', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/schemas/${editionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ areas })
      });
      if (response.ok) {
        alert('Schema saved successfully!');
      } else {
        alert('Failed to save schema.');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving schema.');
    } finally {
      setSaving(false);
    }
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addArea = () => {
    const newArea: ReformArea = {
      id: `area_${generateId()}`,
      title: `Reform Area ${areas.length + 1}`,
      description: 'Description here',
      actionPoints: []
    };
    setAreas([...areas, newArea]);
    setSelectedAreaId(newArea.id);
  };

  const addActionPoint = () => {
    if (!selectedAreaId) return;
    setAreas(areas.map(area => {
      if (area.id === selectedAreaId) {
        const newAp: ActionPoint = {
          id: `ap_${generateId()}`,
          title: `${area.actionPoints.length + 1}. New Action Point`,
          questions: []
        };
        setSelectedActionPointId(newAp.id);
        return { ...area, actionPoints: [...area.actionPoints, newAp] };
      }
      return area;
    }));
  };

  const addQuestion = (apId: string) => {
    setAreas(areas.map(area => {
      if (area.id === selectedAreaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.map(ap => {
            if (ap.id === apId) {
              const newQ: Question = {
                id: `q_${generateId()}`,
                questionNumber: `${area.actionPoints.findIndex(a=>a.id===ap.id)+1}.${ap.questions.length + 1}`,
                weightage: 1,
                title: 'New Question?',
                requiredDocuments: '',
                guidelinesRef: '',
                scoringCriteria: '',
                fields: []
              };
              setSelectedQuestionId(newQ.id);
              return { ...ap, questions: [...ap.questions, newQ] };
            }
            return ap;
          })
        };
      }
      return area;
    }));
  };

  const addField = (type: string) => {
    if (!selectedAreaId || !selectedActionPointId || !selectedQuestionId) return;
    setAreas(areas.map(area => {
      if (area.id === selectedAreaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.map(ap => {
            if (ap.id === selectedActionPointId) {
              return {
                ...ap,
                questions: ap.questions.map(q => {
                  if (q.id === selectedQuestionId) {
                    const newField: Field = {
                      id: `field_${generateId()}`,
                      type,
                      label: `New ${type}`,
                      required: false,
                      options: ['Option 1', 'Option 2']
                    };
                    return { ...q, fields: [...q.fields, newField] };
                  }
                  return q;
                })
              };
            }
            return ap;
          })
        };
      }
      return area;
    }));
  };

  const moveArea = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= areas.length) return;
    const updated = [...areas];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setAreas(updated);
  };

  const moveActionPoint = (e: React.MouseEvent, areaId: string, apIndex: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const targetIndex = direction === 'up' ? apIndex - 1 : apIndex + 1;
    if (targetIndex < 0 || targetIndex >= area.actionPoints.length) return;
    const updatedActionPoints = [...area.actionPoints];
    const [moved] = updatedActionPoints.splice(apIndex, 1);
    updatedActionPoints.splice(targetIndex, 0, moved);
    updateArea(areaId, { actionPoints: updatedActionPoints });
  };

  const updateArea = (areaId: string, updates: Partial<ReformArea>) => {
    setAreas(areas.map(area => area.id === areaId ? { ...area, ...updates } : area));
  };

  const updateActionPoint = (areaId: string, apId: string, updates: Partial<ActionPoint>) => {
    setAreas(areas.map(area => {
      if (area.id === areaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.map(ap => ap.id === apId ? { ...ap, ...updates } : ap)
        };
      }
      return area;
    }));
  };

  const updateQuestion = (updates: Partial<Question>) => {
    if (!selectedAreaId || !selectedActionPointId || !selectedQuestionId) return;
    setAreas(areas.map(area => {
      if (area.id === selectedAreaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.map(ap => {
            if (ap.id === selectedActionPointId) {
              return {
                ...ap,
                questions: ap.questions.map(q => {
                  if (q.id === selectedQuestionId) {
                    return { ...q, ...updates };
                  }
                  return q;
                })
              };
            }
            return ap;
          })
        };
      }
      return area;
    }));
  };

  const updateField = (fieldId: string, updates: Partial<Field>) => {
    if (!selectedAreaId || !selectedActionPointId || !selectedQuestionId) return;
    setAreas(areas.map(area => {
      if (area.id === selectedAreaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.map(ap => {
            if (ap.id === selectedActionPointId) {
              return {
                ...ap,
                questions: ap.questions.map(q => {
                  if (q.id === selectedQuestionId) {
                    return {
                      ...q,
                      fields: q.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
                    };
                  }
                  return q;
                })
              };
            }
            return ap;
          })
        };
      }
      return area;
    }));
  };

  const removeField = (fieldId: string) => {
    if (!selectedAreaId || !selectedActionPointId || !selectedQuestionId) return;
    setAreas(areas.map(area => {
      if (area.id === selectedAreaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.map(ap => {
            if (ap.id === selectedActionPointId) {
              return {
                ...ap,
                questions: ap.questions.map(q => {
                  if (q.id === selectedQuestionId) {
                    return {
                      ...q,
                      fields: q.fields.filter(f => f.id !== fieldId)
                    };
                  }
                  return q;
                })
              };
            }
            return ap;
          })
        };
      }
      return area;
    }));
  };

  const removeArea = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Reform Area? This item will be stored in the recycle bin for 30 days before permanent removal.')) return;
    setAreas(areas.filter(a => a.id !== id));
    if (selectedAreaId === id) setSelectedAreaId(null);
  };

  const removeActionPoint = (e: React.MouseEvent, areaId: string, apId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Action Point? This item will be stored in the recycle bin for 30 days before permanent removal.')) return;
    setAreas(areas.map(area => {
      if (area.id === areaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.filter(ap => ap.id !== apId)
        };
      }
      return area;
    }));
    if (selectedActionPointId === apId) setSelectedActionPointId(null);
  };

  const removeQuestion = (e: React.MouseEvent, areaId: string, apId: string, questionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Question? This item will be stored in the recycle bin for 30 days before permanent removal.')) return;
    setAreas(areas.map(area => {
      if (area.id === areaId) {
        return {
          ...area,
          actionPoints: area.actionPoints.map(ap => {
            if (ap.id === apId) {
              return {
                ...ap,
                questions: ap.questions.filter(q => q.id !== questionId)
              };
            }
            return ap;
          })
        };
      }
      return area;
    }));
    if (selectedQuestionId === questionId) setSelectedQuestionId(null);
  };

  const selectedArea = areas.find(a => a.id === selectedAreaId);
  const selectedActionPoint = selectedArea?.actionPoints.find(ap => ap.id === selectedActionPointId);
  const selectedQuestion = selectedActionPoint?.questions.find(q => q.id === selectedQuestionId);

  if (loading) return <div>Loading schema editor...</div>;

  return (
    <div className="schema-editor-container">
      <div className="schema-editor-header" style={{ marginTop: '0' }}>
        <div className="schema-header-left">
          <span className="badge" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}>DPIIT SCHEMA MANAGER</span>
          <h2 style={{ fontSize: '20px' }}>Form Schema Editor Workspace</h2>
          <p>Configure compliance templates, documents, and rules dynamically.</p>
        </div>
        <div className="schema-header-actions">
          <button className="btn-pdf-upload" onClick={() => setShowPdfModal(true)}>
            <FileText size={16} /> Generate From SRF PDF
          </button>
          <button className="btn-reset">Reset to Default</button>
          <button className="btn-save-schema" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Framework Schema'}
          </button>
        </div>
      </div>

      <div className="schema-workspace">
        {/* Left Column: Reform Areas */}
        <div className="schema-column">
          <div className="column-header">
            <h3>Reform Areas</h3>
            <button className="btn-add" onClick={addArea}>+ Add Area</button>
          </div>
          <div className="column-content-scroll">
            {areas.map((area, index) => (
              <div 
                key={area.id} 
                className={`schema-card ${selectedAreaId === area.id ? 'active' : ''}`}
                onClick={() => { setSelectedAreaId(area.id); setSelectedActionPointId(null); setSelectedQuestionId(null); }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="area-badge" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Reform Area {index + 1}
                  </span>
                  <div className="schema-card-actions" style={{ display: 'flex', gap: '4px', marginTop: 0 }}>
                    <button className="icon-btn" title="Move Up" onClick={(e) => moveArea(e, index, 'up')} disabled={index === 0}><ChevronUp size={12} /></button>
                    <button className="icon-btn" title="Move Down" onClick={(e) => moveArea(e, index, 'down')} disabled={index === areas.length - 1}><ChevronDown size={12} /></button>
                    <button className="icon-btn delete-btn" title="Delete Area" onClick={(e) => removeArea(e, area.id)}><X size={12} /></button>
                  </div>
                </div>
                <div className="schema-card-subtitle" style={{ fontWeight: 600, color: '#475569', marginTop: '6px' }}>
                  <textarea 
                    value={area.title} 
                    onChange={(e) => updateArea(area.id, { title: e.target.value })} 
                    rows={2}
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', fontWeight: 600, resize: 'vertical', lineHeight: '1.3', fontFamily: 'inherit' }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Reform Area Name"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Column: Action Points & Questions */}
        <div className="schema-column">
          <div className="column-header">
            <h3>Area Rules & Settings</h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Rules/Assignments</span>
          </div>
          <div className="column-content-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '14px', color: '#1e293b', margin: 0 }}>Action Points</h4>
              <button className="btn-add" onClick={addActionPoint} disabled={!selectedAreaId}>+ Add Action Point</button>
            </div>
            {selectedArea?.actionPoints.map((ap, apIndex) => (
              <div key={ap.id} style={{ marginBottom: '24px' }}>
                <div className="schema-card" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Action Point {apIndex + 1}
                    </span>
                    <div className="schema-card-actions" style={{ display: 'flex', gap: '4px', marginTop: 0 }}>
                      <button className="icon-btn" title="Move Up" onClick={(e) => moveActionPoint(e, selectedArea!.id, apIndex, 'up')} disabled={apIndex === 0}><ChevronUp size={12} /></button>
                      <button className="icon-btn" title="Move Down" onClick={(e) => moveActionPoint(e, selectedArea!.id, apIndex, 'down')} disabled={apIndex === selectedArea!.actionPoints.length - 1}><ChevronDown size={12} /></button>
                      <button className="icon-btn delete-btn" title="Delete Action Point" onClick={(e) => removeActionPoint(e, selectedArea!.id, ap.id)}><X size={12} /></button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b', lineHeight: '1.4' }}>
                    <textarea 
                      value={ap.title} 
                      onChange={(e) => updateActionPoint(selectedArea!.id, ap.id, { title: e.target.value })} 
                      rows={2}
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px', fontSize: '13px', fontWeight: 600, resize: 'vertical', lineHeight: '1.3', fontFamily: 'inherit' }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Action Point Name"
                    />
                  </div>
                </div>
                
                <div className="question-list">
                  {ap.questions.map(q => (
                    <div 
                      key={q.id}
                      className={`question-item ${selectedQuestionId === q.id ? 'active' : ''}`}
                      onClick={() => { setSelectedActionPointId(ap.id); setSelectedQuestionId(q.id); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                        <span className="q-badge" style={{ flexShrink: 0 }}>Q {q.questionNumber}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12.5px', fontWeight: 500, color: '#334155' }} title={q.title}>
                          {q.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ color: '#3b82f6', fontWeight: 600, fontSize: '12px' }}>[{q.weightage}M]</span>
                        <button 
                          className="icon-btn delete-btn" 
                          onClick={(e) => removeQuestion(e, selectedArea!.id, ap.id, q.id)}
                          title="Delete Question"
                          style={{ padding: '2px', height: '20px', width: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn-reset" style={{ width: '100%', padding: '6px', fontSize: '12px', marginTop: '8px' }} onClick={() => addQuestion(ap.id)}>+ Add Question</button>
                </div>
              </div>
            ))}
            {!selectedArea && <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Select a Reform Area to view its action points.</div>}
          </div>
        </div>

        {/* Right Column: Question Editor & Builder */}
        <div className="schema-column">
          <div className="column-header">
            <h3>Question Editor</h3>
            {selectedQuestionId && <span style={{ fontSize: '10px', color: '#6366f1', background: '#ede9fe', padding: '2px 8px', borderRadius: '12px' }}>ID: {selectedQuestionId}</span>}
          </div>
          <div className="column-content-scroll">
            {selectedQuestion ? (
              <>
                <div className="editor-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Question Number</label>
                      <input 
                        type="text" 
                        value={selectedQuestion.questionNumber}
                        onChange={(e) => updateQuestion({ questionNumber: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Weightage (Marks)</label>
                      <input 
                        type="number" 
                        value={selectedQuestion.weightage}
                        onChange={(e) => updateQuestion({ weightage: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Question Title (Label)</label>
                    <textarea 
                      rows={3} 
                      value={selectedQuestion.title}
                      onChange={(e) => updateQuestion({ title: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Required Documents (One per line)</label>
                    <textarea 
                      rows={4} 
                      value={selectedQuestion.requiredDocuments}
                      onChange={(e) => updateQuestion({ requiredDocuments: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Mandatory Guidelines Page Reference</label>
                      <input 
                        type="text" 
                        value={selectedQuestion.guidelinesRef}
                        onChange={(e) => updateQuestion({ guidelinesRef: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Scoring Criteria / Rules Description</label>
                      <input 
                        type="text" 
                        value={selectedQuestion.scoringCriteria}
                        onChange={(e) => updateQuestion({ scoringCriteria: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-header">+ Dynamic Form Fields Builder</div>
                  <div className="builder-desc">Drag elements from the Toolbox below and drop them here to build a multi-input question dynamically. (Click toolbox items to add)</div>
                  
                  <div className="field-list">
                    {selectedQuestion.fields.map(field => (
                      <div key={field.id} className="field-item">
                        <div className="field-header">
                          <span className="field-type">◉ {field.type}</span>
                          <button className="icon-btn" onClick={() => removeField(field.id)}><X size={14} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={field.label} 
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }} 
                          />
                          <label style={{ fontSize: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={field.required} 
                              onChange={(e) => updateField(field.id, { required: e.target.checked })} 
                            /> Required
                          </label>
                        </div>
                        {(field.type === 'Radio Button' || field.type === 'Dropdown' || field.type === 'Checkbox' || field.type === 'Multi Select') && (
                          <input 
                            type="text" 
                            value={field.options?.join(', ')} 
                            onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                            placeholder="Comma separated options"
                            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px', color: '#1e293b' }} 
                          />
                        )}
                      </div>
                    ))}
                    {selectedQuestion.fields.length === 0 && <div style={{ color: '#cbd5e1', textAlign: 'center', marginTop: '20px' }}>Drop fields here</div>}
                  </div>
                </div>

                <div className="toolbox-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e293b" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Form Element Toolbox</span>
                  </div>
                  <div className="toolbox-grid">
                    {FIELD_TYPES.map(type => (
                      <button key={type} className="toolbox-btn" onClick={() => addField(type)}>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>Select a question to edit its fields.</div>
            )}
          </div>
        </div>
      </div>
      {/* PDF Upload Modal */}
      {showPdfModal && (
        <div className="se-pdf-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pdf-modal-title">
          <div className="se-pdf-modal">
            <div className="se-pdf-modal-header">
              <h3 id="pdf-modal-title">Generate Framework from SRF PDF</h3>
              <button className="se-pdf-modal-close" onClick={() => setShowPdfModal(false)} aria-label="Close modal">×</button>
            </div>
            
            <form onSubmit={handlePdfUpload} className="se-pdf-modal-body">
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Upload an official SRF Framework PDF (e.g. <strong>SRF 6.0 Framework.pdf</strong>). The system will automatically extract Reform Areas, Action Points, Question numbers, Guidelines, and Supporting Document requirements.
              </p>

              {pdfError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>
                  {pdfError}
                </div>
              )}

              <div className="se-pdf-dropzone" onClick={() => document.getElementById('srf-pdf-input')?.click()}>
                <UploadCloud size={36} color="#10b981" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>
                  {pdfFile ? pdfFile.name : 'Click to select or drag & drop SRF PDF file'}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Supported format: PDF (.pdf)
                </div>
                <input 
                  id="srf-pdf-input"
                  type="file" 
                  accept="application/pdf" 
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setPdfFile(e.target.files[0]);
                      setPdfError('');
                    }
                  }}
                />
              </div>

              <div className="se-pdf-modal-footer">
                <button type="button" className="btn-reset" onClick={() => setShowPdfModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-schema" disabled={parsingPdf || !pdfFile} style={{ background: '#10b981' }}>
                  {parsingPdf ? 'Parsing PDF & Extracting...' : 'Extract & Generate Schema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchemaEditor;
