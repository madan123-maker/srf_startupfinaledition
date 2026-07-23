import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
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

  useEffect(() => {
    fetchSchema();
  }, [editionId]);

  const fetchSchema = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/schemas/${editionId}`, {
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
      const response = await fetch(`http://localhost:5001/api/schemas/${editionId}`, {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div className="schema-card-title" style={{ margin: 0 }}>Reform Area {index + 1}</div>
                  <div className="schema-card-actions" style={{ display: 'flex', gap: '4px', marginTop: 0 }}>
                    <button className="icon-btn" onClick={(e) => e.stopPropagation()}><ChevronUp size={12} /></button>
                    <button className="icon-btn" onClick={(e) => e.stopPropagation()}><ChevronDown size={12} /></button>
                    <button className="icon-btn delete-btn" onClick={(e) => removeArea(e, area.id)}><X size={12} /></button>
                  </div>
                </div>
                <div className="schema-card-subtitle" style={{ fontWeight: 600, color: '#475569', marginTop: '8px' }}>
                  <input 
                    type="text" 
                    value={area.title} 
                    onChange={(e) => updateArea(area.id, { title: e.target.value })} 
                    style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', fontSize: '13px' }}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: '#4f46e5' }}>Action Point {apIndex + 1}</span>
                    <div className="schema-card-actions" style={{ display: 'flex', gap: '4px', marginTop: 0 }}>
                      <button className="icon-btn"><ChevronUp size={12} /></button>
                      <button className="icon-btn"><ChevronDown size={12} /></button>
                      <button className="icon-btn delete-btn" onClick={(e) => removeActionPoint(e, selectedArea!.id, ap.id)}><X size={12} /></button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b', lineHeight: '1.4' }}>
                    <input 
                      type="text" 
                      value={ap.title} 
                      onChange={(e) => updateActionPoint(selectedArea!.id, ap.id, { title: e.target.value })} 
                      style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', fontSize: '13px', fontWeight: 600 }}
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
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                        <span className="q-badge">Q {q.questionNumber}</span> {q.title.length > 25 ? q.title.substring(0, 25) + '...' : q.title}
                      </span>
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
    </div>
  );
};

export default SchemaEditor;
