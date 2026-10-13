import multer from 'multer';
import { callChatModel } from './agreementAi.js';
import { buildInteractionsEndpoint, interactionsOutputText } from './aiInteractions.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AGREEMENT_CHARS = 16000;
const MAX_HISTORY_ITEMS = 8;
const DISCLAIMER =
  'This is informational guidance, not a legal determination. Check the full agreement and local law; consult a qualified professional if responsibility is disputed.';

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(null, true);
    }
    callback(new Error('Upload a JPEG, PNG, or WebP image.'));
  },
});

function imageTypeFromSignature(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function extractAgreementContext(pages) {
  if (!Array.isArray(pages)) return '';
  return pages.slice(0, 30).map((page, index) => {
    const pageNum = Number.isInteger(Number(page?.num)) ? Number(page.num) : index + 1;
    const section = typeof page?.section === 'string' ? page.section.slice(0, 120) : `Page ${pageNum}`;
    const text = typeof page?.text === 'string' ? page.text.slice(0, 5000) : '';
    return `--- Page ${pageNum} (${section}) ---\n${text}`;
  }).join('\n\n').slice(0, MAX_AGREEMENT_CHARS);
}

function validateLocation(value) {
  const location = String(value || '').trim();
  return location.length >= 2 && location.length <= 100 ? location : null;
}

function parseJsonObject(content) {
  const text = String(content || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The analysis service returned a response that was not valid JSON.');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error('The analysis service returned malformed data.');
  }
}

function redactedErrorMessage(error, apiKey) {
  return String(error?.message || error || 'Unknown analysis error')
    .replaceAll(apiKey, '[redacted]')
    .slice(0, 1000);
}

export async function callVisionModel({ apiUrl, apiKey, model, imageData, mimeType, prompt }) {
  const request = {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { type: 'text', text: prompt },
        { type: 'image', data: imageData, mime_type: mimeType },
      ],
      store: false,
    }),
  };

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(buildInteractionsEndpoint(apiUrl), request);
    if (attempt === 0 && [429, 502, 503, 504].includes(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      continue;
    }
    break;
  }

  const responseText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const message = typeof parsed?.error?.message === 'string'
      ? parsed.error.message.slice(0, 1000)
      : `Analysis request failed with HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const content = interactionsOutputText(parsed);
  if (!content?.trim()) {
    const responseStatus = typeof parsed?.status === 'string' ? ` (status: ${parsed.status})` : '';
    const error = new Error(`The analysis service returned no text output${responseStatus}. Try again with a clear photo.`);
    error.status = 502;
    throw error;
  }
  const result = parseJsonObject(content);
  if (
    !result ||
    typeof result !== 'object' ||
    typeof result.needsMoreInfo !== 'boolean' ||
    !['low', 'moderate', 'high', 'urgent', 'unclear'].includes(result.severity) ||
    !Array.isArray(result.visibleDamage)
  ) {
    throw new Error('The analysis service response is missing required damage-assessment details.');
  }
  return result;
}

export function buildMaintenanceAnalysisPrompt({ location, agreementText }) {
  return `You are a cautious property maintenance assistant. This is informational photo triage, not an on-site inspection, contractor quote, or legal advice.
Do not identify or name the underlying AI service or model.
Property location supplied by the user: "${location}". Provide every cost in Indian Rupees (INR) and use realistic local repair-cost estimates only as clearly labelled approximations. Never return USD.
Inspect only evidence visible in the photo. Identify the likely issue and list the exact visible evidence. Explain possible cause separately and explicitly state uncertainty; do not claim hidden damage or a cause as fact.
If the photo is blurry, too distant, obstructed, or does not clearly show an issue, set needsMoreInfo=true, severity="unclear", list specific additional information/photos needed, and leave every cost number null.
Describe repair versus replacement and possible parts/materials, and whether a qualified technician is needed. Highlight immediate safety concerns, especially active water near electricity or structural danger.
No verified local supplier or contractor pricing data is connected. You may provide only a broad clearly labelled approximate parts/labour planning range when reasonably supportable. These are not verified local prices or contractor quotations. Otherwise leave numbers null.
Assess repair responsibility only from the agreement excerpt below. Do not assume tenant or landlord fault. If missing or ambiguous, use unclear/not_mentioned and explain this; citations must be verbatim with page/section.

Return JSON only:
{
  "issue":"short likely issue",
  "visibleDamage":["observable photo evidence"],
  "likelyCause":"possible cause stated cautiously",
  "causeUncertainty":"what cannot be concluded from the photo",
  "severity":"low|moderate|high|urgent|unclear",
  "confidence":"high|medium|low",
  "needsMoreInfo":false,
  "clarificationQuestions":["specific detail or additional photo needed"],
  "immediateSafety":"safe next step",
  "repairAssessment":"repair/replacement reasoning and limitations",
  "repairOrReplace":"repair|replace|inspect_first|unclear",
  "partsMaterials":["possible part or material"],
  "professionalRequired":true,
  "professionalType":"trade to contact",
  "costEstimate":{"currency":"INR","partsLow":null,"partsHigh":null,"laborLow":null,"laborHigh":null,"totalLow":null,"totalHigh":null,"basis":"approximate only; no verified local pricing data"},
  "agreementAssessment":{"responsibility":"tenant|landlord|shared|unclear|not_mentioned","explanation":"what the supplied text states without legal conclusion","citations":[{"originalText":"verbatim excerpt","page":1,"section":"section"}]}
}
If no agreement text is supplied, set responsibility="not_mentioned", say no agreement was supplied, and provide no citations.

AGREEMENT EXCERPTS:
${agreementText || '[No agreement uploaded]'}
`;
}

export function normalizeMaintenanceAnalysis(result, location) {
  const severityValues = new Set(['low', 'moderate', 'high', 'urgent', 'unclear']);
  const responsibilityValues = new Set(['tenant', 'landlord', 'shared', 'unclear', 'not_mentioned']);
  const severity = severityValues.has(result.severity) ? result.severity : 'unclear';
  const needsMoreInfo = Boolean(result.needsMoreInfo) || severity === 'unclear';
  const rawCost = result.costEstimate && typeof result.costEstimate === 'object' ? result.costEstimate : {};
  const asAmount = (value) =>
    value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
      ? Math.round(Number(value))
      : null;
  const agreement = result.agreementAssessment && typeof result.agreementAssessment === 'object'
    ? result.agreementAssessment
    : {};
  const citations = Array.isArray(agreement.citations)
    ? agreement.citations.slice(0, 3)
        .filter((item) => item && typeof item.originalText === 'string')
        .map((item) => ({
          originalText: item.originalText.slice(0, 700),
          page: Number.isInteger(Number(item.page)) ? Number(item.page) : null,
          section: typeof item.section === 'string' ? item.section.slice(0, 120) : null,
        }))
    : [];
  const responsibility = responsibilityValues.has(agreement.responsibility) ? agreement.responsibility : 'unclear';
  const currency = 'INR';

  return {
    realAi: true,
    engine: 'photo-analysis',
    location,
    issue: needsMoreInfo ? '' : String(result.issue || '').slice(0, 240),
    visibleDamage: Array.isArray(result.visibleDamage)
      ? result.visibleDamage.filter((item) => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 240))
      : [],
    likelyCause: String(result.likelyCause || 'The photo alone is not enough to determine the cause.').slice(0, 600),
    causeUncertainty: String(result.causeUncertainty || 'Cause is uncertain based on visual evidence alone.').slice(0, 600),
    severity,
    confidence: ['high', 'medium', 'low'].includes(result.confidence) ? result.confidence : 'low',
    needsMoreInfo,
    clarificationQuestions: Array.isArray(result.clarificationQuestions)
      ? result.clarificationQuestions.filter((item) => typeof item === 'string').slice(0, 4).map((item) => item.slice(0, 240))
      : [],
    immediateSafety: String(result.immediateSafety || '').slice(0, 800),
    repairAssessment: String(result.repairAssessment || '').slice(0, 1200),
    repairOrReplace: ['repair', 'replace', 'inspect_first', 'unclear'].includes(result.repairOrReplace)
      ? result.repairOrReplace
      : 'inspect_first',
    partsMaterials: Array.isArray(result.partsMaterials)
      ? result.partsMaterials.filter((item) => typeof item === 'string').slice(0, 8).map((item) => item.slice(0, 180))
      : [],
    professionalRequired: Boolean(result.professionalRequired),
    professionalType: typeof result.professionalType === 'string' ? result.professionalType.slice(0, 160) : '',
    costEstimate: {
      currency,
      partsLow: needsMoreInfo ? null : asAmount(rawCost.partsLow),
      partsHigh: needsMoreInfo ? null : asAmount(rawCost.partsHigh),
      laborLow: needsMoreInfo ? null : asAmount(rawCost.laborLow),
      laborHigh: needsMoreInfo ? null : asAmount(rawCost.laborHigh),
      totalLow: needsMoreInfo ? null : asAmount(rawCost.totalLow),
      totalHigh: needsMoreInfo ? null : asAmount(rawCost.totalHigh),
      basis: 'AI-generated approximate planning range only. No verified local pricing data is connected; this is not a contractor quote.',
    },
    agreementAssessment: {
      responsibility,
      explanation: String(agreement.explanation || 'The agreement text does not clearly establish repair responsibility.').slice(0, 1200),
      citations,
    },
    disclaimer: `${DISCLAIMER} Cost ranges are approximations, not verified local prices or quotes.`,
  };
}

export function registerMaintenanceAiRoutes(app, { ai, visionModel }) {
  app.get('/api/maintenance-ai/status', (req, res) => {
    const visionConfigured = Boolean(ai.visionApiKey && visionModel);
    res.json({
      visionConfigured,
      textAiConfigured: Boolean(ai.apiKey),
      note: visionConfigured
        ? 'Photo analysis is ready. Cost ranges are indicative estimates only; no verified local pricing feed is configured.'
        : 'Photo analysis setup is required. Add the vision service credentials to server/.env and restart the backend.',
    });
  });

  app.post('/api/maintenance-ai/analyze', (req, res, next) => {
    imageUpload.single('photo')(req, res, (error) => {
      if (error) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ error: error.message || 'Could not process the uploaded image.' });
      }
      next();
    });
  }, async (req, res) => {
    if (!ai.visionApiKey) {
      return res.status(503).json({ error: 'Photo analysis is not configured. Add the vision service credentials to server/.env and restart the backend.' });
    }
    if (!visionModel) {
      return res.status(503).json({ error: 'Photo analysis is not configured with a supported model. Check the backend configuration.' });
    }
    if (!req.file) return res.status(400).json({ error: 'Choose a damage photo to analyze.' });

    const mimeType = imageTypeFromSignature(req.file.buffer);
    if (!mimeType || mimeType !== req.file.mimetype) {
      return res.status(400).json({ error: 'The uploaded file is not a valid JPEG, PNG, or WebP image.' });
    }
    const location = validateLocation(req.body?.location);
    if (!location) return res.status(400).json({ error: 'Enter the property city or PIN/postal code for an estimate.' });

    let agreementPages = [];
    if (typeof req.body?.agreementPages === 'string') {
      try {
        agreementPages = JSON.parse(req.body.agreementPages);
      } catch {
        return res.status(400).json({ error: 'Agreement context must be valid JSON.' });
      }
      if (!Array.isArray(agreementPages)) {
        return res.status(400).json({ error: 'Agreement context must be a pages array.' });
      }
    }

    try {
      const result = await callVisionModel({
        apiUrl: ai.visionApiUrl,
        apiKey: ai.visionApiKey,
        model: visionModel,
        imageData: req.file.buffer.toString('base64'),
        mimeType,
        prompt: buildMaintenanceAnalysisPrompt({
          location,
          agreementText: extractAgreementContext(agreementPages),
        }),
      });
      res.json(normalizeMaintenanceAnalysis(result, location));
    } catch (error) {
      const detail = redactedErrorMessage(error, ai.visionApiKey);
      console.error('Photo analysis request failed:', { status: error.status || 502, detail });
      const status = error.status || 502;
      res.status(error.status || 502).json({
        error: status === 401 || status === 403
          ? 'Photo analysis credentials were rejected. Check the backend configuration.'
          : status === 429
            ? 'Photo analysis is temporarily rate limited. Wait a minute and try again.'
            : status === 503
              ? 'Photo analysis is temporarily unavailable. Please try again in a minute.'
              : status === 404
                ? 'The configured photo-analysis model or endpoint was not found. Check the backend configuration.'
            : `Photo analysis failed (HTTP ${status}). Check the backend logs for details, then try again.`,
      });
    }
  });

  app.post('/api/maintenance-ai/chat', async (req, res) => {
    if (!ai.apiKey) return res.status(503).json({ error: 'Text AI is not configured on the server.' });
    const { question, analysis, agreementPages, history } = req.body || {};
    if (typeof question !== 'string' || !question.trim() || question.length > 2000) {
      return res.status(400).json({ error: 'Enter a question up to 2,000 characters.' });
    }
    if (!analysis || typeof analysis !== 'object') {
      return res.status(400).json({ error: 'Analyze a damage photo first to start a contextual conversation.' });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-MAX_HISTORY_ITEMS).map((item) => ({
          role: item?.role === 'assistant' ? 'assistant' : 'user',
          content: String(item?.content || '').slice(0, 1200),
        }))
      : [];
    const prompt = `You are RentFlow's property maintenance assistant. Use the damage photo analysis and supplied agreement excerpts to answer. Preserve uncertainty; do not infer hidden damage or claim a contractor quote. Cost figures are indicative only and not verified local prices. Express every new cost in INR (₹) with Indian number grouping; preserve agreement citations verbatim. For legal responsibility quote supplied lease text and say unclear if the text does not establish it. Recommend qualified inspection for safety-critical repairs. This is not legal advice. Do not identify or name the underlying AI service or model.

DAMAGE ANALYSIS:
${JSON.stringify(analysis).slice(0, 7000)}

AGREEMENT EXCERPTS:
${extractAgreementContext(agreementPages) || '[No agreement provided]'}

RECENT CONVERSATION:
${safeHistory.map((turn) => `${turn.role}: ${turn.content}`).join('\n')}

QUESTION: ${question.trim()}

Return JSON only: {"answer":"concise helpful answer","citations":[{"originalText":"verbatim supplied clause","page":1,"section":"section"}]}. Cite only clauses that appear in the agreement excerpts.`;

    try {
      const result = await callChatModel({
        apiUrl: ai.apiUrl,
        apiKey: ai.apiKey,
        model: ai.model,
        prompt,
        maxTokens: 1000,
      });
      res.json({
        answer: String(result.answer || 'I could not find enough information to answer that confidently.'),
        citations: Array.isArray(result.citations) ? result.citations.slice(0, 3) : [],
        realAi: true,
        engine: 'text-chat',
        disclaimer: DISCLAIMER,
      });
    } catch (error) {
      console.error('Maintenance follow-up chat failed:', {
        status: error.status || 502,
        detail: redactedErrorMessage(error, ai.apiKey),
      });
      res.status(error.status || 502).json({ error: 'The Rental Assistant could not answer that follow-up. Please try again.' });
    }
  });
}
