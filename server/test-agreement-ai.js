import express from 'express';
import { getDemoById, getDemoList } from './data/demoAgreements.js';
import { heuristicAnalyze, answerAgreementQuestion } from './agreementAi.js';
import { registerAgreementRoutes } from './agreementRoutes.js';
import {
  buildMaintenanceAnalysisPrompt,
  normalizeMaintenanceAnalysis,
  registerMaintenanceAiRoutes,
} from './maintenanceAiRoutes.js';
import { buildInteractionsEndpoint } from './aiInteractions.js';

function assert(cond, message) {
  if (!cond) {
    throw new Error(message);
  }
}

const demos = getDemoList();
assert(demos.length === 3, 'expected 3 demo agreements');

const sunrise = getDemoById('sunrise-mumbai-standard');
const campus = getDemoById('campus-view-bengaluru-student');
const lakewood = getDemoById('lakewood-pune-family');
assert(sunrise && campus && lakewood, 'demo ids must resolve');

const sunriseAnalysis = heuristicAnalyze(sunrise.pages, sunrise.title);
assert(/42,000|42000/.test(JSON.stringify(sunriseAnalysis.summary)), 'sunrise rent should be detected');
assert(sunriseAnalysis.clauses.length > 0, 'sunrise should yield clauses');
assert(!JSON.stringify(sunriseAnalysis).match(/gemini|groq|bert|flan-t5|pegasus/i), 'agreement demo output must not expose provider or model names');

const campusAnalysis = heuristicAnalyze(campus.pages, campus.title);
assert(campusAnalysis.overallRisk === 'elevated', 'student PG demo should be elevated risk');

const chat = await answerAgreementQuestion({
  pages: sunrise.pages,
  question: 'What is the notice period?',
  language: 'en',
  ai: {},
});
assert(chat.found, 'notice period should be found in sunrise demo');
assert(/30/.test(chat.answer), 'notice answer should mention 30 days');
assert(chat.realAi === false, 'without API key, chat is heuristic');

const missing = await answerAgreementQuestion({
  pages: sunrise.pages,
  question: 'Does this lease mention a swimming pool membership fee?',
  language: 'en',
  ai: {},
});
assert(/not found/i.test(missing.answer), 'missing facts must be stated clearly');

const damagePrompt = buildMaintenanceAnalysisPrompt({
  location: '411045',
  agreementText: 'Page 4: Tenant pays for negligent damage.',
});
assert(damagePrompt.includes('411045'), 'damage prompt should include the requested property location');
assert(damagePrompt.includes('No verified local supplier or contractor pricing data is connected'), 'damage prompt must disclose missing verified local pricing');
assert(damagePrompt.toLowerCase().includes('do not assume tenant or landlord fault'), 'damage prompt must avoid assigning blame');
assert(damagePrompt.includes('clarificationQuestions'), 'unclear photos should trigger clarification');
assert(buildInteractionsEndpoint('https://generativelanguage.googleapis.com/v1beta/interactions') ===
  'https://generativelanguage.googleapis.com/v1beta/interactions',
'Vision endpoint should target the official Interactions API');
assert(buildInteractionsEndpoint('https://generativelanguage.googleapis.com/v1beta/models') ===
  'https://generativelanguage.googleapis.com/v1beta/interactions',
'Legacy model collection configuration should migrate to the Interactions API');
assert(buildInteractionsEndpoint('https://generativelanguage.googleapis.com/v1beta/models/old-model:generateContent') ===
  'https://generativelanguage.googleapis.com/v1beta/interactions',
'Legacy model-specific configuration should migrate to the Interactions API');

const unclearPhoto = normalizeMaintenanceAnalysis({
  needsMoreInfo: true,
  severity: 'unclear',
  costEstimate: { partsLow: null, partsHigh: null, laborLow: null, laborHigh: null, totalLow: null, totalHigh: null },
}, 'Demo City');
assert(unclearPhoto.needsMoreInfo, 'unclear photo analysis must request more information');
assert(unclearPhoto.costEstimate.totalLow === null, 'unclear photo analysis must not invent a numeric estimate');
assert(unclearPhoto.costEstimate.currency === 'INR', 'photo cost estimates should always use INR');
assert(unclearPhoto.agreementAssessment.responsibility === 'unclear', 'missing agreement responsibility must remain unclear');

const app = express();
app.use(express.json());
registerAgreementRoutes(app, {
  uploadsDir: process.cwd(),
  ai: {
    apiUrl: 'https://api.example.invalid/chat',
    apiKey: 'test-chat-key',
    model: 'private-chat-model',
    translationApiUrl: 'https://generativelanguage.googleapis.com/v1beta/interactions',
    translationApiKey: 'test-gemini-key',
    translationModel: 'gemini-3.5-flash-lite',
  },
});
registerMaintenanceAiRoutes(app, {
  ai: {
    apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKey: 'test-text-key',
    model: 'text-test-model',
    visionApiUrl: 'https://generativelanguage.googleapis.com/v1beta/interactions',
    visionApiKey: 'test-vision-key',
  },
  visionModel: 'gemini-3.8-flash',
});
const server = await new Promise((resolve) => {
  const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
});
const originalFetch = globalThis.fetch;
let visionRequest;
let failVisionRequest = false;
let transientVisionFailure = false;
let visionRequestCount = 0;
let translationRequestCount = 0;
let incompleteTranslation = false;
let translationFailureStatus = 0;
globalThis.fetch = async (input, options = {}) => {
  if (String(input).includes(':generateContent')) {
    translationRequestCount += 1;
    if (translationFailureStatus) {
      return new Response(JSON.stringify({
        error: { message: 'Temporary request limit reached' },
      }), { status: translationFailureStatus, headers: { 'Content-Type': 'application/json' } });
    }
    const request = JSON.parse(options.body);
    assert(options.headers['x-goog-api-key'] === 'test-gemini-key', 'agreement translation must use the backend Gemini API key');
    assert(String(input).includes('/models/gemini-3.5-flash-lite:generateContent'), 'agreement translation must use the configured supported Gemini model');
    assert(request.generationConfig.responseMimeType === 'application/json', 'Gemini should be asked to return structured translation data');
    const prompt = request.contents[0].parts[0].text;
    const sourceText = prompt.match(/<AGREEMENT_TEXT>\n([\s\S]*?)\n<\/AGREEMENT_TEXT>/)?.[1] || '';
    const translatedText = sourceText
      .replace(/Monthly rent/gi, 'मासिक किराया')
      .replace(/per month/gi, 'प्रति माह')
      .replace(/Term/gi, 'अवधि')
      .replace(/months?/gi, 'महीने');
    const language = prompt.match(/\(([a-z]{2})\)/)?.[1];
    const scriptSample = {
      hi: 'क', ta: 'க', te: 'త', bn: 'ক', mr: 'म', gu: 'ક', kn: 'ಕ',
      ml: 'ക', pa: 'ਕ', or: 'କ', ur: 'م', as: 'ক',
    }[language] || '';
    return new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
          text: JSON.stringify({
            translation: `${scriptSample}${translatedText}`,
            ...(incompleteTranslation ? { complete: false } : {}),
          }),
          }],
        },
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (String(input).includes('/interactions')) {
    visionRequest = { url: String(input), headers: options.headers, body: JSON.parse(options.body) };
    visionRequestCount += 1;
    if (transientVisionFailure) {
      transientVisionFailure = false;
      return new Response(JSON.stringify({
        error: { message: 'Temporary service overload' },
      }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
    if (failVisionRequest) {
      return new Response(JSON.stringify({
        error: { message: 'Gemini model rejected key test-vision-key' },
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      steps: [{
        type: 'thought',
        signature: 'omitted-in-test',
      }, {
        type: 'model_output',
        content: [{
          type: 'text',
          text: JSON.stringify({
              issue: 'Possible cracked toilet seat',
              visibleDamage: ['A visible split along the seat rim'],
              likelyCause: 'Possible stress or impact; the image cannot confirm the cause.',
              causeUncertainty: 'No evidence establishes when or how the crack occurred.',
              severity: 'moderate',
              confidence: 'medium',
              needsMoreInfo: false,
              clarificationQuestions: [],
              immediateSafety: 'Avoid sitting on the cracked seat.',
              repairAssessment: 'Replacement may be appropriate after checking the hinge fitting.',
              repairOrReplace: 'replace',
              partsMaterials: ['Compatible toilet seat', 'Replacement hinge kit if needed'],
              professionalRequired: false,
              professionalType: 'Plumber if the toilet fixture itself is damaged',
              costEstimate: { currency: 'USD', partsLow: 500, partsHigh: 2500, laborLow: 0, laborHigh: 800, totalLow: 500, totalHigh: 3300 },
              agreementAssessment: { responsibility: 'not_mentioned', explanation: 'No agreement was supplied.', citations: [] },
          }),
        }],
      }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return originalFetch(input, options);
};

try {
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const statusResponse = await originalFetch(`${baseUrl}/api/maintenance-ai/status`);
  const status = await statusResponse.json();
  assert(status.visionConfigured, 'status should report the photo analysis as configured');
  assert(!JSON.stringify(status).match(/gemini|google|model|provider/i), 'photo status must not expose provider or model details');

  const agreementStatusResponse = await originalFetch(`${baseUrl}/api/agreements/status`);
  const agreementStatus = await agreementStatusResponse.json();
  assert(agreementStatus.aiConfigured, 'agreement status should preserve its configured state');
  assert(!JSON.stringify(agreementStatus).match(/groq|private-chat-model|provider|model/i), 'agreement status must not expose provider or model details');

  const translationResponse = await originalFetch(`${baseUrl}/api/agreements/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetLanguage: 'hi',
      pages: [{ num: 1, section: 'Money and duration', text: '1. Monthly rent: ₹25,000 per month. Term: 12 months.' }],
    }),
  });
  const translation = await translationResponse.json();
  assert(translationResponse.status === 200, `agreement translation should succeed, got ${translationResponse.status}`);
  assert(translation.realAi === true, 'translation result should be clearly marked as AI-generated');
  assert(translation.pages[0].text.includes('मासिक किराया'), 'translation endpoint should return translated text');
  assert(translation.pages[0].text.includes('₹25,000') && translation.pages[0].text.includes('12'), 'translation should preserve numeric values');
  assert(translationRequestCount === 1, 'translation should use the configured Gemini Interactions API');

  const longAgreement = `Section 1. ${'Rental clause text. '.repeat(320)}Rent 25000.`;
  const requestsBeforeLongTranslation = translationRequestCount;
  const longTranslationResponse = await originalFetch(`${baseUrl}/api/agreements/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetLanguage: 'ta',
      pages: [{ num: 1, section: 'Long section', text: longAgreement }],
    }),
  });
  assert(longTranslationResponse.status === 200, 'long agreements should translate in manageable chunks');
  assert(translationRequestCount > requestsBeforeLongTranslation + 1, 'long agreements should be sent to the text model in multiple ordered sections');

  incompleteTranslation = true;
  const incompleteResponse = await originalFetch(`${baseUrl}/api/agreements/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetLanguage: 'bn',
      pages: [{ num: 1, text: 'Monthly rent is 25000.' }],
    }),
  });
  const incompleteResult = await incompleteResponse.json();
  incompleteTranslation = false;
  assert(incompleteResponse.status === 502, 'incomplete translations must return an error');
  assert(/incomplete/i.test(incompleteResult.error), 'incomplete translation error should be explicit');

  translationFailureStatus = 429;
  const limitedResponse = await originalFetch(`${baseUrl}/api/agreements/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetLanguage: 'hi',
      pages: [{ num: 1, text: 'Monthly rent is 25000.' }],
    }),
  });
  const limitedResult = await limitedResponse.json();
  translationFailureStatus = 0;
  assert(limitedResponse.status === 429, 'upstream request limits should be surfaced as a retryable response');
  assert(/temporarily busy/i.test(limitedResult.error), 'request-limit error should tell users to retry later');

  const unsupportedLanguageResponse = await originalFetch(`${baseUrl}/api/agreements/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetLanguage: 'xx', pages: [{ num: 1, text: 'Lease' }] }),
  });
  assert(unsupportedLanguageResponse.status === 400, 'unsupported translation languages must be rejected');

  const form = new FormData();
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  form.append('photo', new Blob([pngHeader], { type: 'image/png' }), 'damage.png');
  form.append('location', '411045');
  form.append('agreementPages', JSON.stringify(sunrise.pages));
  const response = await originalFetch(`${baseUrl}/api/maintenance-ai/analyze`, { method: 'POST', body: form });
  const analysis = await response.json();

  assert(response.status === 200, `photo upload route should return success, got ${response.status}`);
  assert(analysis.realAi && analysis.engine === 'photo-analysis', 'route should mark the result as a real photo analysis');
  assert(analysis.issue === 'Possible cracked toilet seat', 'route should return parsed visual analysis');
  assert(analysis.visibleDamage[0] === 'A visible split along the seat rim', 'route should retain visual evidence');
  assert(analysis.costEstimate.totalLow === 500, 'route should preserve indicative returned estimate');
  assert(analysis.costEstimate.currency === 'INR', 'analysis response should normalize model costs to INR');
  assert(analysis.costEstimate.basis.includes('not a contractor quote'), 'route must clearly label prices as estimates');
  assert(visionRequest.url === 'https://generativelanguage.googleapis.com/v1beta/interactions', 'photo request should call the official Interactions API');
  assert(visionRequest.headers['x-goog-api-key'] === 'test-vision-key', 'vision key should be sent only in the backend request header');
  assert(visionRequest.body.model === 'gemini-3.8-flash', 'photo request should use the configured supported vision model');
  assert(visionRequest.body.store === false, 'photo interactions should not be stored by the API');
  assert(visionRequest.body.input[1].type === 'image' && visionRequest.body.input[1].mime_type === 'image/png', 'photo should be sent as an inline image input');
  assert(visionRequest.body.input[1].data === pngHeader.toString('base64'), 'uploaded photo bytes should be forwarded to the analysis service');
  assert(visionRequest.body.input[0].text.includes('Sunrise Apartments'), 'uploaded agreement text should be included in the analysis prompt');

  transientVisionFailure = true;
  const retryForm = new FormData();
  retryForm.append('photo', new Blob([pngHeader], { type: 'image/png' }), 'damage.png');
  retryForm.append('location', '411045');
  const requestsBeforeRetry = visionRequestCount;
  const retryResponse = await originalFetch(`${baseUrl}/api/maintenance-ai/analyze`, { method: 'POST', body: retryForm });
  assert(retryResponse.status === 200, 'temporary upstream overload should be retried once');
  assert(visionRequestCount === requestsBeforeRetry + 2, 'temporary upstream overload should make exactly one retry');

  failVisionRequest = true;
  const failedForm = new FormData();
  failedForm.append('photo', new Blob([pngHeader], { type: 'image/png' }), 'damage.png');
  failedForm.append('location', '411045');
  const previousConsoleError = console.error;
  const errorLogs = [];
  console.error = (...args) => errorLogs.push(args);
  try {
    const failedResponse = await originalFetch(`${baseUrl}/api/maintenance-ai/analyze`, { method: 'POST', body: failedForm });
    const failure = await failedResponse.json();
    assert(failedResponse.status === 401, 'provider authorization failures should preserve the relevant HTTP status');
    assert(!failure.error.toLowerCase().includes('gemini'), 'user-facing failures must not expose provider branding');
    assert(!JSON.stringify(errorLogs).includes('test-vision-key'), 'server debug logs must redact the API key');
    assert(JSON.stringify(errorLogs).includes('[redacted]'), 'server logs should retain useful sanitized provider details');
  } finally {
    console.error = previousConsoleError;
  }
} finally {
  globalThis.fetch = originalFetch;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

console.log('agreement and photo analysis tests passed');
