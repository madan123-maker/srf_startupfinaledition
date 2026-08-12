import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { DashboardService } from '../services/dashboard.service';
import { Edition } from '../models/Edition';
import { Submission, SubmissionStatus } from '../models/Submission';
import { AuthRequest } from '../middleware/auth.middleware';

const dashboardService = new DashboardService();

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const { editionId } = req.query;
    const metrics = await dashboardService.getMetrics(editionId as string);
    return res.status(200).json(metrics);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch dashboard metrics' });
  }
};

export const getStorageStats = async (req: Request, res: Response) => {
  try {
    const { StorageService } = await import('../services/storage/StorageService');
    const stats = await StorageService.getStorageStats();
    return res.status(200).json({
      status: 'ok',
      storage: 'cloudflare-r2',
      ...stats,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch storage statistics' });
  }
};

// ─── STYLING CONSTANTS ───────────────────────────────────────────────────────
const DARK_NAVY_BG = '1B3A6B';
const WHITE_FG     = 'FFFFFFFF';
const ROW_ODD_BG   = 'FFFFFFFF';
const ROW_EVEN_BG  = 'F8FAFC';
const BORDER_COLOR = 'CBD5E1';

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
    col.width = Math.min(Math.max(maxLen + 4, 15), 65);
  });
}

function buildHeaderRow(ws: ExcelJS.Worksheet, headers: string[]) {
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const hrow = ws.addRow(headers);
  hrow.height = 30;
  hrow.eachCell((cell) => {
    cell.font      = { bold: true, color: { argb: WHITE_FG }, size: 11 };
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_NAVY_BG } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border    = cellBorder;
  });
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: headers.length },
  };
}

function formatISTDate(d: any): string {
  if (!d) return 'N/A';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return 'N/A';
  return dt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const exportExecutiveSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { editionId } = req.query;
    const editionFilter = editionId && editionId !== 'all' ? (editionId as string) : undefined;

    // 1. Fetch Edition info
    let targetEditionName = 'All SRF Editions';
    let targetEditionVersion = 'All';
    let targetEditionStatus = 'Active';

    if (editionFilter) {
      if (mongoose.Types.ObjectId.isValid(editionFilter)) {
        const foundEdition = await Edition.findById(editionFilter).lean();
        if (foundEdition) {
          targetEditionName = foundEdition.name;
          targetEditionVersion = foundEdition.version || '1.0';
          targetEditionStatus = foundEdition.status || 'Active';
        }
      } else {
        const foundEdition = await Edition.findOne({ name: editionFilter }).lean();
        if (foundEdition) {
          targetEditionName = foundEdition.name;
          targetEditionVersion = foundEdition.version || '1.0';
          targetEditionStatus = foundEdition.status || 'Active';
        }
      }
    }

    // 2. Fetch Live Dashboard Metrics
    const metrics = await dashboardService.getMetrics(editionFilter);
    const { validationMetrics, districtCompliance } = metrics;

    // 3. Fetch Detailed Submissions
    const subMatchStage: any = {};
    if (editionFilter) {
      if (mongoose.Types.ObjectId.isValid(editionFilter)) {
        subMatchStage.editionId = new mongoose.Types.ObjectId(editionFilter);
      } else {
        subMatchStage.editionId = editionFilter;
      }
    }

    const rawSubmissions = await Submission.find(subMatchStage)
      .populate('userId', 'name email state district department organization phone role')
      .populate('editionId', 'name version')
      .sort({ updatedAt: -1 })
      .lean();

    const validSubmissions = rawSubmissions.filter((sub: any) => sub.userId != null);

    // 4. Build Excel Workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SRF Platform Executive Command Center';
    wb.lastModifiedBy = req.user?.email || 'Admin';
    wb.created = new Date();
    wb.modified = new Date();

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 1: EXECUTIVE KPI SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    const wsSummary = wb.addWorksheet('Executive Overview', {
      views: [{ showGridLines: true }]
    });

    // Main Title
    const titleRow = wsSummary.getRow(1);
    titleRow.values = ['SRF EVALUATION PLATFORM — EXECUTIVE COMMAND CENTER SUMMARY'];
    titleRow.font = { bold: true, size: 14, color: { argb: WHITE_FG } };
    titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_NAVY_BG } };
    titleRow.height = 36;
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    wsSummary.mergeCells('A1:E1');

    // Blank row
    wsSummary.addRow([]);

    // Meta details helper
    const addMetaRow = (label: string, value: any) => {
      const r = wsSummary.addRow([label, value]);
      r.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' }, size: 10 };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      r.getCell(2).font = { bold: true, color: { argb: 'FF0F172A' }, size: 10 };
      r.height = 22;
      r.alignment = { vertical: 'middle' };
      r.getCell(1).border = cellBorder;
      r.getCell(2).border = cellBorder;
    };

    addMetaRow('Report Scope / Edition', targetEditionName);
    addMetaRow('Edition Status', targetEditionStatus);
    addMetaRow('Export Date & Time (IST)', formatISTDate(new Date()));
    addMetaRow('Generated By (Admin)', req.user?.email || 'Platform Admin');
    addMetaRow('Total Submissions Tracked', validSubmissions.length);

    wsSummary.addRow([]); // Blank spacer

    // Section Header: Executive KPIs
    const kpiHeaderRow = wsSummary.addRow(['KEY PERFORMANCE INDICATORS (KPIs)', '', '', '']);
    kpiHeaderRow.font = { bold: true, color: { argb: WHITE_FG }, size: 11 };
    kpiHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    kpiHeaderRow.height = 26;
    kpiHeaderRow.alignment = { vertical: 'middle', horizontal: 'left' };
    wsSummary.mergeCells(`A${kpiHeaderRow.number}:D${kpiHeaderRow.number}`);

    // KPI Table Headers
    const kpiTableCols = wsSummary.addRow(['Metric / Metric Category', 'Count / Value', 'Share (%)', 'Operational Status']);
    kpiTableCols.font = { bold: true, color: { argb: 'FF1E293B' }, size: 10 };
    kpiTableCols.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    kpiTableCols.height = 24;
    kpiTableCols.eachCell((c) => { c.border = cellBorder; c.alignment = { vertical: 'middle', horizontal: 'center' }; });
    kpiTableCols.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

    const totalApps = validationMetrics.totalApplications || 0;
    const approvedApps = validationMetrics.approvedApplications || 0;
    const submittedApps = validationMetrics.submittedApplications || 0;
    const draftApps = validationMetrics.draftApplications || 0;
    const rejectedApps = validationMetrics.rejectedApplications || 0;
    const complianceRate = totalApps > 0 ? ((approvedApps / totalApps) * 100).toFixed(1) : '0';

    const kpiRowsData = [
      { label: 'Total Applications (Non-Draft)', val: totalApps, pct: '100%', status: 'Active Evaluation Base', bg: 'FFFFFFFF', fg: 'FF0F172A' },
      { label: 'Approved Applications', val: approvedApps, pct: totalApps > 0 ? `${((approvedApps / totalApps) * 100).toFixed(1)}%` : '0%', status: 'Compliant & Approved', bg: STATUS_FILLS.APPROVED.bg, fg: STATUS_FILLS.APPROVED.fg },
      { label: 'Submitted / Pending Review Applications', val: submittedApps, pct: totalApps > 0 ? `${((submittedApps / totalApps) * 100).toFixed(1)}%` : '0%', status: 'Awaiting Evaluator Action', bg: STATUS_FILLS.PENDING.bg, fg: STATUS_FILLS.PENDING.fg },
      { label: 'Draft Applications', val: draftApps, pct: '-', status: 'In-Progress by Submitter', bg: STATUS_FILLS.DRAFT.bg, fg: STATUS_FILLS.DRAFT.fg },
      { label: 'Rejected Applications', val: rejectedApps, pct: totalApps > 0 ? `${((rejectedApps / totalApps) * 100).toFixed(1)}%` : '0%', status: 'Non-Compliant / Rejected', bg: STATUS_FILLS.REJECTED.bg, fg: STATUS_FILLS.REJECTED.fg },
      { label: 'Overall Compliance Index', val: `${complianceRate}%`, pct: `${complianceRate}%`, status: Number(complianceRate) >= 75 ? 'Optimal' : 'Requires Follow-up', bg: 'FFF0FDF4', fg: 'FF166534' },
    ];

    kpiRowsData.forEach((item) => {
      const r = wsSummary.addRow([item.label, item.val, item.pct, item.status]);
      r.height = 22;
      r.getCell(1).font = { bold: true, color: { argb: 'FF1E293B' }, size: 10 };
      r.getCell(1).border = cellBorder;
      r.getCell(2).font = { bold: true, color: { argb: item.fg }, size: 10 };
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.bg } };
      r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(2).border = cellBorder;
      r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(3).border = cellBorder;
      r.getCell(4).border = cellBorder;
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    });

    autoFitColumns(wsSummary);
    wsSummary.getColumn(1).width = 40;
    wsSummary.getColumn(2).width = 20;
    wsSummary.getColumn(3).width = 18;
    wsSummary.getColumn(4).width = 30;

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 2: DISTRICT COMPLIANCE LEADERBOARD
    // ─────────────────────────────────────────────────────────────────────────
    const wsDistrict = wb.addWorksheet('District Compliance');
    const districtHeaders = [
      'District Name',
      'Compliance Progress (%)',
      'Compliance Rating Tier',
      'Active Submissions',
      'Status Recommendation'
    ];
    buildHeaderRow(wsDistrict, districtHeaders);

    if (districtCompliance && districtCompliance.length > 0) {
      districtCompliance.forEach((item, idx) => {
        const subCount = validSubmissions.filter((s: any) => {
          const dName = s.userId?.district || s.districtName || s.stateName || s.userId?.state || 'General';
          return dName === item.name;
        }).length;
        let tier = 'High Compliance';
        let recommendation = 'Compliant — on track';
        let tierBg = 'D1FAE5';
        let tierFg = '065F46';

        if (item.progress < 50) {
          tier = 'Critical / Action Needed';
          recommendation = 'Expedite pending submissions & evidence upload';
          tierBg = 'FEE2E2';
          tierFg = '991B1B';
        } else if (item.progress < 80) {
          tier = 'Moderate Compliance';
          recommendation = 'Evaluation review in progress';
          tierBg = 'FEF9C3';
          tierFg = '92400E';
        }

        const r = wsDistrict.addRow([
          item.name,
          `${item.progress}%`,
          tier,
          subCount,
          recommendation
        ]);
        r.height = 22;
        const bg = idx % 2 === 0 ? ROW_ODD_BG : ROW_EVEN_BG;

        r.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.border = cellBorder;
          cell.alignment = { vertical: 'middle' };
          if (colNum === 1) {
            cell.font = { bold: true };
          }
          if (colNum === 2 || colNum === 4) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
          if (colNum === 3) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tierBg } };
            cell.font = { bold: true, color: { argb: tierFg } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          }
        });
      });
    } else {
      const emptyRow = wsDistrict.addRow(['No regional/district compliance records available for selected edition.', '', '', '', '']);
      emptyRow.height = 24;
    }
    autoFitColumns(wsDistrict);

    // ─────────────────────────────────────────────────────────────────────────
    // SHEET 3: DETAILED APPLICATIONS REGISTER
    // ─────────────────────────────────────────────────────────────────────────
    const wsApps = wb.addWorksheet('Applications Register');
    const appHeaders = [
      'Application ID',
      'District / State',
      'Nodal Officer / User',
      'User Email',
      'Department / Organization',
      'Edition Name',
      'Evaluation Status',
      'Awarded Score',
      'Submission Date',
      'Last Updated'
    ];
    buildHeaderRow(wsApps, appHeaders);

    if (validSubmissions.length > 0) {
      validSubmissions.forEach((sub: any, idx) => {
        const u = sub.userId || {};
        const ed = sub.editionId || {};
        const stateDisplay = sub.stateName || u.state || u.district || 'N/A';
        const userName = u.name || 'N/A';
        const userEmail = u.email || 'N/A';
        const dept = u.department || u.organization || 'N/A';
        const editionDisplay = ed.name || targetEditionName;
        const status = String(sub.status || 'DRAFT').toUpperCase();
        const score = sub.totalScore !== undefined ? sub.totalScore : 0;
        const subDate = formatISTDate(sub.createdAt);
        const updateDate = formatISTDate(sub.updatedAt);

        const r = wsApps.addRow([
          String(sub._id || ''),
          stateDisplay,
          userName,
          userEmail,
          dept,
          editionDisplay,
          status,
          score,
          subDate,
          updateDate
        ]);
        r.height = 22;
        const bg = idx % 2 === 0 ? ROW_ODD_BG : ROW_EVEN_BG;

        r.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.border = cellBorder;
          cell.alignment = { vertical: 'middle' };
          if (colNum === 1) {
            cell.font = { size: 9, color: { argb: 'FF64748B' } };
          }
          if (colNum === 7) {
            // Status column badge styling
            const style = STATUS_FILLS[status] || STATUS_FILLS.PENDING;
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.bg } };
            cell.font = { bold: true, color: { argb: style.fg }, size: 10 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          } else if (colNum === 8) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          }
        });
      });
    } else {
      const emptyRow = wsApps.addRow(['No applications found for the selected edition.', '', '', '', '', '', '', '', '', '']);
      emptyRow.height = 24;
    }
    autoFitColumns(wsApps);

    // 5. Send Response Stream
    const cleanEdition = targetEditionName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `SRF_Executive_Summary_${cleanEdition}_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await wb.xlsx.write(res);
    return res.end();

  } catch (error: any) {
    console.error('[Export Executive Summary Error]:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate Executive Summary' });
  }
};
