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
 * Universal PDF text extractor supporting v1, v2 class constructors, and ES module defaults
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfLib = require('pdf-parse');

  // Case 1: Standard pdf-parse function export
  if (typeof pdfLib === 'function') {
    const res = await pdfLib(buffer);
    return res.text || '';
  }

  // Case 2: pdf-parse Class export (PDFParse)
  if (pdfLib.PDFParse) {
    try {
      const uint8Arr = new Uint8Array(buffer);
      const parser = new pdfLib.PDFParse(uint8Arr);
      if (typeof parser.getText === 'function') {
        const res = await parser.getText();
        if (typeof res === 'string') return res;
        if (res && res.text) return res.text;
        if (res && Array.isArray(res.pages)) {
          return res.pages.map((p: any) => p.text || (typeof p === 'string' ? p : '')).join('\n');
        }
      }
    } catch (err: any) {
      console.warn('PDFParse class extraction warning:', err.message);
    }
  }

  // Case 3: Default export function
  if (pdfLib.default && typeof pdfLib.default === 'function') {
    const res = await pdfLib.default(buffer);
    return res.text || '';
  }

  // Case 4: Raw text conversion fallback
  return buffer.toString('utf-8');
}

/**
 * Parse an SRF Framework PDF buffer and return structured Reform Areas, Action Points & Questions
 */
export async function parseSrfPdfBuffer(buffer: Buffer): Promise<ParsedReformArea[]> {
  const rawText: string = await extractTextFromPdf(buffer);

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

  const ensureArea = (title?: string): ParsedReformArea => {
    if (!currentArea) {
      areaCounter++;
      currentArea = {
        id: `ra_${Date.now()}_${areaCounter}`,
        title: title || `Reform Area ${areaCounter}`,
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
        title: title || `Action Point ${apCounter}`,
        questions: [],
      };
      area.actionPoints.push(currentActionPoint);
      currentQuestion = null;
    }
    return currentActionPoint;
  };

  let currentPage = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Page Number Marker Detection (e.g. "Page 12" or "Pg. 12")
    const pageMatch = line.match(/^(?:Page|\f)\s*(\d+)/i) || line.match(/\b(?:Page|Pg)\.?\s*(\d+)\b/i);
    if (pageMatch) {
      const parsedPg = parseInt(pageMatch[1], 10);
      if (!isNaN(parsedPg) && parsedPg > 0 && parsedPg < 500) {
        currentPage = parsedPg;
      }
    }

    // Check 1: Reform Area Pattern (e.g. "Reform Area 1: Institutional Support" or "REFORM AREA 2")
    const raMatch = line.match(/^(?:Reform\s+Area|RA)\s*(\d+)[\:\s\-]*(.*)$/i);
    if (raMatch) {
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

    // Check 2: Action Point Pattern (e.g. "Action Point 1.1: Dedicated Portal" or "Action Point 2")
    const apMatch = line.match(/^(?:Action\s+Point|AP)\s*(\d+(?:\.\d+)?)[\:\s\-]*(.*)$/i);
    if (apMatch) {
      const area = ensureArea();
      apCounter++;
      const apNum = apMatch[1];
      const apTitle = apMatch[2] ? apMatch[2].trim() : `Action Point ${apNum}`;
      currentActionPoint = {
        id: `ap_${Date.now()}_${apCounter}`,
        title: `Action Point ${apNum}${apTitle ? `: ${apTitle}` : ''}`,
        questions: [],
      };
      area.actionPoints.push(currentActionPoint);
      currentQuestion = null;
      continue;
    }

    // Check 3: Question Pattern (e.g. "Question 1.1.1: Does the state..." or "1.1.1 Does the state...")
    const qMatch = line.match(/^(?:Question|Q)?\s*(\d+\.\d+(?:\.\d+)?)[\:\s\-]*(.+)$/i);
    if (qMatch) {
      const ap = ensureActionPoint();
      qCounter++;
      const qNum = qMatch[1];
      const qTitle = qMatch[2].trim();

      currentQuestion = {
        id: `q_${Date.now()}_${qCounter}`,
        questionNumber: qNum,
        weightage: 5,
        maxScore: 5,
        scoringType: 'DIRECT',
        scoringRules: {},
        isEvaluatable: true,
        title: qTitle,
        requiredDocuments: 'Upload supporting official documentation / screenshot',
        guidelinesRef: `SRF Guidelines Page ${currentPage}`,
        guidelinesPage: currentPage,
        scoringCriteria: 'Yes: Full Marks, No: 0 Marks',
        fields: [
          {
            id: `f_${Date.now()}_1`,
            type: 'PDF Upload',
            label: 'Upload Supporting Document (PDF)',
            required: true,
          },
          {
            id: `f_${Date.now()}_2`,
            type: 'Textarea',
            label: 'Response Summary & Remarks',
            required: false,
          },
        ],
      };
      ap.questions.push(currentQuestion);
      continue;
    }

    // Check 4: Metadata parsing for current question if present
    if (currentQuestion) {
      const weightMatch = line.match(/(?:Weightage|Marks|Score)[\:\s]+(\d+)/i);
      if (weightMatch) {
        const val = parseInt(weightMatch[1], 10);
        if (!isNaN(val)) {
          currentQuestion.weightage = val;
          currentQuestion.maxScore = val;
        }
      }

      const docMatch = line.match(/(?:Required\s+Documents?|Supporting\s+Docs?|Documents?)[\:\s]+(.+)/i);
      if (docMatch) {
        currentQuestion.requiredDocuments = docMatch[1].trim();
      }

      const guideMatch = line.match(/(?:Guidelines?|Reference)[\:\s]+(.+)/i);
      if (guideMatch) {
        currentQuestion.guidelinesRef = guideMatch[1].trim();
      }

      const scoringMatch = line.match(/(?:Scoring\s+Criteria|Evaluation\s+Criteria)[\:\s]+(.+)/i);
      if (scoringMatch) {
        currentQuestion.scoringCriteria = scoringMatch[1].trim();
      }
    }
  }

  // Fallback: If no areas or questions were extracted due to unusual PDF text formatting,
  // create a default Reform Area with extracted lines as questions.
  if (areas.length === 0 || areas.every((a) => a.actionPoints.length === 0)) {
    const fallbackArea: ParsedReformArea = {
      id: `ra_${Date.now()}_1`,
      title: 'Reform Area 1: Framework Overview',
      description: 'Extracted from uploaded SRF PDF',
      actionPoints: [
        {
          id: `ap_${Date.now()}_1`,
          title: 'Action Point 1.1: General Guidelines & Questions',
          questions: lines
            .filter((l) => l.length > 20 && !l.toLowerCase().includes('page'))
            .slice(0, 10)
            .map((lineText, idx) => ({
              id: `q_${Date.now()}_${idx + 1}`,
              questionNumber: `1.1.${idx + 1}`,
              weightage: 5,
              maxScore: 5,
              scoringType: 'DIRECT',
              scoringRules: {},
              isEvaluatable: true,
              title: lineText,
              requiredDocuments: 'Upload supporting proof (PDF)',
              guidelinesRef: `SRF Guidelines 1.1.${idx + 1}`,
              scoringCriteria: 'Yes: 5 marks, No: 0 marks',
              fields: [
                {
                  id: `f_${Date.now()}_${idx}_1`,
                  type: 'PDF Upload',
                  label: 'Upload Supporting Document',
                  required: true,
                },
                {
                  id: `f_${Date.now()}_${idx}_2`,
                  type: 'Textarea',
                  label: 'Remarks / Explanation',
                  required: false,
                },
              ],
            })),
        },
      ],
    };
    return [fallbackArea];
  }

  return areas;
}
