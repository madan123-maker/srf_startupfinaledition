import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, getFileUrl } from '../config/api';
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
  Circle,
  BookOpen,
  Award,
  FileText,
  XCircle
} from 'lucide-react';
import './UserWorkspace.css';
import { SUPPORTING_DOCS_DATA } from '../data/supportingDocsData';

interface Field {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

export interface ISupportingDocument {
  id: string;
  title: string;
  description: string;
  mandatory: boolean;
  acceptedFileTypes: string[];
  maxFiles: number;
  maxFileSize: number;
}

interface Question {
  id: string;
  questionNumber: string;
  weightage: number;
  maxScore?: number;
  title: string;
  requiredDocuments: string;
  guidelinesRef: string;
  scoringCriteria: string;
  fields: Field[];
  supportingDocuments?: ISupportingDocument[];
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
  status?: 'DRAFT' | 'SUBMITTED';
  evaluationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  evaluationRemarks?: string;
  history?: {
    fileUrl: string;
    fileName: string;
    evaluationStatus: string;
    evaluationRemarks?: string;
    submittedAt: string;
  }[];
}

interface ISubmissionResponse {
  questionId: string;
  isApplying?: boolean;
  fieldResponses: IFieldResponse[];
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
    status?: 'DRAFT' | 'SUBMITTED';
    files: {
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
  }[];
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

const getGuidelinePdfUrl = (editionId?: string, pageNum?: string | number) => {
  const baseUrl = editionId
    ? `${API_BASE_URL}/api/guidelines/${editionId}`
    : '/guidelines.pdf';
  return pageNum ? `${baseUrl}#page=${pageNum}` : baseUrl;
};

const renderGuidelinesRef = (refText: string, editionId?: string) => {
  const match = refText.match(/Page\s*(\d+)/i) || refText.match(/(\d+)/);
  const pdfHref = match
    ? getGuidelinePdfUrl(editionId, match[1])
    : getGuidelinePdfUrl(editionId);

  if (match) {
    const parts = refText.split(match[0]);
    return (
      <span style={{ color: '#475569' }}>
        {parts[0]}
        <a
          href={pdfHref}
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
  return (
    <a
      href={pdfHref}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: '#4f46e5', textDecoration: 'underline' }}
    >
      {refText}
    </a>
  );
};

const UserWorkspace: React.FC = () => {
  const { editionId, assignmentId } = useParams<{ editionId?: string; assignmentId?: string }>();
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
    if (editionId || assignmentId) {
      fetchSchemaAndSubmission();
    }
  }, [editionId, assignmentId]);

  const fetchSchemaAndSubmission = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let targetEditionId = editionId;
      let schemaData = null;

      // 1. Fetch Form Schema
      if (assignmentId) {
        try {
          const assignRes = await fetch(`${API_BASE_URL}/api/assignments/${assignmentId}/schema`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (assignRes.ok) {
            const assignData = await assignRes.json();
            schemaData = assignData.filteredSchema;
            const ed = assignData.edition || assignData.assignment?.editionId;
            targetEditionId = typeof ed === 'object' ? (ed._id || ed.id) : ed;
          }
        } catch (e) {
          console.warn('Could not fetch schema by assignmentId:', e);
        }
      }

      if ((!schemaData || !schemaData.areas || schemaData.areas.length === 0) && targetEditionId) {
        try {
          const assignedRes = await fetch(`${API_BASE_URL}/api/assignments/edition/${targetEditionId}/schema`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (assignedRes.ok) {
            const assignedData = await assignedRes.json();
            schemaData = assignedData.filteredSchema;
          }
        } catch (e) {
          console.warn('Could not fetch assigned schema, falling back to full schema');
        }

        if (!schemaData || !schemaData.areas || schemaData.areas.length === 0) {
          const schemaRes = await fetch(`${API_BASE_URL}/api/schemas/${targetEditionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (schemaRes.ok) {
            schemaData = await schemaRes.json();
          }
        }
      }

      setSchema(schemaData);

      // 2. Fetch or Create Submission
      if (targetEditionId) {
        const subRes = await fetch(`${API_BASE_URL}/api/submissions/edition/${targetEditionId}/my-submission`, {
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
    if (isReadOnly) return;
    setResponses(prev => {
      const qIndex = prev.findIndex(r => String(r.questionId) === String(questionId));
      let updatedResponses = [...prev];
      if (qIndex === -1) {
        updatedResponses = [...prev, {
          questionId,
          fieldResponses: [{ fieldId, value, ...extra }]
        }];
      } else {
        const qResp = prev[qIndex];
        const fIndex = qResp.fieldResponses?.findIndex(fr => String(fr.fieldId) === String(fieldId)) ?? -1;
        let updatedFieldResponses = qResp.fieldResponses ? [...qResp.fieldResponses] : [];

        if (fIndex === -1) {
          updatedFieldResponses.push({ fieldId, value, ...extra });
        } else {
          updatedFieldResponses[fIndex] = { ...updatedFieldResponses[fIndex], value, ...extra };
        }

        updatedResponses[qIndex] = { ...qResp, fieldResponses: updatedFieldResponses };
      }

      if (submission) {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/submissions/${submission._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ responses: updatedResponses, status: submission.status })
        }).catch(err => console.error('Auto-save field error:', err));
      }

      return updatedResponses;
    });
  };

  const handleIsApplyingChange = async (questionId: string, isApplying: boolean) => {
    if (isReadOnly) return;
    let newResponses = [...responses];
    const qIndex = newResponses.findIndex(r => r.questionId === questionId);
    if (qIndex === -1) {
      newResponses.push({ questionId, fieldResponses: [], additionalFiles: [], isApplying });
    } else {
      newResponses[qIndex] = { ...newResponses[qIndex], isApplying };
    }
    setResponses(newResponses);

    if (submission) {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/submissions/${submission._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ responses: newResponses, status: submission.status })
      });
    }
  };

  const handleFileUpload = async (questionId: string, fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/submissions/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const fileData = await response.json();

        let newResponses = [...responses];
        const qIndex = newResponses.findIndex(r => r.questionId === questionId);

        if (qIndex === -1) {
          newResponses.push({
            questionId,
            fieldResponses: [{ fieldId, value: fileData.fileUrl, fileUrl: fileData.fileUrl, fileName: fileData.fileName }]
          });
        } else {
          const qResp = { ...newResponses[qIndex] };
          const fIndex = qResp.fieldResponses?.findIndex((fr: any) => fr.fieldId === fieldId) ?? -1;
          let updatedFieldResponses = qResp.fieldResponses ? [...qResp.fieldResponses] : [];

          if (fIndex === -1) {
            updatedFieldResponses.push({ fieldId, value: fileData.fileUrl, fileUrl: fileData.fileUrl, fileName: fileData.fileName });
          } else {
            updatedFieldResponses[fIndex] = { ...updatedFieldResponses[fIndex], value: fileData.fileUrl, fileUrl: fileData.fileUrl, fileName: fileData.fileName };
          }
          qResp.fieldResponses = updatedFieldResponses;
          newResponses[qIndex] = qResp;
        }

        setResponses(newResponses);

        if (submission) {
          await fetch(`${API_BASE_URL}/api/submissions/${submission._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ responses: newResponses, status: submission.status })
          });
        }
      } else {
        alert('File upload failed.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Error uploading file.');
    }
  };

  const handleRemoveFile = async (questionId: string, fieldId: string) => {
    if (isReadOnly) return;
    let newResponses = [...responses];
    const qIndex = newResponses.findIndex(r => r.questionId === questionId);
    if (qIndex !== -1) {
      const qResp = { ...newResponses[qIndex] };
      const fIndex = qResp.fieldResponses?.findIndex((fr: any) => fr.fieldId === fieldId) ?? -1;
      if (fIndex !== -1) {
        let updatedFieldResponses = [...qResp.fieldResponses];
        updatedFieldResponses[fIndex] = { ...updatedFieldResponses[fIndex], value: '', fileUrl: undefined, fileName: undefined };
        qResp.fieldResponses = updatedFieldResponses;
        newResponses[qIndex] = qResp;

        setResponses(newResponses);

        if (fileInputRefs.current[fieldId]) {
          fileInputRefs.current[fieldId]!.value = '';
        }

        if (submission) {
          const token = localStorage.getItem('token');
          await fetch(`${API_BASE_URL}/api/submissions/${submission._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ responses: newResponses, status: submission.status })
          });
        }
      }
    }
  };



  const handleSupportingDocumentUpload = async (questionId: string, documentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const uploadedFilesData = [];

      // 1. Upload all files sequentially to avoid overwhelming server
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/api/submissions/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (response.ok) {
          const fileData = await response.json();
          uploadedFilesData.push(fileData);
        } else {
          console.error('File upload failed for', file.name);
        }
      }

      if (uploadedFilesData.length === 0) {
        alert('All file uploads failed.');
        setSaving(false);
        return;
      }

      // 2. Compute new state synchronously
      let newResponses = [...responses];
      const qIndex = newResponses.findIndex(r => r.questionId === questionId);

      const newFilesToPush = uploadedFilesData.map(fileData => ({
        fileId: Math.random().toString(36).substr(2, 9),
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
        status: 'DRAFT' as const,
        evaluationStatus: 'PENDING' as any,
        submittedAt: new Date()
      }));

      if (qIndex === -1) {
        newResponses.push({
          questionId,
          fieldResponses: [],
          supportingDocumentResponses: [{
            documentId,
            status: 'DRAFT',
            files: newFilesToPush
          }]
        });
      } else {
        const qResp = { ...newResponses[qIndex] };
        const suppDocs = [...(qResp.supportingDocumentResponses || [])];
        const docIndex = suppDocs.findIndex(d => d.documentId === documentId);

        if (docIndex === -1) {
          suppDocs.push({
            documentId,
            status: 'DRAFT',
            files: newFilesToPush
          });
        } else {
          const docResp = { ...suppDocs[docIndex] };
          docResp.files = [...(docResp.files || []), ...newFilesToPush];
          suppDocs[docIndex] = docResp;
        }
        qResp.supportingDocumentResponses = suppDocs;
        newResponses[qIndex] = qResp;
      }

      // 3. Update local state
      setResponses(newResponses);

      // 4. Save to backend immediately (this will also update submission._id and version)
      if (submission) {
        await saveSubmission(submission.status, false, newResponses);
      }
    } catch (err) {
      console.error('Error uploading supporting doc:', err);
      alert('Error processing document upload.');
    } finally {
      setSaving(false);
    }
  };

  const removeSupportingDocument = async (questionId: string, documentId: string, fileId: string) => {
    if (isReadOnly) return;
    let newResponses = [...responses];
    const qIndex = newResponses.findIndex(r => r.questionId === questionId);

    if (qIndex !== -1) {
      const qResp = { ...newResponses[qIndex] };
      const suppDocs = [...(qResp.supportingDocumentResponses || [])];
      const docIndex = suppDocs.findIndex(d => d.documentId === documentId);

      if (docIndex !== -1) {
        const docResp = { ...suppDocs[docIndex] };
        docResp.files = (docResp.files || []).filter(f => f.fileId !== fileId);
        suppDocs[docIndex] = docResp;
        qResp.supportingDocumentResponses = suppDocs;
        newResponses[qIndex] = qResp;

        setResponses(newResponses);
        if (submission) {
          await saveSubmission(submission.status, false, newResponses);
        }
      }
    }
  };

  const saveSubmission = async (status: string, notify = true, explicitResponses?: ISubmissionResponse[]) => {
    if (!submission || isReadOnly) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/submissions/${submission._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ responses: explicitResponses || responses, status })
      });

      if (response.ok) {
        const updatedSub = await response.json();
        setSubmission(updatedSub);
        setResponses(updatedSub.responses || []);
        if (notify) {
          alert(status === 'SUBMITTED' ? 'Application submitted successfully!' : 'Draft saved successfully!');
        }
        if (status === 'SUBMITTED' || status === 'UNDER_REVIEW') {
          try {
            await fetch(`${API_BASE_URL}/api/assignments/edition/${editionId}/submit`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (e) {
            console.error('Failed to submit edition assignments:', e);
          }
          if (status === 'SUBMITTED') {
            navigate('/user-dashboard/assigned-tasks');
          }
        }
      } else {
        const errorData = await response.json();
        if (notify) alert(`Failed to save: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving submission:', err);
      if (notify) alert('Error saving submission.');
    } finally {
      setSaving(false);
    }
  };

  const submitQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to submit this question? You will not be able to edit it unless it is rejected by an admin.')) return;

    let updatedResponsesForSave: ISubmissionResponse[] = [];

    setResponses(prev => {
      const qIndex = prev.findIndex(r => String(r.questionId) === String(questionId));
      let updatedResponses = [...prev];

      if (qIndex === -1) {
        updatedResponses.push({
          questionId,
          fieldResponses: [],
          supportingDocumentResponses: [],
          additionalFiles: []
        });
      }

      const targetIndex = updatedResponses.findIndex(r => String(r.questionId) === String(questionId));
      if (targetIndex !== -1) {
        updatedResponses[targetIndex] = {
          ...updatedResponses[targetIndex],
          fieldResponses: (updatedResponses[targetIndex].fieldResponses || []).map(f => ({
            ...f,
            status: 'SUBMITTED' as const
          })),
          additionalFiles: (updatedResponses[targetIndex].additionalFiles || []).map(f => ({
            ...f,
            status: 'SUBMITTED' as const
          })),
          supportingDocumentResponses: (updatedResponses[targetIndex].supportingDocumentResponses || []).map(d => ({
            ...d,
            status: 'SUBMITTED' as const,
            files: (d.files || []).map(f => ({
              ...f,
              status: 'SUBMITTED' as const
            }))
          }))
        };
      }

      updatedResponsesForSave = updatedResponses;
      return updatedResponses;
    });

    setTimeout(() => {
      // Set overall status to UNDER_REVIEW so application appears in Admin Panel for evaluation
      const nextStatus = submission?.status === 'APPROVED' ? 'APPROVED' : 'UNDER_REVIEW';
      saveSubmission(nextStatus, false, updatedResponsesForSave).then(() => {
        alert('Question submitted successfully for review!');
      });
    }, 50);
  };

  const submitReformArea = async (areaId: string) => {
    if (!window.confirm('Are you sure you want to submit all questions in this Reform Area?')) return;

    const area = schema?.areas?.find(a => a.id === areaId);
    if (!area) return;

    const questionIdsInArea: string[] = [];
    area.actionPoints?.forEach(ap => {
      ap.questions?.forEach(q => questionIdsInArea.push(q.id));
    });

    let updatedResponsesForSave: ISubmissionResponse[] = [];

    setResponses(prev => {
      const updated = prev.map(qResp => {
        if (questionIdsInArea.includes(qResp.questionId)) {
          return {
            ...qResp,
            fieldResponses: qResp.fieldResponses.map(f => ({
              ...f,
              status: 'SUBMITTED' as const
            })),
            additionalFiles: (qResp.additionalFiles || []).map(f => ({
              ...f,
              status: 'SUBMITTED' as const
            })),
            supportingDocumentResponses: (qResp.supportingDocumentResponses || []).map(d => ({
              ...d,
              status: 'SUBMITTED' as const,
              files: (d.files || []).map(f => ({
                ...f,
                status: 'SUBMITTED' as const
              }))
            }))
          };
        }
        return qResp;
      });
      updatedResponsesForSave = updated;
      return updated;
    });

    setTimeout(() => {
      const nextStatus = submission?.status === 'APPROVED' ? 'APPROVED' : 'UNDER_REVIEW';
      saveSubmission(nextStatus, false, updatedResponsesForSave).then(() => {
        alert('Reform Area submitted successfully!');
      });
    }, 100);
  };

  const isQuestionAnswered = (question: Question): boolean => {
    const qResp = responses.find(r => r.questionId === question.id);
    if (!qResp) return false;

    if (qResp.isApplying === false) return true;
    if (!question.fields) return true;
    for (const field of question.fields) {
      if (field.required) {
        const fResp = qResp.fieldResponses?.find(f => f.fieldId === field.id);
        if (!fResp || (!fResp.value && !fResp.fileUrl)) return false;
      }
    }
    return true;
  };

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

  const calculateTotalScore = (): number => {
    let total = 0;
    responses.forEach(qResp => {
      const q = schema?.areas?.flatMap(a => a.actionPoints || []).flatMap(ap => ap.questions || []).find(q => q.id === qResp.questionId);
      if (!q) return;

      const allItems = [
        ...(qResp.fieldResponses || []),
        ...(qResp.additionalFiles || [])
      ];
      const allSuppFiles = (qResp.supportingDocumentResponses || []).flatMap(d => d.files || []);
      const combined = [...allItems, ...allSuppFiles];

      const isRejected = combined.some(f => f.evaluationStatus === 'REJECTED');
      const isResubmit = combined.some(f => f.evaluationStatus === 'RESUBMISSION_REQUIRED');
      const isApproved = !isRejected && !isResubmit && combined.some(f => f.evaluationStatus === 'APPROVED');

      if (isApproved) {
        total += (q.weightage || q.maxScore || 0);
      }
    });
    return total;
  };

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

  const answeredCount = allQuestions.filter(q => isQuestionAnswered(q.question)).length;
  const progressPercent = allQuestions.length > 0 ? Math.round((answeredCount / allQuestions.length) * 100) : 0;
  const isReadOnly = Boolean(assignmentId);

  return (
    <div className="user-workspace-container">
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
            <span style={{ display: 'inline-flex', alignItems: 'center', background: '#f0fdf4', padding: '4px 12px', borderRadius: '20px', border: '1px solid #bbf7d0', fontSize: '12px', fontWeight: 700, color: '#166534', marginLeft: '12px' }}>
              Score (Approved): {calculateTotalScore()}
            </span>
          </div>
        </div>

        {isReadOnly ? (
          <div style={{ padding: '8px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontSize: '13px', fontWeight: 600 }}>
            ℹ️ Read-Only View: Submitted form entries and uploaded documents are locked for viewing.
          </div>
        ) : (
          <div className="workspace-actions">
            <button
              className="btn-secondary"
              onClick={() => saveSubmission('DRAFT')}
              disabled={saving}
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
              disabled={saving}
            >
              <Send size={16} /> Submit Application
            </button>
          </div>
        )}
      </div>

      <div className="workspace-body">
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      {isExpanded ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
                      <span>{area.title.replace(/^\d+\.\s*/, '')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ fontSize: '11px', color: areaAnswered === areaTotal ? '#10b981' : '#64748b', fontWeight: 'bold' }}>
                        {areaAnswered}/{areaTotal}
                      </div>
                      <button
                        className="btn-outline btn-sm"
                        onClick={(e) => { e.stopPropagation(); submitReformArea(area.id); }}
                        style={{ fontSize: '10px', padding: '2px 6px', height: 'auto' }}
                        disabled={isReadOnly}
                      >
                        Submit Area
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="accordion-content">
                      {area.actionPoints?.map((ap) => (
                        <div key={ap.id}>
                          <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', backgroundColor: '#f8fafc', textTransform: 'uppercase' }}>
                            {ap.title.length > 30 ? ap.title.substring(0, 30) + '...' : ap.title}
                          </div>
                          {ap.questions?.map(q => {
                            const isSelected = selectedQuestionId === q.id;
                            const isAnswered = isQuestionAnswered(q);

                            // Check evaluation status
                            const qResp = responses.find(r => r.questionId === q.id);
                            let isApproved = false;
                            let isRejected = false;
                            let isResubmit = false;
                            let isSubmitted = false;

                            if (qResp) {
                              const allItems = [
                                ...(qResp.fieldResponses || []),
                                ...(qResp.additionalFiles || [])
                              ];
                              const allSuppFiles = (qResp.supportingDocumentResponses || []).flatMap(d => d.files || []);
                              const combined = [...allItems, ...allSuppFiles];

                              if (combined.length > 0) {
                                isSubmitted = combined.every(f => f.status === 'SUBMITTED');
                              }

                              isRejected = combined.some(f => f.evaluationStatus === 'REJECTED');
                              isResubmit = combined.some(f => f.evaluationStatus === 'RESUBMISSION_REQUIRED');
                              isApproved = !isRejected && !isResubmit && combined.some(f => f.evaluationStatus === 'APPROVED');
                            }

                            return (
                              <div
                                key={q.id}
                                className={`nav-question-item ${isSelected ? 'active' : ''}`}
                                onClick={() => setSelectedQuestionId(q.id)}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  {isApproved ? (
                                    <CheckCircle2 size={14} color="#10b981" />
                                  ) : isResubmit ? (
                                    <AlertCircle size={14} color="#f97316" />
                                  ) : isRejected ? (
                                    <XCircle size={14} color="#ef4444" />
                                  ) : isSubmitted ? (
                                    <CheckCircle2 size={14} color="#3b82f6" />
                                  ) : isAnswered ? (
                                    <CheckCircle2 size={14} color="#94a3b8" />
                                  ) : (
                                    <Circle size={14} color="#cbd5e1" />
                                  )}
                                  <span>Q {q.questionNumber}</span>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? '#3b82f6' : '#94a3b8' }}>
                                  {isApproved ? (
                                    <span style={{ color: '#10b981' }}>[{q.weightage}/{q.weightage}M]</span>
                                  ) : isResubmit ? (
                                    <span style={{ color: '#f97316' }}>[Resubmit]</span>
                                  ) : isRejected ? (
                                    <span style={{ color: '#ef4444' }}>[Rejected]</span>
                                  ) : (
                                    <span>[{q.weightage}M]</span>
                                  )}
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

        <div className="workspace-column">
          <div className="column-header">
            <h3>Question Form</h3>
            {selectedQuestion && <span style={{ fontSize: '11px', color: '#6366f1', background: '#ede9fe', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>ID: {selectedQuestion.id}</span>}
          </div>

          <div className="column-content" style={{ padding: '24px 32px 48px 32px' }}>
            {selectedQuestion ? (
              <div className="form-container">
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 800, fontSize: '22px', color: '#1e1b4b', marginBottom: '16px', lineHeight: '1.4' }}>
                    <span style={{ color: '#6366f1', marginRight: '8px' }}>Q{selectedQuestion.questionNumber}.</span>
                    {selectedQuestion.title}
                  </div>

                  <div className="elegant-details-box">
                    {selectedQuestion.guidelinesRef && (
                      <div className="elegant-detail-item">
                        <BookOpen size={16} className="detail-icon guidelines" />
                        <span className="detail-label">Guidelines:</span> {renderGuidelinesRef(selectedQuestion.guidelinesRef, editionId)}
                      </div>
                    )}
                    {selectedQuestion.scoringCriteria && (
                      <div className="elegant-detail-item">
                        <Award size={16} className="detail-icon scoring" />
                        <span className="detail-label">Scoring Criteria:</span> <span style={{ color: '#475569' }}>{selectedQuestion.scoringCriteria}</span>
                      </div>
                    )}
                    {selectedQuestion.requiredDocuments && (
                      <div className="elegant-detail-item evidence">
                        <FileText size={16} className="detail-icon evidence-icon" />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="detail-label evidence-label">Required Evidence:</span>
                          <span className="evidence-value">{selectedQuestion.requiredDocuments}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle Space: Yes / No Radio Selection Card */}
                {(() => {
                  const selectedQResp = responses.find(r => r.questionId === selectedQuestion.id);
                  const selectedIsApplying = selectedQResp?.isApplying !== false;

                  return (
                    <div style={{
                      margin: '20px 0',
                      padding: '16px 20px',
                      backgroundColor: selectedIsApplying ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${selectedIsApplying ? '#bbf7d0' : '#fecaca'}`,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap'
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                          Does your State/UT satisfy or provide evidence for this requirement?
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          {selectedIsApplying
                            ? 'Select Yes to upload supporting documents and enter details.'
                            : 'Question marked as No. The section below is frozen and no evidence is required.'}
                        </div>
                      </div>

                      <div className="elegant-radio-group" style={{ margin: 0, gap: '12px', display: 'flex', alignItems: 'center' }}>
                        <label
                          className={`elegant-radio-card ${selectedIsApplying ? 'selected' : ''}`}
                          style={{ padding: '8px 20px', borderRadius: '8px', cursor: isReadOnly ? 'not-allowed' : 'pointer', margin: 0 }}
                          onClick={() => !isReadOnly && handleIsApplyingChange(selectedQuestion.id, true)}
                        >
                          <input
                            type="radio"
                            name={`isApplying_${selectedQuestion.id}`}
                            checked={selectedIsApplying}
                            onChange={() => { }}
                            disabled={isReadOnly}
                            className="hidden-radio"
                          />
                          <div className="radio-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="radio-circle"></div>
                            <span className="radio-text" style={{ fontWeight: 700 }}>Yes</span>
                          </div>
                        </label>

                        <label
                          className={`elegant-radio-card ${!selectedIsApplying ? 'selected' : ''}`}
                          style={{ padding: '8px 20px', borderRadius: '8px', cursor: isReadOnly ? 'not-allowed' : 'pointer', margin: 0 }}
                          onClick={() => !isReadOnly && handleIsApplyingChange(selectedQuestion.id, false)}
                        >
                          <input
                            type="radio"
                            name={`isApplying_${selectedQuestion.id}`}
                            checked={!selectedIsApplying}
                            onChange={() => { }}
                            disabled={isReadOnly}
                            className="hidden-radio"
                          />
                          <div className="radio-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="radio-circle"></div>
                            <span className="radio-text" style={{ fontWeight: 700 }}>No</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  );
                })()}

                {/* Below Section Wrapper: Unlocked on Yes, Frozen on No */}
                {(() => {
                  const selectedQResp = responses.find(r => r.questionId === selectedQuestion.id);
                  const selectedIsApplying = selectedQResp?.isApplying !== false;

                  const isHardcodedSuppDocs = !!SUPPORTING_DOCS_DATA[selectedQuestion.id];
                  const hasSuppDocs = (selectedQuestion.supportingDocuments && selectedQuestion.supportingDocuments.length > 0) || isHardcodedSuppDocs;
                  const hasOldData = selectedQResp?.fieldResponses?.some(f => f.value || f.fileUrl) || false;
                  const hasFieldsToRender = selectedQuestion.fields && selectedQuestion.fields.length > 0 && !(hasSuppDocs && !hasOldData);

                  const qResp = selectedQResp;
                  const fieldsSubmitted = qResp?.fieldResponses?.every(f => f.status === 'SUBMITTED' && f.evaluationStatus !== 'REJECTED') ?? true;
                  const additionalFilesSubmitted = qResp?.additionalFiles?.every(f => f.status === 'SUBMITTED' && f.evaluationStatus !== 'REJECTED') ?? true;
                  const suppDocsSubmitted = qResp?.supportingDocumentResponses?.every(d =>
                    (d.files || []).every(f => f.status === 'SUBMITTED' && f.evaluationStatus !== 'REJECTED')
                  ) ?? true;

                  const hasFieldResponses = (qResp?.fieldResponses?.length || 0) > 0;
                  const hasAdditionalFiles = (qResp?.additionalFiles?.length || 0) > 0;
                  const hasSuppDocsResponses = qResp?.supportingDocumentResponses?.some(d => (d.files || []).length > 0) || false;

                  const allSubmitted = (hasFieldResponses || hasAdditionalFiles || hasSuppDocsResponses) && fieldsSubmitted && additionalFilesSubmitted && suppDocsSubmitted;

                  const allItems = [...(qResp?.fieldResponses || []), ...(qResp?.additionalFiles || [])];
                  const allSuppFiles = (qResp?.supportingDocumentResponses || []).flatMap(d => d.files || []);
                  const combined = [...allItems, ...allSuppFiles];
                  const isQRejected = combined.some(f => f.evaluationStatus === 'REJECTED');
                  const isQResubmit = combined.some(f => f.evaluationStatus === 'RESUBMISSION_REQUIRED');
                  const isQApproved = !isQRejected && !isQResubmit && combined.some(f => f.evaluationStatus === 'APPROVED');

                  const isQuestionReadOnly = isReadOnly || ((allSubmitted || isQApproved || isQRejected) && !isQResubmit);

                  const suppDocsList = selectedQuestion.supportingDocuments && selectedQuestion.supportingDocuments.length > 0
                    ? selectedQuestion.supportingDocuments
                    : (SUPPORTING_DOCS_DATA[selectedQuestion.id] || []);

                  return (
                    <div style={{
                      opacity: selectedIsApplying ? 1 : 0.5,
                      pointerEvents: selectedIsApplying ? 'auto' : 'none',
                      userSelect: selectedIsApplying ? 'auto' : 'none',
                      transition: 'opacity 0.2s ease'
                    }}>
                      {!selectedIsApplying && (
                        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertCircle size={16} /> Section frozen because 'No' is selected. No uploads or inputs are required.
                        </div>
                      )}

                      {/* Dynamic Form Fields */}
                      {hasFieldsToRender && (
                        <div className="dynamic-form-fields" style={{ marginBottom: '24px' }}>
                          {selectedQuestion.fields?.map(field => {
                            const fieldValue = getFieldValue(selectedQuestion.id, field.id);
                            const fResp = responses.find(r => r.questionId === selectedQuestion.id)?.fieldResponses?.find(f => f.fieldId === field.id);
                            const isFieldSubmitted = fResp?.status === 'SUBMITTED';
                            const isRejected = fResp?.evaluationStatus === 'REJECTED';
                            const isResubmit = fResp?.evaluationStatus === 'RESUBMISSION_REQUIRED';
                            const isApproved = fResp?.evaluationStatus === 'APPROVED';
                            const isFieldReadOnly = isReadOnly || isRejected || isApproved || (isFieldSubmitted && !isResubmit) || (isQuestionReadOnly && !isResubmit);

                            return (
                              <div key={field.id} className="dynamic-field-group">
                                <label className="field-label" style={{ fontSize: '14px', marginBottom: '4px' }}>
                                  {field.label}
                                  {field.required && <span className="field-required">*</span>}
                                </label>

                                {isFieldSubmitted && !isRejected && !isResubmit && (
                                  <div style={{ display: 'inline-block', fontSize: '10px', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', marginBottom: '8px', fontWeight: 600 }}>
                                    SUBMITTED FOR REVIEW
                                  </div>
                                )}

                                {(isRejected || isResubmit) && (
                                  <div style={{ padding: '12px', backgroundColor: isResubmit ? '#fff7ed' : '#fef2f2', border: `1px solid ${isResubmit ? '#fdba74' : '#fecaca'}`, borderRadius: '6px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isResubmit ? '#c2410c' : '#b91c1c', fontWeight: 600, marginBottom: '4px', fontSize: '12px' }}>
                                      <AlertCircle size={14} /> {isResubmit ? 'RESUBMISSION REQUIRED' : 'DOCUMENT REJECTED'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: isResubmit ? '#9a3412' : '#7f1d1d' }}>
                                      <strong>Admin Remarks:</strong> {fResp?.evaluationRemarks || 'No remarks provided.'}
                                    </div>
                                  </div>
                                )}

                                {field.type === 'Textbox' && (
                                  <input
                                    type="text"
                                    className="field-input"
                                    value={fieldValue}
                                    onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                                    disabled={isFieldReadOnly}
                                    placeholder="Enter text response"
                                  />
                                )}

                                {field.type === 'URL Field' && (
                                  <input
                                    type="url"
                                    className="field-input"
                                    value={fieldValue}
                                    onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                                    disabled={isFieldReadOnly}
                                    placeholder="https://example.gov.in"
                                  />
                                )}

                                {field.type === 'Number Field' && (
                                  <input
                                    type="number"
                                    className="field-input"
                                    value={fieldValue}
                                    onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                                    disabled={isFieldReadOnly}
                                    placeholder="Enter numeric value"
                                  />
                                )}

                                {field.type === 'Textarea' && (
                                  <textarea
                                    rows={5}
                                    className="field-input"
                                    value={fieldValue}
                                    onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                                    disabled={isFieldReadOnly}
                                    placeholder="Provide details..."
                                  />
                                )}

                                {field.type === 'Date Picker' && (
                                  <input
                                    type="date"
                                    className="field-input"
                                    value={fieldValue}
                                    onChange={(e) => handleFieldChange(selectedQuestion.id, field.id, e.target.value)}
                                    disabled={isFieldReadOnly}
                                  />
                                )}

                                {field.type === 'Radio Button' && (
                                  <div className="elegant-radio-group">
                                    {field.options?.map(opt => (
                                      <label key={opt} className={`elegant-radio-card ${fieldValue === opt ? 'selected' : ''}`}>
                                        <input
                                          type="radio"
                                          name={field.id}
                                          value={opt}
                                          checked={fieldValue === opt}
                                          onChange={() => handleFieldChange(selectedQuestion.id, field.id, opt)}
                                          disabled={isFieldReadOnly}
                                          className="hidden-radio"
                                        />
                                        <div className="radio-content">
                                          <div className="radio-circle"></div>
                                          <span className="radio-text">{opt}</span>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {(field.type === 'File Upload' || field.type === 'PDF Upload') && (
                                  <div style={{ marginTop: '8px' }}>
                                    {getFieldFile(selectedQuestion.id, field.id) ? (
                                      <div className={`uploaded-file-info ${(isRejected || isResubmit) ? 'rejected-border' : ''}`}>
                                        <a
                                          href={getFileUrl(getFieldFile(selectedQuestion.id, field.id)?.fileUrl)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="file-link"
                                        >
                                          <Paperclip size={14} />
                                          <span>{getFieldFile(selectedQuestion.id, field.id)?.fileName}</span>
                                        </a>
                                        {!isFieldReadOnly && (
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
                                        style={{
                                          cursor: isFieldReadOnly ? 'not-allowed' : 'pointer',
                                          opacity: isFieldReadOnly ? 0.65 : 1,
                                          pointerEvents: isFieldReadOnly ? 'none' : 'auto',
                                          backgroundColor: isFieldReadOnly ? '#f8fafc' : undefined,
                                          borderColor: isFieldReadOnly ? '#cbd5e1' : undefined
                                        }}
                                        onClick={() => !isFieldReadOnly && fileInputRefs.current[field.id]?.click()}
                                      >
                                        <Upload size={24} style={{ color: isFieldReadOnly ? '#94a3b8' : '#64748b', marginBottom: '12px' }} />
                                        <div style={{ fontSize: '14px', color: isFieldReadOnly ? '#64748b' : '#475569', fontWeight: 600 }}>
                                          {isFieldReadOnly ? 'No file uploaded' : 'Click to Upload Document / Evidence'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                                          {isFieldReadOnly ? 'Uploads disabled in read-only view' : 'Supports PDF, DOC, images up to 10MB'}
                                        </div>
                                        <input
                                          type="file"
                                          ref={el => { fileInputRefs.current[field.id] = el; }}
                                          disabled={isFieldReadOnly}
                                          style={{ display: 'none' }}
                                          onChange={(e) => !isFieldReadOnly && handleFileUpload(selectedQuestion.id, field.id, e)}
                                        />
                                      </div>
                                    )}

                                    {fResp?.history && fResp.history.length > 0 && (
                                      <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Document History (Rejected)</div>
                                        {fResp.history.map((hist, idx) => (
                                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '8px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: idx !== fResp.history!.length - 1 ? '6px' : '0' }}>
                                            <a
                                              href={getFileUrl(hist.fileUrl)}
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
                      )}

                      {/* Supporting Documents Section */}
                      {suppDocsList.length > 0 && (
                        <div style={{ marginTop: hasFieldsToRender ? '32px' : '20px', paddingTop: hasFieldsToRender ? '24px' : '0', borderTop: hasFieldsToRender ? '1px solid #e2e8f0' : 'none' }}>
                          <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '16px', color: '#1e293b', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <BookOpen size={18} color="#4f46e5" /> Supporting Documents Required
                            </h4>
                            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                              {suppDocsList.map(doc => {
                                const docResp = qResp?.supportingDocumentResponses?.find(r => r.documentId === doc.id);
                                const hasFiles = docResp && docResp.files && docResp.files.length > 0;
                                return (
                                  <div key={doc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                      {hasFiles ? (
                                        <CheckCircle2 size={18} color="#10b981" style={{ marginTop: '2px' }} />
                                      ) : (
                                        <div style={{ width: '16px', height: '16px', border: '2px solid #cbd5e1', borderRadius: '4px', marginTop: '4px' }}></div>
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                        {doc.title} {doc.mandatory && <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'normal', marginLeft: '4px' }}>*Mandatory</span>}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{doc.description}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '16px', color: '#1e293b', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Upload size={18} color="#4f46e5" /> Upload Supporting Documents
                            </h4>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              {suppDocsList.map(doc => {
                                const docResp = qResp?.supportingDocumentResponses?.find(r => r.documentId === doc.id);
                                const uploadedFiles = docResp?.files || [];
                                return (
                                  <div key={doc.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', backgroundColor: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                      <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{doc.title}</div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Formats: {doc.acceptedFileTypes.join(', ')} | Max {doc.maxFileSize}MB</div>
                                      </div>
                                      {(() => {
                                        const hasApproved = uploadedFiles.some(f => f.evaluationStatus === 'APPROVED');
                                        const hasRejected = uploadedFiles.some(f => f.evaluationStatus === 'REJECTED') || (docResp as any)?.evaluationStatus === 'REJECTED';
                                        const hasResubmit = uploadedFiles.some(f => f.evaluationStatus === 'RESUBMISSION_REQUIRED') || (docResp as any)?.evaluationStatus === 'RESUBMISSION_REQUIRED';

                                        let canUpload = false;
                                        if (isReadOnly) {
                                          canUpload = false;
                                        } else if (hasRejected) {
                                          canUpload = false;
                                        } else if (hasResubmit) {
                                          canUpload = true;
                                        } else if (hasApproved) {
                                          canUpload = false;
                                        } else {
                                          canUpload = !isQuestionReadOnly && (uploadedFiles.length < (doc.maxFiles || 1));
                                        }

                                        return (
                                          <label className={`btn-outline btn-sm ${!canUpload ? 'disabled' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: !canUpload ? 'not-allowed' : 'pointer', opacity: !canUpload ? 0.5 : 1 }}>
                                            <Upload size={14} /> Upload
                                            <input
                                              type="file"
                                              style={{ display: 'none' }}
                                              accept={doc.acceptedFileTypes.join(',')}
                                              disabled={!canUpload}
                                              multiple={doc.maxFiles > 1}
                                              onChange={(e) => handleSupportingDocumentUpload(selectedQuestion.id, doc.id, e)}
                                            />
                                          </label>
                                        );
                                      })()}
                                    </div>

                                    {uploadedFiles.length > 0 && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                        {uploadedFiles.map(f => {
                                          const isRejected = f.evaluationStatus === 'REJECTED';
                                          const isResubmit = f.evaluationStatus === 'RESUBMISSION_REQUIRED';
                                          const isApproved = f.evaluationStatus === 'APPROVED';
                                          const isPending = !f.evaluationStatus || f.evaluationStatus === 'PENDING';

                                          const canEditFile = isReadOnly ? false : (isResubmit ? true : (isRejected || isApproved ? false : !isQuestionReadOnly));

                                          return (
                                            <div key={f.fileId} className={`uploaded-file-info ${(isRejected || isResubmit) ? 'rejected-border' : ''}`}>
                                              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                  <a href={getFileUrl(f.fileUrl)} target="_blank" rel="noopener noreferrer" className="file-link">
                                                    <Paperclip size={14} />
                                                    <span>{f.fileName}</span>
                                                  </a>
                                                  {canEditFile && (
                                                    <button className="remove-file-btn" onClick={() => removeSupportingDocument(selectedQuestion.id, doc.id, f.fileId)}>
                                                      <Trash2 size={16} />
                                                    </button>
                                                  )}
                                                </div>

                                                {!isPending && (
                                                  <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {isApproved && <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14} /> Approved</span>}
                                                    {isRejected && <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Rejected: {f.evaluationRemarks}</span>}
                                                    {isResubmit && <span style={{ color: '#f97316', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={14} /> Resubmission Required: {f.evaluationRemarks}</span>}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {(selectedQuestion.fields?.length > 0 || suppDocsList.length > 0 || (qResp?.additionalFiles && qResp.additionalFiles.length > 0)) && (
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                              <button
                                className="btn-primary"
                                onClick={() => submitQuestion(selectedQuestion.id)}
                                disabled={allSubmitted || saving || isQApproved}
                                style={{
                                  opacity: (allSubmitted || saving || isQApproved) ? 0.6 : 1,
                                  cursor: (allSubmitted || saving || isQApproved) ? 'not-allowed' : 'pointer',
                                  backgroundColor: isQApproved ? '#10b981' : (allSubmitted ? '#10b981' : '#4f46e5')
                                }}
                              >
                                {saving ? 'Submitting...' : isQApproved ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle2 size={16} /> Approved
                                  </span>
                                ) : allSubmitted ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <CheckCircle2 size={16} /> Submitted
                                  </span>
                                ) : 'Submit Question for Review'}
                              </button>
                            </div>
                          )}

                          <div className="wizard-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
                            <button
                              className="btn-outline"
                              onClick={handlePrev}
                              disabled={currentIndex === 0}
                            >
                              Previous
                            </button>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              {isQApproved ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#10b981', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}>
                                  <CheckCircle2 size={16} /> Approved
                                </span>
                              ) : isQResubmit ? (
                                <button
                                  className="btn-primary"
                                  onClick={() => submitQuestion(selectedQuestion.id)}
                                  disabled={saving}
                                  style={{ backgroundColor: '#f97316', padding: '10px 18px' }}
                                >
                                  {saving ? 'Submitting...' : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <AlertCircle size={16} /> Resubmit Question
                                    </span>
                                  )}
                                </button>
                              ) : isQRejected ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ef4444', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}>
                                  <XCircle size={16} /> Rejected
                                </span>
                              ) : allSubmitted ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#3b82f6', color: '#ffffff', padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '13px' }}>
                                  <CheckCircle2 size={16} /> Submitted
                                </span>
                              ) : (
                                <button
                                  className="btn-primary"
                                  onClick={() => submitQuestion(selectedQuestion.id)}
                                  disabled={saving}
                                  style={{ padding: '10px 18px', backgroundColor: '#4f46e5' }}
                                >
                                  {saving ? 'Submitting...' : 'Submit Question for Review'}
                                </button>
                              )}
                              <button
                                className="btn-outline"
                                onClick={handleNext}
                                disabled={currentIndex === allQuestions.length - 1}
                              >
                                Next Question
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
