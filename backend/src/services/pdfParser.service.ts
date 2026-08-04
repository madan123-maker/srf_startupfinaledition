import pdfParse from 'pdf-parse';

export interface ParsedFormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options?: string[];
}

export interface ParsedQuestion {
  id: string;
  questionNumber: string;
  weightage: number;
  maxScore: number;
  scoringType: string;
  scoringRules: any;
  isEvaluatable: boolean;
  title: string;
  requiredDocuments: string;
  guidelinesRef: string;
  guidelinesPage?: number;
  scoringCriteria: string;
  fields: ParsedFormField[];
}

export interface ParsedActionPoint {
  id: string;
  title: string;
  questions: ParsedQuestion[];
}

export interface ParsedReformArea {
  id: string;
  title: string;
  description: string;
  actionPoints: ParsedActionPoint[];
}

/**
 * Universal PDF text extractor using pdf-parse with fallback handling
 */
async function extractTextFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
  try {
    const data = await pdfParse(buffer);
    return {
      text: data.text || '',
      pageCount: data.numpages || 1,
    };
  } catch (err: any) {
    console.warn('[PDF PARSER WARNING] pdf-parse fallback:', err.message);
    const rawText = buffer.toString('utf-8');
    return { text: rawText, pageCount: 1 };
  }
}

/**
 * Check if a text line is noise/junk (headers, footers, answer choices, upload buttons, decorative text)
 */
function isJunkOrNoiseLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2) return true;

  const lower = trimmed.toLowerCase();

  // 1. Answer choices & options
  const answerChoices = [
    'yes',
    'no',
    'yes / no',
    'yes/no',
    'applicable',
    'not applicable',
    'tick yes',
    'tick no',
    'score',
    'for',
    'category a',
    'category b',
    'absolute scoring',
    'relative scoring',
    'document weightage: 100%',
    'document weightage:',
    '100%',
  ];
  if (answerChoices.includes(lower)) return true;

  // 2. Exact match noise phrases
  if (/^(?:yes|no)\s*=\s*\d+/i.test(trimmed)) return true;
  if (/^>\s*\d+\s*(?:startups|departments|incubators|initiatives|connects)\s*=\s*[\d\.]+/i.test(trimmed)) return true;
  if (/^\d+-\d+\s*(?:startups|departments|incubators|initiatives|connects)\s*=\s*[\d\.]+/i.test(trimmed)) return true;
  if (/^metric\s*\d+\.\d+/i.test(trimmed)) return true;
  if (/^max\s*score\s*[-–:]?\s*\d+/i.test(trimmed)) return true;
  if (/^total\s*score\s*for\s*this\s*action\s*point\s*=\s*\d+/i.test(trimmed)) return true;

  // 3. System UI instructions & prompts
  const uiPrompts = [
    'upload pdf',
    'upload document',
    'choose file',
    'select file',
    'click here',
    'view document',
    'download pdf',
  ];
  if (uiPrompts.includes(lower)) return true;

  // 4. Document headers, footers & branding metadata
  if (
    lower.includes('government of india') ||
    lower.includes('ministry of commerce') ||
    lower.includes('department for promotion of industry') ||
    lower.includes('dpiit') ||
    lower.includes('#startupindia') ||
    lower.includes('census 2011') ||
    lower.includes('states’ startup ranking framework') ||
    lower.includes('states startup ranking framework')
  ) {
    return true;
  }

  // 5. Bare page numbers or table section headers
  if (/^(?:page|pg)\.?\s*\d+\s*(?:of\s*\d+)?$/i.test(trimmed)) return true;
  if (/^\d+\s*of\s*\d+$/i.test(trimmed)) return true;

  const sectionHeaders = [
    'questions',
    'scoring criteria',
    'scoring metric',
    'supporting documents',
    'guidelines',
    'mandatory:',
    'recommended:',
    'summary',
    'vision',
    'general principles',
    'scoring details',
    'feedback mechanism',
    'details & abbreviations',
  ];
  if (sectionHeaders.includes(lower)) return true;

  return false;
}

/**
 * Check if a text line is a genuine evaluation question prompt
 */
function isGenuineQuestionLine(line: string): boolean {
  const trimmed = line.trim();
  if (isJunkOrNoiseLine(trimmed)) return false;

  // Pattern A: Numbered question prefix like "1.1", "1.2", "2.1", "Q1.1", "Question 1.1"
  if (/^(?:Question|Q)?\s*\d+\.\d+(?:\.[a-z\d]+)?[\s\:\-\.]/i.test(trimmed)) {
    return true;
  }

  // Pattern B: Question sentence starting with interrogative or prompt verbs
  if (/^(?:Does|Has|Is|Are|How many|Provide|Details of|What is|Have there|List of|Number of)\b/i.test(trimmed)) {
    // Exclude simple options like "Details of support provided under each scheme" if it's bullet list
    if (trimmed.endsWith('?') || /^(?:Does|Has|Is|Are|How many|Have there)/i.test(trimmed)) {
      return true;
    }
  }

  return false;
}

/**
 * Parse an SRF Framework PDF buffer and return structured Reform Areas, Action Points & Questions
 */
export async function parseSrfPdfBuffer(buffer: Buffer): Promise<ParsedReformArea[]> {
  const { text: rawText } = await extractTextFromPdf(buffer);

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const areas: ParsedReformArea[] = [];
  let currentArea: ParsedReformArea | null = null;
  let currentActionPoint: ParsedActionPoint | null = null;
  let currentQuestion: ParsedQuestion | null = null;

  let areaCounter = 0;
  let apCounter = 0;
  let qCounter = 0;
  let currentPage = 1;

  const ensureArea = (title?: string): ParsedReformArea => {
    if (!currentArea) {
      areaCounter++;
      currentArea = {
        id: `ra_${Date.now()}_${areaCounter}`,
        title: title || `Reform Area ${areaCounter}: General Reforms`,
        description: '',
        actionPoints: [],
      };
      areas.push(currentArea);
      currentActionPoint = null;
      currentQuestion = null;
    }
    return currentArea;
  };

  const ensureActionPoint = (title?: string): ParsedActionPoint => {
    const area = ensureArea();
    if (!currentActionPoint) {
      apCounter++;
      currentActionPoint = {
        id: `ap_${Date.now()}_${apCounter}`,
        title: title || `Action Point ${apCounter}: Framework Action Point`,
        questions: [],
      };
      area.actionPoints.push(currentActionPoint);
      currentQuestion = null;
    }
    return currentActionPoint;
  };

  let inGuidelinesSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Page marker tracking
    const pageMatch = line.match(/^(?:Page|\f)\s*(\d+)/i) || line.match(/\b(?:Page|Pg)\.?\s*(\d+)\b/i);
    if (pageMatch) {
      const parsedPg = parseInt(pageMatch[1], 10);
      if (!isNaN(parsedPg) && parsedPg > 0 && parsedPg < 500) {
        currentPage = parsedPg;
      }
    }

    // 1. REFORM AREA DETECTION
    // Examples: "Reform Area 1: Institutional Support", "Reform Area 2: Infrastructure Support"
    const raMatch = line.match(/^(?:Reform\s+Area|RA)\s*(\d+)[\:\s\-]*(.*)$/i);
    if (raMatch) {
      inGuidelinesSection = false;
      areaCounter++;
      const raNum = raMatch[1];
      const raTitle = raMatch[2] ? raMatch[2].trim() : `Reform Area ${raNum}`;
      currentArea = {
        id: `ra_${Date.now()}_${areaCounter}`,
        title: `Reform Area ${raNum}${raTitle ? `: ${raTitle}` : ''}`,
        description: '',
        actionPoints: [],
      };
      areas.push(currentArea);
      currentActionPoint = null;
      currentQuestion = null;
      continue;
    }

    // 2. ACTION POINT DETECTION
    // Examples: "Action Point 1: Support Provided...", "1. Support Provided to Startups by State/UT Department(s)", "2. For development..."
    const apMatch =
      line.match(/^(?:Action\s+Point|AP)\s*(\d+(?:\.\d+)?)[\:\s\-]*(.*)$/i) ||
      line.match(/^(\d{1,2})\.\s+([A-Z][A-Za-z0-9\s\/\(\)\,\-\&]{8,120})$/);

    if (apMatch && !isJunkOrNoiseLine(line)) {
      const apNum = apMatch[1];
      const apTitleCandidate = apMatch[2] ? apMatch[2].trim() : line;

      // Ensure it is not a question or guideline bullet (e.g. 1.1 Does your state... or Recommended 1. Details...)
      if (!/^\d+\.\d+/.test(apNum) && !isGenuineQuestionLine(line) && !/^(?:Recommended|Mandatory|Details|G\.O\.|Policy)/i.test(apTitleCandidate)) {
        inGuidelinesSection = false;
        const area = ensureArea();
        apCounter++;
        currentActionPoint = {
          id: `ap_${Date.now()}_${apCounter}`,
          title: `Action Point ${apNum}: ${apTitleCandidate}`,
          questions: [],
        };
        area.actionPoints.push(currentActionPoint);
        currentQuestion = null;
        continue;
      }
    }

    // Check for Guidelines section boundary
    if (/^(?:Guidelines?|Recommended:|Mandatory:|Supporting\s+Documents?|Scoring\s+Criteria)/i.test(line)) {
      inGuidelinesSection = true;
    }

    // 3. GENUINE QUESTION DETECTION
    // Examples: "1.1 Does your State/UT have an active Startup Policy?", "Q2.1 How many Priority Sectors..."
    if (isGenuineQuestionLine(line)) {
      const qNumMatch = line.match(/^(?:Question|Q)?\s*(\d+\.\d+(?:\.[a-z\d]+)?)/i);
      qCounter++;
      const qNum = qNumMatch ? qNumMatch[1] : `${apCounter || 1}.${qCounter}`;

      // Clean title text removing prefix
      let qTitle = line
        .replace(/^(?:Question|Q)?\s*\d+\.\d+(?:\.[a-z\d]+)?[\:\s\-\.]*/i, '')
        .trim() || line;

      // Ignore title if it is a bare answer option like "Yes / No" or "Yes"
      if (/^(?:yes\s*\/\s*no|yes|no|applicable)$/i.test(qTitle)) {
        if (currentQuestion) {
          currentQuestion.scoringCriteria = qTitle;
        }
        continue;
      }

      const ap = ensureActionPoint();

      // Search if a question with this exact questionNumber already exists anywhere in this Action Point or Area
      let existingQ: ParsedQuestion | undefined;
      for (const ra of areas) {
        for (const actPt of ra.actionPoints) {
          const found = actPt.questions.find((eq) => eq.questionNumber === qNum);
          if (found) {
            existingQ = found;
            break;
          }
        }
        if (existingQ) break;
      }

      if (existingQ) {
        // Enrich existing question title and update current pointer to merge metadata
        if (qTitle && (qTitle.length > existingQ.title.length || existingQ.title.length < 10)) {
          existingQ.title = qTitle;
        }
        if (currentPage > 1) {
          existingQ.guidelinesPage = currentPage;
          existingQ.guidelinesRef = `SRF Guidelines Page ${currentPage}`;
        }
        currentQuestion = existingQ;
        continue;
      }

      currentQuestion = {
        id: `q_${Date.now()}_${qCounter}`,
        questionNumber: qNum,
        weightage: 5,
        maxScore: 5,
        scoringType: 'DIRECT',
        scoringRules: {},
        isEvaluatable: true,
        title: qTitle,
        requiredDocuments: 'Upload supporting official documentation (PDF)',
        guidelinesRef: `SRF Guidelines Page ${currentPage}`,
        guidelinesPage: currentPage,
        scoringCriteria: 'Yes = Full Marks, No = 0 Marks',
        fields: [
          {
            id: `f_${Date.now()}_${qCounter}_1`,
            type: 'PDF Upload',
            label: 'Upload Supporting Document (PDF)',
            required: true,
          },
          {
            id: `f_${Date.now()}_${qCounter}_2`,
            type: 'Textarea',
            label: 'Response Remarks & Details',
            required: false,
          },
        ],
      };

      ap.questions.push(currentQuestion);
      continue;
    }

    // 4. METADATA ATTACHMENT TO PARENT QUESTION
    if (currentQuestion) {
      // Score / Weightage
      const weightMatch = line.match(/(?:Weightage|Marks|Total\s*Score|Max\s*Score)[\:\s=]+(\d+)/i);
      if (weightMatch) {
        const val = parseInt(weightMatch[1], 10);
        if (!isNaN(val) && val > 0 && val <= 100) {
          currentQuestion.weightage = val;
          currentQuestion.maxScore = val;
        }
      }

      // Required Evidence / Documents
      const docMatch = line.match(/(?:Required\s+Evidence|Supporting\s+Documents?|Document\s+Submission)[\:\s]+(.+)/i);
      if (docMatch && !isJunkOrNoiseLine(docMatch[1])) {
        currentQuestion.requiredDocuments = docMatch[1].trim();
      }

      // Guidelines Reference
      const guideMatch = line.match(/(?:Guidelines?|Page\s+Reference)[\:\s]+(.+)/i);
      if (guideMatch && !isJunkOrNoiseLine(guideMatch[1])) {
        currentQuestion.guidelinesRef = guideMatch[1].trim();
      }

      // Scoring Criteria
      const scoringMatch = line.match(/(?:Scoring\s+Criteria|Scoring\s+Metric)[\:\s]+(.+)/i);
      if (scoringMatch && !isJunkOrNoiseLine(scoringMatch[1])) {
        currentQuestion.scoringCriteria = scoringMatch[1].trim();
      }
    }
  }

  // Cleanup: Filter out any action points with 0 questions or reform areas with 0 action points
  const cleanAreas = areas
    .map((area) => ({
      ...area,
      actionPoints: area.actionPoints.filter((ap) => ap.questions.length > 0),
    }))
    .filter((area) => area.actionPoints.length > 0);

  return cleanAreas;
}
