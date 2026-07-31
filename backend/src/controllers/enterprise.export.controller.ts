import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { User } from '../models/User';
import { Edition } from '../models/Edition';
import { Submission } from '../models/Submission';
import { FormSchemaModel } from '../models/FormSchema';
import { AuthRequest } from '../middleware/auth.middleware';

// ─── STYLING CONSTANTS ───────────────────────────────────────────────────────
const DARK_NAVY_BG = '1B3A6B';
const WHITE_FG     = 'FFFFFFFF';
const ROW_ODD_BG   = 'FFFFFFFF';
const ROW_EVEN_BG  = 'F8FAFC';
const BORDER_COLOR = 'CBD5E1';
const LINK_COLOR   = '2563EB';

const STATUS_FILLS: Record<string, { bg: string; fg: string }> = {
  APPROVED:              { bg: 'D1FAE5', fg: '065F46' },
  REJECTED:              { bg: 'FEE2E2', fg: '991B1B' },
  PENDING:               { bg: 'FEF9C3', fg: '92400E' },
  SUBMITTED:             { bg: 'DBEAFE', fg: '1E40AF' },
  UNDER_REVIEW:          { bg: 'FEF9C3', fg: '92400E' },
  RESUBMISSION_REQUIRED: { bg: 'FFEDD5', fg: '9A3412' },
  DRAFT:                 { bg: 'F1F5F9', fg: '475569' },
};

const cellBorder: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
  left:   { style: 'thin', color: { argb: BORDER_COLOR } },
  right:  { style: 'thin', color: { argb: BORDER_COLOR } },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtDate(d: any): string {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtVal(val: any): string {
  if (val == null || val === '') return '';
  if (val === true) return 'Yes';
  if (val === false) return 'No';
  if (Array.isArray(val)) {
    const cleaned = val.filter(v => v != null && v !== '');
    return cleaned.join(', ');
  }
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch (e) { return String(val); }
  }
  const str = String(val).trim();
  if (str === 'NULL' || str === 'null' || str === 'undefined' || str === 'N/A') return '';
  return str;
}

function buildHeaderRow(ws: ExcelJS.Worksheet, headers: string[]) {
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const hrow = ws.addRow(headers);
  hrow.height = 34;
  hrow.eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: WHITE_FG }, size: 11 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_NAVY_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border    = {
      top:    { style: 'thin', color: { argb: BORDER_COLOR } },
      bottom: { style: 'medium', color: { argb: '94A3B8' } },
      left:   { style: 'thin', color: { argb: BORDER_COLOR } },
      right:  { style: 'thin', color: { argb: BORDER_COLOR } },
    };
  });

  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers.length },
  };
}

function autoFitColumns(ws: ExcelJS.Worksheet) {
  ws.columns?.forEach((col: any) => {
    let maxLen = 14;
    col.eachCell?.({ includeEmpty: false }, (cell: any) => {
      const val = cell.value;
      let len = 0;
      if (typeof val === 'string') len = val.length;
      else if (val && typeof val === 'object' && 'text' in val) len = String(val.text).length;
      else if (val != null) len = String(val).length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 65);
  });
}

function applyStatusBadge(cell: ExcelJS.Cell, status: string) {
  const key = String(status || '').toUpperCase().replace(/ /g, '_');
  const style = STATUS_FILLS[key] ?? STATUS_FILLS['PENDING'];
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
  cell.font  = { bold: true, color: { argb: style.fg }, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
}

/** Robust query filter resolver for User, Edition, and Status params */
async function resolveFilterQuery(reqQuery: any) {
  const { editionId, userId, status } = reqQuery;

  console.log('[Export Debug] Raw Query Params:', { userId, editionId, status });

  const subFilter: any = {};

  // 1. Resolve User Filter (supports ObjectId, username, email, name)
  if (userId && userId !== 'all') {
    const userStr = String(userId).trim();
    const uOrConditions: any[] = [];
    if (mongoose.Types.ObjectId.isValid(userStr)) {
      uOrConditions.push({ _id: new mongoose.Types.ObjectId(userStr) });
    }
    const userRegex = new RegExp(`^${userStr}$`, 'i');
    uOrConditions.push({ username: userRegex }, { email: userRegex }, { name: userRegex });

    const matchedUsers = await User.find({ $or: uOrConditions }).select('_id').lean();
    const userObjectIds = matchedUsers.map(u => u._id);

    if (mongoose.Types.ObjectId.isValid(userStr)) {
      userObjectIds.push(new mongoose.Types.ObjectId(userStr));
    }

    if (userObjectIds.length > 0) {
      subFilter.userId = { $in: userObjectIds };
    } else {
      subFilter.userId = new mongoose.Types.ObjectId();
    }
  }

  // 2. Resolve Edition Filter (supports ObjectId, name, version)
  if (editionId && editionId !== 'all') {
    const edStr = String(editionId).trim();
    const eOrConditions: any[] = [];
    if (mongoose.Types.ObjectId.isValid(edStr)) {
      eOrConditions.push({ _id: new mongoose.Types.ObjectId(edStr) });
    }
    const edRegex = new RegExp(`^${edStr}$`, 'i');
    eOrConditions.push({ name: edRegex }, { version: edRegex });

    const matchedEditions = await Edition.find({ $or: eOrConditions }).select('_id').lean();
    const editionObjectIds = matchedEditions.map(e => e._id);

    if (mongoose.Types.ObjectId.isValid(edStr)) {
      editionObjectIds.push(new mongoose.Types.ObjectId(edStr));
    }

    if (editionObjectIds.length > 0) {
      subFilter.editionId = { $in: editionObjectIds };
    } else {
      subFilter.editionId = new mongoose.Types.ObjectId();
    }
  }

  // 3. Resolve Status Filter
  if (status && status !== 'all') {
    const statusStr = String(status).trim().toUpperCase();
    if (statusStr === 'APPROVED') {
      // Include APPROVED, SUBMITTED, and UNDER_REVIEW submissions when APPROVED filter is selected
      subFilter.status = { $in: [/^APPROVED$/i, /^SUBMITTED$/i, /^UNDER_REVIEW$/i] };
    } else {
      subFilter.status = { $regex: new RegExp(`^${statusStr}$`, 'i') };
    }
  }

  console.log('[Export Debug] Resolved Submission Filter:', JSON.stringify(subFilter));
  return subFilter;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 1: ADMINISTRATIVE MIS REPORT ("Applications Report (Excel)" button)
// ─────────────────────────────────────────────────────────────────────────────
export const exportApplicationsReportMIS = async (req: AuthRequest, res: Response) => {
  try {
    const subFilter = await resolveFilterQuery(req.query);

    const { editionId } = req.query;
    const edFilter: any = {};
    if (editionId && editionId !== 'all') {
      const edStr = String(editionId).trim();
      if (mongoose.Types.ObjectId.isValid(edStr)) {
        edFilter._id = new mongoose.Types.ObjectId(edStr);
      } else {
        edFilter.name = new RegExp(`^${edStr}$`, 'i');
      }
    }

    const [editions, formSchemas, submissions] = await Promise.all([
      Edition.find(edFilter).sort({ createdAt: 1 }).lean(),
      FormSchemaModel.find({}).lean(),
      Submission.find(subFilter)
        .populate('userId', 'name email organization department state district role designation')
        .populate('editionId', 'name version')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    console.log('[Export Debug] Applications MIS Fetched:', submissions.length);

    const schemaMap = new Map<string, any>();
    for (const schema of formSchemas) {
      schemaMap.set(String(schema.editionId), schema);
    }

    const wb = new ExcelJS.Workbook();
    wb.creator  = 'SRF Platform — MIS Register';
    wb.created  = new Date();
    wb.modified = new Date();

    // ═════════════════════════════════════════════════════════════════════════
    // SHEET 1 — Applications Report (Administrative MIS Register)
    // ═════════════════════════════════════════════════════════════════════════
    const wsReport = wb.addWorksheet('Applications Report', {
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    const misHeaders = [
      'Application ID',
      'Application Number',
      'Application Title',
      'SRF Edition',
      'Edition Version',
      'Applicant Name',
      'Applicant Email',
      'District',
      'Department',
      'Role',
      'Assigned Nodal Officer',
      'Assigned Evaluator',
      'Application Status',
      'Submission Status',
      'Current Workflow Stage',
      'Submission Date',
      'Last Updated',
      'Approved By',
      'Approval Date',
      'Rejected By',
      'Rejected Date',
      'Current Score',
      'Maximum Score',
      'Completion Percentage',
      'Total Reform Areas',
      'Completed Reform Areas',
      'Pending Reform Areas',
      'Total Action Points',
      'Completed Action Points',
      'Pending Action Points',
      'Total Questions',
      'Answered Questions',
      'Unanswered Questions',
      'Total Uploaded Documents',
      'Created Date',
      'Last Modified',
      'Remarks',
    ];

    buildHeaderRow(wsReport, misHeaders);

    submissions.forEach((sub: any, rowIdx: number) => {
      const u     = sub.userId as any || {};
      const ed    = sub.editionId as any || {};
      const rev   = sub.reviewedBy as any;
      const subId = String(sub._id);
      const edId  = String(ed._id || sub.editionId || '');

      const isApproved = String(sub.status).toUpperCase() === 'APPROVED';
      const isRejected = String(sub.status).toUpperCase() === 'REJECTED';

      const schema = schemaMap.get(edId);
      let totalAreas = 0, totalAPs = 0, totalQs = 0;

      if (schema && Array.isArray(schema.areas)) {
        totalAreas = schema.areas.length;
        for (const a of schema.areas) {
          if (Array.isArray(a.actionPoints)) {
            totalAPs += a.actionPoints.length;
            for (const ap of a.actionPoints) {
              if (Array.isArray(ap.questions)) {
                totalQs += ap.questions.length;
              }
            }
          }
        }
      }

      let answeredQs = 0;
      let totalDocCount = 0;

      if (Array.isArray(sub.responses)) {
        for (const resp of sub.responses) {
          let hasAnswer = false;

          if (resp.isApplying === false) {
            hasAnswer = true;
          }

          if (Array.isArray(resp.fieldResponses)) {
            for (const fr of resp.fieldResponses) {
              const isFile = fr.fileUrl || (
                typeof fr.value === 'string' &&
                (fr.value.startsWith('/uploads/') || /\.(pdf|jpg|jpeg|png|doc|docx|xlsx|csv|zip)/i.test(fr.value))
              );
              if (isFile) {
                totalDocCount++;
                hasAnswer = true;
              } else if (fr.value != null && fr.value !== '') {
                hasAnswer = true;
              }
            }
          }

          if (Array.isArray(resp.additionalFiles)) {
            totalDocCount += resp.additionalFiles.filter((af: any) => af.fileUrl).length;
            if (resp.additionalFiles.length > 0) hasAnswer = true;
          }

          if (Array.isArray(resp.supportingDocumentResponses)) {
            for (const sdr of resp.supportingDocumentResponses) {
              if (Array.isArray(sdr.files)) {
                totalDocCount += sdr.files.filter((f: any) => f.fileUrl).length;
                if (sdr.files.length > 0) hasAnswer = true;
              }
            }
          }

          if (hasAnswer) answeredQs++;
        }
      }

      const unansweredQs = Math.max(0, totalQs - answeredQs);

      let workflowStage = 'Draft in Progress';
      const stUpper = String(sub.status || '').toUpperCase();
      if (stUpper === 'APPROVED') workflowStage = 'Evaluation Complete (Approved)';
      else if (stUpper === 'REJECTED') workflowStage = 'Evaluation Complete (Rejected)';
      else if (stUpper === 'UNDER_REVIEW') workflowStage = 'Under Evaluation';
      else if (stUpper === 'SUBMITTED') workflowStage = 'Pending Evaluation';

      const totalScore = sub.totalScore ?? 0;
      const maxScore   = 100;
      const completionPct = `${Math.min(100, Math.round((totalScore / maxScore) * 100))}%`;

      const completedAPs = isApproved ? totalAPs : Math.round((answeredQs / Math.max(1, totalQs)) * totalAPs);
      const pendingAPs   = Math.max(0, totalAPs - completedAPs);
      const completedAreas = isApproved ? totalAreas : Math.round((completedAPs / Math.max(1, totalAPs)) * totalAreas);
      const pendingAreas   = Math.max(0, totalAreas - completedAreas);

      const rowValues = [
        subId,
        sub.applicationNumber || subId,
        `${ed.name || 'SRF Application'} - ${u.name || u.email || 'Submission'}`,
        ed.name || '',
        ed.version || '',
        u.name || u.email || '',
        u.email || '',
        u.district || 'Unassigned',
        u.department || u.organization || '',
        u.role || '',
        u.name || u.email || '',
        rev ? (rev.name || rev.email) : 'Super Admin',
        sub.status || 'DRAFT',
        sub.status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
        workflowStage,
        fmtDate(sub.createdAt),
        fmtDate(sub.updatedAt),
        isApproved ? (rev ? (rev.name || rev.email) : 'Super Admin') : '',
        isApproved ? fmtDate(sub.updatedAt) : '',
        isRejected ? (rev ? (rev.name || rev.email) : 'Super Admin') : '',
        isRejected ? fmtDate(sub.updatedAt) : '',
        totalScore,
        maxScore,
        completionPct,
        totalAreas,
        completedAreas,
        pendingAreas,
        totalAPs,
        completedAPs,
        pendingAPs,
        totalQs,
        answeredQs,
        unansweredQs,
        totalDocCount,
        fmtDate(sub.createdAt),
        fmtDate(sub.updatedAt),
        sub.adminRemarks || '',
      ];

      const row = wsReport.addRow(rowValues);
      row.height = 22;
      const bg = rowIdx % 2 === 0 ? ROW_ODD_BG : ROW_EVEN_BG;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = cellBorder;
        cell.alignment = { vertical: 'middle', wrapText: true };

        if (colNumber === 13) {
          applyStatusBadge(cell, String(cell.value || ''));
        }
      });
    });

    if (submissions.length === 0) {
      const emptyRow = wsReport.addRow(['No applications found for the selected filter.']);
      emptyRow.height = 24;
    }

    autoFitColumns(wsReport);

    // ═════════════════════════════════════════════════════════════════════════
    // SHEET 2 — Dashboard Summary (Executive Statistics Sheet)
    // ═════════════════════════════════════════════════════════════════════════
    const wsSummary = wb.addWorksheet('Dashboard Summary');
    wsSummary.views = [{ state: 'frozen', ySplit: 1 }];

    const sumHeaders = ['Metric / Category', 'Value / Count', 'Percentage / Details'];
    buildHeaderRow(wsSummary, sumHeaders);

    const totalApps  = submissions.length;
    const draftCount = submissions.filter(s => String(s.status).toUpperCase() === 'DRAFT').length;
    const subCount   = submissions.filter(s => String(s.status).toUpperCase() === 'SUBMITTED').length;
    const revCount   = submissions.filter(s => String(s.status).toUpperCase() === 'UNDER_REVIEW').length;
    const appCount   = submissions.filter(s => String(s.status).toUpperCase() === 'APPROVED').length;
    const rejCount   = submissions.filter(s => String(s.status).toUpperCase() === 'REJECTED').length;

    const scores = submissions.map(s => s.totalScore ?? 0);
    const avgScore = totalApps > 0 ? (scores.reduce((a, b) => a + b, 0) / totalApps).toFixed(2) : '0';
    const maxScoreVal = scores.length > 0 ? Math.max(...scores) : 0;
    const minScoreVal = scores.length > 0 ? Math.min(...scores) : 0;

    const summaryStats: [string, any, string][] = [
      ['Total Applications',        totalApps, '100%'],
      ['Draft Applications',        draftCount, totalApps > 0 ? `${((draftCount / totalApps) * 100).toFixed(1)}%` : '0%'],
      ['Submitted Applications',    subCount,   totalApps > 0 ? `${((subCount / totalApps) * 100).toFixed(1)}%` : '0%'],
      ['Under Review Applications', revCount,   totalApps > 0 ? `${((revCount / totalApps) * 100).toFixed(1)}%` : '0%'],
      ['Approved Applications',     appCount,   totalApps > 0 ? `${((appCount / totalApps) * 100).toFixed(1)}%` : '0%'],
      ['Rejected Applications',     rejCount,   totalApps > 0 ? `${((rejCount / totalApps) * 100).toFixed(1)}%` : '0%'],
      ['Average Application Score', avgScore,   'Out of 100'],
      ['Highest Score',             maxScoreVal,'Out of 100'],
      ['Lowest Score',              minScoreVal,'Out of 100'],
    ];

    summaryStats.forEach(([metric, val, detail], idx) => {
      const row = wsSummary.addRow([metric, val, detail]);
      row.height = 22;
      const bg = idx % 2 === 0 ? ROW_ODD_BG : ROW_EVEN_BG;
      row.eachCell({ includeEmpty: true }, (cell, cNum) => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = cellBorder;
        cell.alignment = { vertical: 'middle' };
        if (cNum === 1) cell.font = { bold: true };
      });
    });

    autoFitColumns(wsSummary);

    const dateStr = new Date().toISOString().slice(0, 10);
    const downloadFilename = `SRF_Applications_MIS_Report_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

    await wb.xlsx.write(res);
    return res.end();

  } catch (err: any) {
    console.error('[Applications MIS Report Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate Applications MIS Report' });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 2: DETAILED SUBMISSIONS MATRIX ("Download Submissions" button)
// ─────────────────────────────────────────────────────────────────────────────
export const exportEnterpriseReport = async (req: AuthRequest, res: Response) => {
  try {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:5001';
    const baseUrl = `${protocol}://${host}`;

    const subFilter = await resolveFilterQuery(req.query);

    const { editionId } = req.query;
    const edFilter: any = {};
    if (editionId && editionId !== 'all') {
      const edStr = String(editionId).trim();
      if (mongoose.Types.ObjectId.isValid(edStr)) {
        edFilter._id = new mongoose.Types.ObjectId(edStr);
      } else {
        edFilter.name = new RegExp(`^${edStr}$`, 'i');
      }
    }

    // ── 1. Batch fetch target collections ────────────────────────────────────
    const [editions, formSchemas, submissions] = await Promise.all([
      Edition.find(edFilter).sort({ createdAt: 1 }).lean(),
      FormSchemaModel.find({}).lean(),
      Submission.find(subFilter)
        .populate('userId', 'name email organization department state district role designation')
        .populate('editionId', 'name version')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    console.log('[Export Debug] Submissions Matrix Fetched:', submissions.length);

    // Build Schema Lookup by editionId string
    const schemaMap = new Map<string, any>();
    for (const schema of formSchemas) {
      schemaMap.set(String(schema.editionId), schema);
    }

    // ── 2. Build 1 COLUMN PER QUESTION for Target Edition(s) ─────────────────
    interface DynamicQuestionCol {
      colKey: string;
      editionId: string;
      editionName: string;
      questionId: string;
      headerText: string;
      reformAreaTitle: string;
      actionPointTitle: string;
      questionTitle: string;
    }

    const dynamicCols: DynamicQuestionCol[] = [];
    const colIndexMap = new Map<string, number>();

    function registerQuestionCol(col: DynamicQuestionCol) {
      if (!colIndexMap.has(col.colKey)) {
        colIndexMap.set(col.colKey, dynamicCols.length);
        dynamicCols.push(col);
      }
    }

    // Register columns from FormSchemas for target edition(s)
    for (const edition of editions) {
      const edId = String(edition._id);
      const edName = edition.name || `SRF ${edition.version || ''}`;
      const schema = schemaMap.get(edId);

      if (schema && Array.isArray(schema.areas)) {
        for (const area of schema.areas) {
          const raTitle = area.title || 'Reform Area';
          for (const ap of (area.actionPoints || [])) {
            const apTitle = ap.title || 'Action Point';
            for (const q of (ap.questions || [])) {
              const qTitle = q.title || `Question ${q.questionNumber || ''}`;
              const colKey = `${edId}___${q.id}`;
              const headerText = `${edName} > ${raTitle} > ${apTitle} > ${qTitle}`;

              registerQuestionCol({
                colKey,
                editionId: edId,
                editionName: edName,
                questionId: q.id,
                headerText,
                reformAreaTitle: raTitle,
                actionPointTitle: apTitle,
                questionTitle: qTitle,
              });
            }
          }
        }
      }
    }

    // ALSO scan target Submissions to ensure any question response in DB is registered as a column
    for (const sub of submissions) {
      const edObj = sub.editionId as any;
      const edId = String(edObj?._id || sub.editionId || '');
      const edName = edObj?.name || 'SRF Platform';

      if (editionId && editionId !== 'all' && edId !== String(editionId)) continue;
      if (!Array.isArray(sub.responses)) continue;

      for (const resp of sub.responses) {
        const qId = resp.questionId;
        if (!qId) continue;

        const colKey = `${edId}___${qId}`;
        if (!colIndexMap.has(colKey)) {
          registerQuestionCol({
            colKey,
            editionId: edId,
            editionName: edName,
            questionId: qId,
            headerText: `${edName} > General > Questions > ${qId}`,
            reformAreaTitle: 'General',
            actionPointTitle: 'Questions',
            questionTitle: qId,
          });
        }
      }
    }

    // ── 3. Initialize Workbook ───────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator  = 'SRF Platform';
    wb.created  = new Date();
    wb.modified = new Date();

    // ═════════════════════════════════════════════════════════════════════════
    // SHEET 1 — Applications Report (1 Row = 1 Application, 1 Column = 1 Question)
    // ═════════════════════════════════════════════════════════════════════════
    const wsApps = wb.addWorksheet('Applications Report', {
      pageSetup: { orientation: 'landscape', fitToPage: true }
    });

    const fixedHeaders = [
      'Application ID',
      'Edition',
      'Applicant',
      'Email',
      'District',
      'State',
      'Status',
      'Submission Date',
      'Total Score',
      'Admin Remarks',
    ];

    const allHeaders = [...fixedHeaders, ...dynamicCols.map(c => c.headerText)];
    buildHeaderRow(wsApps, allHeaders);

    const documentIndexRows: any[] = [];

    // Populate rows for each application matching the selected filters
    submissions.forEach((sub: any, rowIdx: number) => {
      const u     = sub.userId as any || {};
      const ed    = sub.editionId as any || {};
      const subId = String(sub._id);
      const edId  = String(ed._id || sub.editionId || '');
      const edName = ed.name || 'SRF Platform';

      const fixedValues = [
        subId,
        ed.name ? `${ed.name} (v${ed.version || ''})` : edName,
        u.name || u.email || '',
        u.email || '',
        u.district || 'Unassigned',
        sub.stateName || u.state || '',
        sub.status || 'DRAFT',
        fmtDate(sub.createdAt),
        sub.totalScore ?? 0,
        sub.adminRemarks || '',
      ];

      const dynamicRowAnswers: (string | ExcelJS.CellHyperlinkValue)[] = new Array(dynamicCols.length).fill('');

      if (Array.isArray(sub.responses)) {
        for (const resp of sub.responses) {
          const qId = resp.questionId;
          const colKey = `${edId}___${qId}`;
          const targetColIdx = colIndexMap.get(colKey);

          if (targetColIdx === undefined) continue;

          const textParts: string[] = [];
          const filesList: { fileName: string; fullUrl: string; rawUrl: string }[] = [];

          // 1. Process isApplying
          if (resp.isApplying === false) {
            textParts.push('Not Applying');
          }

          // 2. Process fieldResponses
          if (Array.isArray(resp.fieldResponses)) {
            for (const fr of resp.fieldResponses) {
              const isFile = fr.fileUrl || (
                typeof fr.value === 'string' &&
                (fr.value.startsWith('/uploads/') || /\.(pdf|jpg|jpeg|png|doc|docx|xlsx|csv|zip)/i.test(fr.value))
              );

              if (isFile) {
                const rawUrl = fr.fileUrl || (fr.value?.startsWith?.('http') ? fr.value : `/uploads/${fr.value}`);
                const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                const fileName = fr.fileName || (typeof fr.value === 'string' ? fr.value.split('/').pop() : 'Uploaded File');

                filesList.push({ fileName, fullUrl, rawUrl });
              } else {
                const formattedVal = fmtVal(fr.value);
                if (formattedVal) {
                  textParts.push(formattedVal);
                }
              }
            }
          }

          // 3. Process additionalFiles
          if (Array.isArray(resp.additionalFiles)) {
            for (const af of resp.additionalFiles) {
              if (!af.fileUrl) continue;
              const rawUrl = af.fileUrl;
              const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
              const fileName = af.fileName || 'Attachment';

              filesList.push({ fileName, fullUrl, rawUrl });
            }
          }

          // 4. Process supportingDocumentResponses
          if (Array.isArray(resp.supportingDocumentResponses)) {
            for (const sdr of resp.supportingDocumentResponses) {
              if (!Array.isArray(sdr.files)) continue;
              for (const sf of sdr.files) {
                if (!sf.fileUrl) continue;
                const rawUrl = sf.fileUrl;
                const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
                const fileName = sf.fileName || 'Supporting Document';

                filesList.push({ fileName, fullUrl, rawUrl });
              }
            }
          }

          // Add files to Document Index
          for (const f of filesList) {
            documentIndexRows.push({
              appId: subId,
              edition: ed.name ? `${ed.name} (v${ed.version || ''})` : edName,
              applicant: u.name || u.email || '',
              district: u.district || 'Unassigned',
              reformArea: dynamicCols[targetColIdx]?.reformAreaTitle || '',
              actionPoint: dynamicCols[targetColIdx]?.actionPointTitle || '',
              question: dynamicCols[targetColIdx]?.questionTitle || '',
              docName: f.fileName,
              origFileName: f.fileName,
              fileType: f.fileName.split('.').pop()?.toUpperCase() || 'FILE',
              fileSize: '—',
              uploadDate: fmtDate(sub.updatedAt),
              downloadLink: f.fullUrl,
              storageLocation: f.rawUrl.startsWith('http') ? 'Cloud Storage' : 'Local Storage',
            });
          }

          // Construct COMBINED Cell Value for Question (Text + Uploaded Files inside SAME CELL)
          if (textParts.length > 0 || filesList.length > 0) {
            if (filesList.length === 0) {
              dynamicRowAnswers[targetColIdx] = textParts.join(', ');
            } else {
              const textHeader = textParts.length > 0 ? textParts.join(', ') + '\n' : '';
              const filesText = filesList.map(f => `📎 ${f.fileName}`).join('\n');
              const cellDisplayText = textHeader + filesText;
              const primaryUrl = filesList[0].fullUrl;

              dynamicRowAnswers[targetColIdx] = { text: cellDisplayText, hyperlink: primaryUrl };
            }
          }
        }
      }

      // Combine fixed and dynamic question values for application row
      const fullRowValues = [...fixedValues, ...dynamicRowAnswers];
      const row = wsApps.addRow(fullRowValues);
      row.height = 28;

      const bg = rowIdx % 2 === 0 ? ROW_ODD_BG : ROW_EVEN_BG;

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = cellBorder;
        cell.alignment = { vertical: 'middle', wrapText: true };

        // Apply status badge for column 7 (Status)
        if (colNumber === 7) {
          applyStatusBadge(cell, String(cell.value || ''));
        }

        // Apply hyperlink styling if cell contains a hyperlink
        if (cell.value && typeof cell.value === 'object' && 'hyperlink' in cell.value) {
          cell.font = { color: { argb: LINK_COLOR }, underline: true, bold: true };
        }
      });
    });

    if (submissions.length === 0) {
      const emptyRow = wsApps.addRow(['No applications found for the selected filter.']);
      emptyRow.height = 24;
    }

    autoFitColumns(wsApps);

    // ═════════════════════════════════════════════════════════════════════════
    // SHEET 2 — Documents Index (Register of uploaded files for selected filter)
    // ═════════════════════════════════════════════════════════════════════════
    if (documentIndexRows.length > 0) {
      const wsDocs = wb.addWorksheet('Documents Index', {
        pageSetup: { orientation: 'landscape', fitToPage: true }
      });

      const docHeaders = [
        'Application ID',
        'Edition',
        'Applicant',
        'District',
        'Reform Area',
        'Action Point',
        'Question',
        'Document Name',
        'Original File Name',
        'File Type',
        'File Size',
        'Upload Date',
        'Download Link',
        'Storage Location',
      ];

      buildHeaderRow(wsDocs, docHeaders);

      documentIndexRows.forEach((doc, idx) => {
        const row = wsDocs.addRow([
          doc.appId,
          doc.edition,
          doc.applicant,
          doc.district,
          doc.reformArea,
          doc.actionPoint,
          doc.question,
          doc.docName,
          doc.origFileName,
          doc.fileType,
          doc.fileSize,
          doc.uploadDate,
          { text: doc.docName || 'Download File', hyperlink: doc.downloadLink },
          doc.storageLocation,
        ]);
        row.height = 22;

        const bg = idx % 2 === 0 ? ROW_ODD_BG : ROW_EVEN_BG;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.border = cellBorder;
          cell.alignment = { vertical: 'middle', wrapText: true };

          if (colNum === 13 && cell.value && typeof cell.value === 'object' && 'hyperlink' in cell.value) {
            cell.font = { color: { argb: LINK_COLOR }, underline: true, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        });
      });

      autoFitColumns(wsDocs);
    }

    // ── Stream Excel Workbook output to HTTP client ──────────────────────────
    const dateStr = new Date().toISOString().slice(0, 10);
    const downloadFilename = `SRF_Applications_Report_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

    await wb.xlsx.write(res);
    return res.end();

  } catch (err: any) {
    console.error('[Enterprise Applications Report Export Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate Enterprise Applications Report' });
  }
};
