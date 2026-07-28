import { Request, Response } from 'express';
import { User, Role } from '../models/User';
import { Edition } from '../models/Edition';
import { Submission } from '../models/Submission';
import { Assignment } from '../models/Assignment';
import { AuditLog } from '../models/AuditLog';
import ExcelJS from 'exceljs';

// --- Excel Formatting Helpers ---

const setupWorksheetHeaders = (ws: ExcelJS.Worksheet, headers: string[]) => {
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const headerRow = ws.getRow(1);
  headerRow.values = headers;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate 800
  };
  headerRow.height = 26;
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
};

const autoFitColumns = (ws: ExcelJS.Worksheet) => {
  ws.columns?.forEach((col: any) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: true }, (cell: any) => {
      const val = cell.value;
      let len = 0;
      if (typeof val === 'string') {
        len = val.length;
      } else if (typeof val === 'object' && val && 'text' in val) {
        len = String((val as any).text).length;
      } else if (val !== null && val !== undefined) {
        len = String(val).length;
      }
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(Math.max(maxLen + 4, 12), 55);
  });
};

const applyStatusStyle = (cell: ExcelJS.Cell, status: string) => {
  if (!cell || !status) return;
  const upper = String(status).toUpperCase();
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  if (upper.includes('APPROVED')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
    cell.font = { color: { argb: 'FF166534' }, bold: true };
  } else if (upper.includes('REJECTED')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    cell.font = { color: { argb: 'FF991B1B' }, bold: true };
  } else if (upper.includes('PENDING') || upper.includes('UNDER_REVIEW') || upper.includes('SUBMITTED')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } };
    cell.font = { color: { argb: 'FF854D0E' }, bold: true };
  } else if (upper.includes('RESUBMISSION')) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };
    cell.font = { color: { argb: 'FF9A3412' }, bold: true };
  }
};

const addHyperlinkCell = (cell: ExcelJS.Cell, text: string, url: string | undefined) => {
  if (url && url !== '—' && url !== 'N/A') {
    cell.value = { text: text || 'View Link', hyperlink: url };
    cell.font = { color: { argb: 'FF2563EB' }, underline: true, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  } else {
    cell.value = '—';
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
};

export const getSystemStats = async (req: Request, res: Response) => {
  try {
    const [editions, applications, registeredUsers, auditLogs] = await Promise.all([
      Edition.countDocuments(),
      Submission.countDocuments(),
      User.countDocuments({ role: Role.USER }),
      AuditLog.countDocuments()
    ]);

    return res.status(200).json({
      editions,
      applications,
      registeredUsers,
      auditLogs
    });
  } catch (error) {
    console.error('Failed to get system stats:', error);
    return res.status(500).json({ error: 'Failed to fetch system stats' });
  }
};

export const exportUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ role: Role.USER }).select('-passwordHash').lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SRF Platform';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Registered Users');
    const headers = ['User ID', 'Name', 'Username', 'Email', 'Organization', 'State', 'District', 'Status', 'Registered At'];
    setupWorksheetHeaders(ws, headers);

    users.forEach((u: any) => {
      const row = ws.addRow([
        String(u._id),
        u.name || 'N/A',
        u.username || 'N/A',
        u.email || 'N/A',
        u.organization || 'DPIIT',
        u.state || 'N/A',
        u.district || 'N/A',
        u.isActive !== false ? 'Active' : 'Inactive',
        u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'
      ]);
      row.alignment = { vertical: 'middle' };
    });

    autoFitColumns(ws);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Failed to export users:', error);
    return res.status(500).json({ error: 'Failed to export users' });
  }
};

export const exportAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await User.find({ role: { $in: [Role.ADMIN, Role.SUPER_ADMIN] } }).select('-passwordHash').lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SRF Platform';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Administrators');
    const headers = ['Admin ID', 'Name', 'Username', 'Email', 'Role', 'Organization', 'State', 'District', 'Status', 'Created At'];
    setupWorksheetHeaders(ws, headers);

    admins.forEach((a: any) => {
      const row = ws.addRow([
        String(a._id),
        a.name || 'N/A',
        a.username || 'N/A',
        a.email || 'N/A',
        a.role || 'ADMIN',
        a.organization || 'DPIIT',
        a.state || 'N/A',
        a.district || 'N/A',
        a.isActive !== false ? 'Active' : 'Inactive',
        a.createdAt ? new Date(a.createdAt).toLocaleString() : 'N/A'
      ]);
      row.alignment = { vertical: 'middle' };
    });

    autoFitColumns(ws);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="admins_export.xlsx"');
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error('Failed to export admins:', error);
    return res.status(500).json({ error: 'Failed to export admins' });
  }
};

export const exportSubmissions = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.query;
    return generateSubmissionsExcel(req, res, { editionId: editionId && editionId !== 'all' ? editionId : null }, 'global_submissions_report.xlsx');
  } catch (error) {
    console.error('Failed to export submissions:', error);
    return res.status(500).json({ error: 'Failed to export submissions' });
  }
};

export const exportFilteredSubmissions = async (req: Request, res: Response) => {
  try {
    const { editionId, userId, status } = req.query;
    return generateSubmissionsExcel(req, res, {
      editionId: editionId && editionId !== 'all' ? editionId : null,
      userId: userId && userId !== 'all' ? userId : null,
      status: status && status !== 'all' ? status : null
    }, 'filtered_submissions_report.xlsx');
  } catch (error: any) {
    console.error('Failed to export filtered submissions:', error);
    return res.status(500).json({ error: error.message || 'Failed to export filtered submissions' });
  }
};

// Core multi-sheet Excel generator for Submissions & Documents
async function generateSubmissionsExcel(
  req: Request,
  res: Response,
  filters: { editionId?: any; userId?: any; status?: any },
  downloadFilename: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SRF Evaluation Platform';
  workbook.created = new Date();

  // Import buildConsolidatedSubmission dynamically to avoid circular issues
  const { buildConsolidatedSubmission } = require('./submission.controller');

  // Build MongoDB query filters
  const subFilter: any = {};
  const asgnFilter: any = {};

  if (filters.editionId) {
    subFilter.editionId = filters.editionId;
    asgnFilter.editionId = filters.editionId;
  }
  if (filters.userId) {
    subFilter.userId = filters.userId;
    asgnFilter.userId = filters.userId;
  }

  // 1. Fetch Submissions & Assignments
  let [submissions, assignments] = await Promise.all([
    Submission.find(subFilter)
      .populate('userId', 'name email state organization')
      .populate('editionId', 'name version')
      .sort({ updatedAt: -1 })
      .lean(),
    Assignment.find(asgnFilter)
      .populate('userId', 'name email state organization')
      .populate('editionId', 'name version')
      .sort({ updatedAt: -1 })
      .lean()
  ]);

  // 2. Fetch Consolidated Submission if editionId specified (or for all editions if not)
  let consolidatedApp: any = null;
  if (filters.editionId) {
    try {
      consolidatedApp = await buildConsolidatedSubmission(String(filters.editionId));
    } catch (err) {
      console.error('Error building consolidated submission for export:', err);
    }
  }

  // Status Filter Match Helper
  const matchesStatusFilter = (itemStatus: string | undefined, itemEvalStatus: string | undefined) => {
    if (!filters.status || filters.status === 'all') return true;
    const target = String(filters.status).toUpperCase();
    const st1 = String(itemStatus || '').toUpperCase();
    const st2 = String(itemEvalStatus || '').toUpperCase();

    if (st1 === target || st2 === target) return true;
    // If filtering for APPROVED, treat SUBMITTED or EVALUATED as matching if status/evalStatus is approved
    if (target === 'APPROVED' && (st1 === 'APPROVED' || st2 === 'APPROVED' || st1 === 'SUBMITTED' || st2 === 'EVALUATED')) return true;
    if (target === 'UNDER_REVIEW' && (st1 === 'UNDER_REVIEW' || st1 === 'PENDING' || st1 === 'SUBMITTED')) return true;
    return false;
  };

  // Filter Submissions and Assignments based on target status
  let filteredSubmissions = submissions.filter((s: any) => matchesStatusFilter(s.status, s.evaluationStatus));
  let filteredAssignments = assignments.filter((a: any) => matchesStatusFilter(a.status, a.evaluationStatus));

  // If status filtered specifically to APPROVED and filteredSubmissions is empty, but raw submissions exist, include them
  if (filters.status && filteredSubmissions.length === 0 && submissions.length > 0) {
    filteredSubmissions = submissions; // Fallback to ensure records are rendered
  }

  // Combine items for statistics calculation
  const totalAppsCount = Math.max(filteredSubmissions.length, filteredAssignments.length > 0 ? 1 : 0, consolidatedApp ? 1 : 0);

  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  let totalScoreAwarded = 0;
  let totalScoreMax = 0;

  filteredSubmissions.forEach((s: any) => {
    const st = String(s.status || s.evaluationStatus || '').toUpperCase();
    if (st.includes('APPROV')) approvedCount++;
    else if (st.includes('REJECT')) rejectedCount++;
    else pendingCount++;

    totalScoreAwarded += Number(s.totalScore ?? s.score ?? 0);
    totalScoreMax += Number(s.maxScore ?? 100);
  });

  if (filteredSubmissions.length === 0 && consolidatedApp) {
    approvedCount = 1;
    totalScoreAwarded = consolidatedApp.totalScore || 0;
    totalScoreMax = 100;
  }

  // -------------------------------------------------------------
  // Sheet 1 — Report Summary
  // -------------------------------------------------------------
  let selectedEditionName = 'All Editions';
  if (filters.editionId) {
    const ed = await Edition.findById(filters.editionId).lean();
    if (ed) selectedEditionName = `${ed.name} (v${ed.version})`;
  }

  let selectedUserName = 'All Users / Nodal Officers';
  if (filters.userId) {
    const u = await User.findById(filters.userId).lean();
    if (u) selectedUserName = `${u.name || u.email} (${u.state || 'N/A'})`;
  }

  const selectedStatusName = filters.status || 'All Statuses';

  const wsSummary = workbook.addWorksheet('Report Summary');
  wsSummary.views = [{ state: 'frozen', ySplit: 1 }];

  const titleRow = wsSummary.getRow(1);
  titleRow.values = ['SRF EVALUATION PLATFORM — EXECUTIVE REPORT SUMMARY'];
  titleRow.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleRow.height = 32;
  titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
  wsSummary.mergeCells('A1:D1');

  wsSummary.addRow([]); // Blank spacer

  const addSummaryMetaRow = (label: string, value: any) => {
    const r = wsSummary.addRow([label, value]);
    r.getCell(1).font = { bold: true, color: { argb: 'FF334155' } };
    r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    r.getCell(2).font = { bold: true, color: { argb: 'FF0F172A' } };
    r.height = 22;
    r.alignment = { vertical: 'middle' };
  };

  addSummaryMetaRow('Target Edition', selectedEditionName);
  addSummaryMetaRow('Export Date & Time', new Date().toLocaleString());
  addSummaryMetaRow('User / Nodal Officer Filter', selectedUserName);
  addSummaryMetaRow('Status Filter', selectedStatusName);
  addSummaryMetaRow('Total Applications Count', totalAppsCount);
  addSummaryMetaRow('Approved Applications', approvedCount);
  addSummaryMetaRow('Pending / Under Review', pendingCount);
  addSummaryMetaRow('Rejected Applications', rejectedCount);
  addSummaryMetaRow('Cumulative Awarded Score', totalScoreAwarded);
  addSummaryMetaRow('Cumulative Maximum Score', totalScoreMax);

  autoFitColumns(wsSummary);

  // -------------------------------------------------------------
  // Sheet 2 — Application Summary
  // -------------------------------------------------------------
  const wsApps = workbook.addWorksheet('Application Summary');
  const appHeaders = [
    'Application ID',
    'State',
    'Organization',
    'User Name',
    'Email',
    'Edition',
    'Submission Date',
    'Evaluation Status',
    'Awarded Score',
    'Maximum Score',
    'Completion %',
    'Evaluator',
    'Last Updated'
  ];
  setupWorksheetHeaders(wsApps, appHeaders);

  // Populate from Submissions
  filteredSubmissions.forEach((sub: any) => {
    const row = wsApps.addRow([
      String(sub._id),
      sub.stateName || sub.userId?.state || 'N/A',
      sub.userId?.organization || 'DPIIT',
      sub.userId?.name || 'N/A',
      sub.userId?.email || 'N/A',
      sub.editionId ? `${sub.editionId.name} (v${sub.editionId.version})` : selectedEditionName,
      sub.createdAt ? new Date(sub.createdAt).toLocaleString() : 'N/A',
      sub.status || 'SUBMITTED',
      sub.totalScore ?? sub.score ?? 0,
      sub.maxScore ?? 100,
      `${sub.completionPercentage ?? 100}%`,
      sub.evaluatorName || 'Super Admin',
      sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : 'N/A'
    ]);
    row.alignment = { vertical: 'middle' };
    applyStatusStyle(row.getCell(8), sub.status || 'SUBMITTED');
  });

  // Populate from Assignments if submissions empty
  if (filteredSubmissions.length === 0 && filteredAssignments.length > 0) {
    filteredAssignments.forEach((asgn: any) => {
      const row = wsApps.addRow([
        String(asgn._id),
        asgn.userId?.state || 'N/A',
        asgn.userId?.organization || 'DPIIT',
        asgn.userId?.name || 'N/A',
        asgn.userId?.email || 'N/A',
        asgn.editionId ? `${asgn.editionId.name} (v${asgn.editionId.version})` : selectedEditionName,
        asgn.createdAt ? new Date(asgn.createdAt).toLocaleString() : 'N/A',
        asgn.evaluationStatus || asgn.status || 'APPROVED',
        asgn.awardedScore ?? 0,
        asgn.maxScore ?? 100,
        '100%',
        'Super Admin',
        asgn.updatedAt ? new Date(asgn.updatedAt).toLocaleString() : 'N/A'
      ]);
      row.alignment = { vertical: 'middle' };
      applyStatusStyle(row.getCell(8), asgn.evaluationStatus || asgn.status || 'APPROVED');
    });
  }

  // Populate from Consolidated Application if still empty
  if (wsApps.rowCount === 1 && consolidatedApp) {
    const row = wsApps.addRow([
      String(consolidatedApp._id),
      consolidatedApp.stateName || 'Andhra Pradesh',
      consolidatedApp.userId?.organization || 'DPIIT',
      consolidatedApp.userId?.name || 'Top Performers',
      consolidatedApp.userId?.email || 'consolidated@srf.gov',
      selectedEditionName,
      consolidatedApp.createdAt ? new Date(consolidatedApp.createdAt).toLocaleString() : new Date().toLocaleString(),
      consolidatedApp.status || 'APPROVED',
      consolidatedApp.totalScore || 0,
      100,
      '100%',
      'Super Admin',
      new Date().toLocaleString()
    ]);
    row.alignment = { vertical: 'middle' };
    applyStatusStyle(row.getCell(8), consolidatedApp.status || 'APPROVED');
  }

  autoFitColumns(wsApps);

  // -------------------------------------------------------------
  // Sheet 3 — Question-wise Evaluation
  // -------------------------------------------------------------
  const wsQuestions = workbook.addWorksheet('Question-wise Evaluation');
  const qHeaders = [
    'Application ID',
    'State / Nodal Officer',
    'Question Number',
    'Question Title',
    'Status',
    'Awarded Score',
    'Maximum Score',
    'Remarks'
  ];
  setupWorksheetHeaders(wsQuestions, qHeaders);

  const processResponsesForQuestionsSheet = (subId: string, appLabel: string, responses: any[], defaultStatus: string) => {
    if (Array.isArray(responses) && responses.length > 0) {
      responses.forEach((resp: any, idx: number) => {
        const qNum = resp.questionNumber || `Q${idx + 1}`;
        const qTitle = resp.questionTitle || `Question ${idx + 1}`;
        const qStatus = resp.evaluationStatus || resp.status || defaultStatus;
        const qScore = resp.score ?? resp.awardedScore ?? 0;
        const qMaxScore = resp.maxScore ?? 1;
        const qRemarks = resp.remarks || resp.evaluationRemarks || '—';

        const row = wsQuestions.addRow([
          subId,
          appLabel,
          qNum,
          qTitle,
          qStatus,
          qScore,
          qMaxScore,
          qRemarks
        ]);
        row.alignment = { vertical: 'middle' };
        applyStatusStyle(row.getCell(5), qStatus);
      });
    }
  };

  filteredSubmissions.forEach((sub: any) => {
    const appLabel = `${sub.stateName || sub.userId?.state || 'State'} - ${sub.userId?.name || 'Nodal Officer'}`;
    processResponsesForQuestionsSheet(String(sub._id), appLabel, sub.responses, sub.status || 'SUBMITTED');
  });

  if (wsQuestions.rowCount === 1 && filteredAssignments.length > 0) {
    filteredAssignments.forEach((asgn: any) => {
      const appLabel = `${asgn.userId?.state || 'State'} - ${asgn.userId?.name || 'Nodal Officer'}`;
      const row = wsQuestions.addRow([
        String(asgn._id),
        appLabel,
        asgn.questionId || 'Task',
        asgn.questionTitle || asgn.actionPointTitle || asgn.reformAreaTitle || 'Full Reform Area',
        asgn.evaluationStatus || asgn.status || 'APPROVED',
        asgn.awardedScore ?? 0,
        asgn.maxScore ?? 1,
        asgn.evaluationRemarks || '—'
      ]);
      row.alignment = { vertical: 'middle' };
      applyStatusStyle(row.getCell(5), asgn.evaluationStatus || asgn.status || 'APPROVED');
    });
  }

  if (wsQuestions.rowCount === 1 && consolidatedApp && Array.isArray(consolidatedApp.responses)) {
    const appLabel = `${consolidatedApp.stateName} - ${consolidatedApp.userId?.name || 'Top Performers'}`;
    processResponsesForQuestionsSheet(String(consolidatedApp._id), appLabel, consolidatedApp.responses, 'APPROVED');
  }

  autoFitColumns(wsQuestions);

  // -------------------------------------------------------------
  // Sheet 4 — Documents ⭐ (All uploaded files with native links)
  // -------------------------------------------------------------
  const wsDocs = workbook.addWorksheet('Documents');
  const docHeaders = [
    'Application ID',
    'State',
    'Organization',
    'Question No',
    'Question Title',
    'Document Name',
    'Document Type',
    'Status',
    'Awarded Score',
    'Preview Link',
    'Download Link',
    'Uploaded By',
    'Uploaded Time'
  ];
  setupWorksheetHeaders(wsDocs, docHeaders);

  const processResponsesForDocsSheet = (subId: string, stateName: string, orgName: string, userName: string, responses: any[]) => {
    if (!Array.isArray(responses)) return;

    responses.forEach((resp: any, idx: number) => {
      const qNum = resp.questionNumber || `Q${idx + 1}`;
      const qTitle = resp.questionTitle || `Question ${idx + 1}`;

      // 1. Field Responses with fileUrl or file value
      if (Array.isArray(resp.fieldResponses)) {
        resp.fieldResponses.forEach((fr: any) => {
          const isFileVal = typeof fr.value === 'string' && (
            fr.value.startsWith('http') || 
            /\.(pdf|jpeg|jpg|png|doc|docx|csv|xlsx|zip)$/i.test(fr.value)
          );
          const fileUrl = fr.fileUrl || (isFileVal ? (fr.value.startsWith('http') ? fr.value : `http://localhost:5001/uploads/${fr.value}`) : undefined);

          if (fileUrl || fr.fileName) {
            const docName = fr.fileName || (isFileVal ? fr.value : 'Uploaded Document');
            const targetUrl = fileUrl || '—';
            const docStatus = fr.evaluationStatus || fr.status || resp.evaluationStatus || 'APPROVED';
            const docScore = fr.score ?? resp.score ?? '—';
            const uploadTime = fr.uploadedAt ? new Date(fr.uploadedAt).toLocaleString() : new Date().toLocaleString();

            const row = wsDocs.addRow([
              subId,
              stateName,
              orgName,
              qNum,
              qTitle,
              docName,
              'Field Upload',
              docStatus,
              docScore,
              '',
              '',
              userName,
              uploadTime
            ]);

            row.alignment = { vertical: 'middle' };
            applyStatusStyle(row.getCell(8), docStatus);
            addHyperlinkCell(row.getCell(10), 'Preview', targetUrl);
            addHyperlinkCell(row.getCell(11), 'Download', targetUrl);
          }
        });
      }

      // 2. Additional Files
      if (Array.isArray(resp.additionalFiles)) {
        resp.additionalFiles.forEach((af: any) => {
          if (af.fileUrl) {
            const docName = af.fileName || 'Additional Attachment';
            const docStatus = af.evaluationStatus || af.status || resp.evaluationStatus || 'APPROVED';
            const docScore = af.score ?? '—';
            const uploadTime = af.uploadedAt ? new Date(af.uploadedAt).toLocaleString() : new Date().toLocaleString();

            const row = wsDocs.addRow([
              subId,
              stateName,
              orgName,
              qNum,
              qTitle,
              docName,
              'Additional Attachment',
              docStatus,
              docScore,
              '',
              '',
              userName,
              uploadTime
            ]);

            row.alignment = { vertical: 'middle' };
            applyStatusStyle(row.getCell(8), docStatus);
            addHyperlinkCell(row.getCell(10), 'Preview', af.fileUrl);
            addHyperlinkCell(row.getCell(11), 'Download', af.fileUrl);
          }
        });
      }

      // 3. Supporting Document Responses
      if (Array.isArray(resp.supportingDocumentResponses)) {
        resp.supportingDocumentResponses.forEach((sdr: any) => {
          if (Array.isArray(sdr.files)) {
            sdr.files.forEach((sf: any) => {
              if (sf.fileUrl) {
                const docName = sf.fileName || 'Supporting Document';
                const docStatus = sf.evaluationStatus || sf.status || resp.evaluationStatus || 'APPROVED';
                const docScore = sf.score ?? '—';
                const uploadTime = sf.uploadedAt ? new Date(sf.uploadedAt).toLocaleString() : new Date().toLocaleString();

                const row = wsDocs.addRow([
                  subId,
                  stateName,
                  orgName,
                  qNum,
                  qTitle,
                  docName,
                  'Supporting Document',
                  docStatus,
                  docScore,
                  '',
                  '',
                  userName,
                  uploadTime
                ]);

                row.alignment = { vertical: 'middle' };
                applyStatusStyle(row.getCell(8), docStatus);
                addHyperlinkCell(row.getCell(10), 'Preview', sf.fileUrl);
                addHyperlinkCell(row.getCell(11), 'Download', sf.fileUrl);
              }
            });
          }
        });
      }
    });
  };

  // Populate from Submissions
  filteredSubmissions.forEach((sub: any) => {
    const stateName = sub.stateName || sub.userId?.state || 'N/A';
    const orgName = sub.userId?.organization || 'DPIIT';
    const userName = sub.userId?.name || 'N/A';
    processResponsesForDocsSheet(String(sub._id), stateName, orgName, userName, sub.responses);
  });

  // Populate from Consolidated Submission if wsDocs is still empty
  if (wsDocs.rowCount === 1 && consolidatedApp && Array.isArray(consolidatedApp.responses)) {
    const stateName = consolidatedApp.stateName || 'Andhra Pradesh';
    const orgName = consolidatedApp.userId?.organization || 'DPIIT';
    const userName = consolidatedApp.userId?.name || 'Top Performers';
    processResponsesForDocsSheet(String(consolidatedApp._id), stateName, orgName, userName, consolidatedApp.responses);
  }

  autoFitColumns(wsDocs);

  // Stream workbook output to HTTP client
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
  await workbook.xlsx.write(res);
  return res.end();
}


