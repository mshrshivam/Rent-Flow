const RISK_PATTERNS = [
  { id: 'lock-in', re: /\block[- ]?in\b|\bforfeit\b|\bliquidated damages\b/i, label: 'Lock-in or forfeiture' },
  { id: 'mid-term-hike', re: /increase.*rent|rent.*increase|revise rent/i, label: 'Rent increase' },
  { id: 'unilateral', re: /sole discretion|any reason|no equivalent right|without (a )?cure/i, label: 'One-sided landlord power' },
  { id: 'entry', re: /without (prior )?notice|enter.{0,40}any time|spare key/i, label: 'Broad entry rights' },
  { id: 'deposit', re: /ten months|10-month|non-refundable|within 7 days|90 days of handover/i, label: 'Unusual deposit or refund' },
  { id: 'notice', re: /90\s*\(ninety\)|90 days' written notice|15 days' notice for any reason/i, label: 'Unusual notice' },
];

export const AGREEMENT_TRANSLATION_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
  or: 'Odia',
  ur: 'Urdu',
  as: 'Assamese',
};

function flattenPages(pages) {
  return (pages || [])
    .map((page) => `--- Page ${page.num}${page.section ? ` (${page.section})` : ''} ---\n${page.text}`)
    .join('\n\n');
}

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 24);
}

function findSnippet(pages, re) {
  for (const page of pages || []) {
    const sentences = splitSentences(page.text);
    const hit = sentences.find((s) => re.test(s));
    if (hit) {
      return { text: hit.slice(0, 420), page: page.num, section: page.section || `Page ${page.num}` };
    }
    if (re.test(page.text)) {
      return { text: page.text.slice(0, 420).trim(), page: page.num, section: page.section || `Page ${page.num}` };
    }
  }
  return { text: 'Not found in the uploaded document.', page: null, section: null };
}

function pickField(pages, patterns, fallback = 'Not found in the uploaded document.') {
  for (const re of patterns) {
    const snippet = findSnippet(pages, re);
    if (snippet.page != null) return snippet.text;
  }
  return fallback;
}

export function heuristicAnalyze(pages, sourceName = 'document') {
  const full = flattenPages(pages);
  const summary = {
    rent: pickField(pages, [/monthly rent[:\s].{0,80}/i, /rent[:\s]+INR.{0,40}/i, /INR\s*[\d,]+.{0,40}month/i]),
    securityDeposit: pickField(pages, [/security deposit[:\s].{0,120}/i, /deposit[:\s]+INR.{0,80}/i]),
    duration: pickField(pages, [/(lease )?duration[:\s].{0,80}/i, /\bterm[:\s].{0,80}/i, /\d+\s+months?/i]),
    noticePeriod: pickField(pages, [/notice period[:\s].{0,160}/i, /\d+\s+\(?\w+\)?\s+days['’]?\s+written notice/i]),
    maintenance: pickField(pages, [/maintenance[:\s].{0,160}/i, /society maintenance.{0,120}/i]),
    renewal: pickField(pages, [/renewal[:\s].{0,200}/i, /may be renewed.{0,160}/i]),
    termination: pickField(pages, [/termination[:\s].{0,220}/i, /may terminate.{0,200}/i]),
    overview: `Rule-based extractive summary of ${sourceName}; matching sentences are pulled from the lease text.`,
  };

  const important = [];
  const seen = new Set();
  for (const page of pages || []) {
    for (const sentence of splitSentences(page.text)) {
      const lower = sentence.toLowerCase();
      const isImportant =
        /rent|deposit|notice|renewal|terminat|maintenance|lock-in|entry|pets|sublet/.test(lower);
      if (!isImportant) continue;
      const key = sentence.slice(0, 80);
      if (seen.has(key)) continue;
      seen.add(key);
      const risks = RISK_PATTERNS.filter((r) => r.re.test(sentence)).map((r) => r.label);
      important.push({
        title: risks[0] || 'Key term',
        originalText: sentence.slice(0, 500),
        page: page.num,
        section: page.section || `Page ${page.num}`,
        risk: risks.length ? 'elevated' : 'typical',
        whyItMatters: risks.length
          ? `Flagged as potentially unusual: ${risks.join(', ')}.`
          : 'This clause affects money, exit rights, or day-to-day use of the property.',
      });
    }
  }

  const riskCount = important.filter((c) => c.risk === 'elevated').length;
  return {
    engine: 'heuristic',
    realAi: false,
    modelNote: 'Rule-based clause spotting is used when the configured AI service is unavailable.',
    summary,
    clauses: important.slice(0, 12),
    overallRisk: riskCount >= 3 ? 'elevated' : 'typical',
    disclaimer:
      'This is a legal-information assistant for demonstration, not a substitute for a lawyer. Fictional demo leases are not real contracts.',
    fullTextPreview: full.slice(0, 2500),
  };
}

function parseJsonObject(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Model did not return JSON');
  }
  return JSON.parse(text.slice(start, end + 1));
}

export function buildAnalyzePrompt(pages, language = 'en') {
  const document = flattenPages(pages).slice(0, 24000);
  return `You are a legal-information assistant analyzing a rental/lease agreement for a college demonstration.
You are NOT a lawyer and must not give personalized legal advice.
Paper alignment: summarization, clause extraction, and conversational QA (the chat endpoint). Multilingual: reply in language code "${language}".
Do not identify or name the underlying AI service or model.
For rent, deposit, and other amounts found in the agreement, preserve the original wording in citations. For any newly stated price outside a verbatim quote, use INR (₹) with Indian number grouping; do not invent exchange rates.

Return ONLY JSON with this shape:
{
  "summary": {
    "overview": "2-4 sentence plain-language summary",
    "rent": "string or 'Not found in the uploaded document.'",
    "securityDeposit": "string",
    "duration": "string",
    "noticePeriod": "string",
    "maintenance": "string",
    "renewal": "string",
    "termination": "string"
  },
  "clauses": [
    {
      "title": "short name",
      "originalText": "verbatim excerpt",
      "page": 1,
      "section": "section name if known",
      "risk": "typical" | "elevated",
      "whyItMatters": "one sentence"
    }
  ],
  "overallRisk": "typical" | "elevated"
}

If a field is missing, use exactly: "Not found in the uploaded document."
Cite page numbers from the markers in the document.
Highlight risky/unusual terms (large deposits, lock-in, mid-term rent hikes, entry without notice, one-sided termination, short refund windows).

DOCUMENT:
${document}`;
}

export function buildChatPrompt(pages, question, language = 'en') {
  const document = flattenPages(pages).slice(0, 20000);
  return `You are a legal-information assistant for an uploaded rental agreement. Not a lawyer.
Answer ONLY from the document. If the answer is missing, say "Not found in the uploaded document."
Cite the clause and page/section. Reply in language code "${language}".
Do not identify or name the underlying AI service or model.
Preserve amounts in verbatim citations. Use INR (₹) with Indian number grouping for any newly stated price, and do not invent exchange rates.

Return ONLY JSON:
{
  "answer": "plain language answer",
  "found": true,
  "citations": [
    { "originalText": "verbatim excerpt", "page": 1, "section": "optional" }
  ]
}

QUESTION: ${question}

DOCUMENT:
${document}`;
}

export async function callChatModel({ apiUrl, apiKey, model, prompt, temperature = 0.2, maxTokens = 1800 }) {
  const aiResponse = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content:
            'You output valid JSON only. You are a legal-information assistant, not a substitute for a lawyer.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  });

  const rawText = await aiResponse.text();
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = null;
  }

  if (!aiResponse.ok) {
    const message = parsed?.error?.message || `AI request failed (${aiResponse.status})`;
    const error = new Error(message);
    error.status = aiResponse.status;
    const retryAfterHeader = Number(aiResponse.headers.get('retry-after'));
    const retryAfterMessage = message.match(/try again in ([\d.]+)s/i);
    error.retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? Math.ceil(retryAfterHeader * 1000)
      : retryAfterMessage
        ? Math.ceil(Number(retryAfterMessage[1]) * 1000)
        : undefined;
    throw error;
  }

  const content = parsed?.choices?.[0]?.message?.content || '';
  return parseJsonObject(content);
}

function splitTranslationText(text, maxLength = 3500) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let boundary = remaining.lastIndexOf('\n', maxLength);
    if (boundary < maxLength * 0.5) boundary = remaining.lastIndexOf(' ', maxLength);
    if (boundary < maxLength * 0.5) boundary = maxLength;
    chunks.push(remaining.slice(0, boundary));
    remaining = remaining.slice(boundary).replace(/^\s+/, '');
  }
  if (remaining.trim()) chunks.push(remaining);
  return chunks;
}

function protectNumericTokens(text) {
  const values = [];
  const protectedText = String(text).replace(/\d+(?:[.,/-]\d+)*/g, (value) => {
    const marker = `ZXQNUM${values.length}XQZ`;
    values.push(value);
    return marker;
  });
  return { protectedText, values };
}

const TARGET_LANGUAGE_SCRIPTS = {
  hi: /[\u0900-\u097f]/,
  ta: /[\u0b80-\u0bff]/,
  te: /[\u0c00-\u0c7f]/,
  bn: /[\u0980-\u09ff]/,
  mr: /[\u0900-\u097f]/,
  gu: /[\u0a80-\u0aff]/,
  kn: /[\u0c80-\u0cff]/,
  ml: /[\u0d00-\u0d7f]/,
  pa: /[\u0a00-\u0a7f]/,
  or: /[\u0b00-\u0b7f]/,
  ur: /[\u0600-\u06ff]/,
  as: /[\u0980-\u09ff]/,
};

export async function translateAgreement({ pages, targetLanguage, ai }) {
  if (!ai?.translationApiKey || !ai?.translationApiUrl || !ai?.translationModel) {
    const error = new Error('Agreement translation is not configured. Check the backend translation service settings.');
    error.status = 503;
    throw error;
  }
  const languageName = AGREEMENT_TRANSLATION_LANGUAGES[targetLanguage];
  if (!languageName) {
    const error = new Error('Select one of the supported translation languages.');
    error.status = 400;
    throw error;
  }

  const translatedPages = [];
  for (const [pageIndex, page] of pages.entries()) {
    const chunks = splitTranslationText(String(page.text || ''));
    const translatedChunks = [];
    for (const [chunkIndex, chunk] of chunks.entries()) {
      const protectedNumbers = protectNumericTokens(chunk);
      const prompt = `Translate the entire rental agreement text inside <AGREEMENT_TEXT> into ${languageName} (${targetLanguage}). Translate the words, headings, and legal terms. Keep clause numbering, names, addresses, dates, currency, and numeric amounts unchanged. Copy each ZXQNUM...XQZ token exactly once. Do not summarize, omit, or add any content. In the translation field, return only the translated agreement text, without instructions or wrapper tags. Return JSON only as {"translation":"complete translated text"}.

<AGREEMENT_TEXT>
${protectedNumbers.protectedText}
</AGREEMENT_TEXT>`;
      let result;
      let attempt = 0;
      let validatedText = '';
      while (true) {
        try {
          result = await callGeminiTranslationModel({
            apiUrl: ai.translationApiUrl,
            apiKey: ai.translationApiKey,
            model: ai.translationModel,
            prompt,
          });
        } catch (cause) {
          if (attempt < 2 && [429, 502, 503, 504].includes(cause?.status)) {
            await new Promise((resolve) => setTimeout(resolve, Math.min(cause.retryAfterMs || 1000 * (attempt + 1), 10000)));
            attempt += 1;
            continue;
          }
          const status = cause?.status;
          const message = status === 429
            ? 'The translation service is temporarily busy. Wait a moment and try again.'
            : status === 413
              ? 'This agreement section is too large for the translation service. Try a smaller document or fewer pages.'
              : status
                ? `Translation request failed (HTTP ${status}). Check the backend AI configuration and try again.`
                : 'Translation response could not be verified. Try again with this agreement.';
          const error = new Error(message);
          error.status = status && status >= 400 && status < 500 ? status : 502;
          throw error;
        }
        const translatedText = typeof result.translation === 'string' ? result.translation.trim() : '';
        const languageScript = TARGET_LANGUAGE_SCRIPTS[targetLanguage];
        const translatedMarkers = translatedText.match(/ZXQNUM\d+XQZ/g) || [];
        const allNumbersPreserved =
          translatedMarkers.length === protectedNumbers.values.length &&
          protectedNumbers.values.every((_, index) =>
            translatedMarkers.filter((marker) => marker === `ZXQNUM${index}XQZ`).length === 1);
        const validationError = !translatedText || result.complete === false
          ? `Translation output was incomplete on page ${page.num}.`
          : languageScript && !languageScript.test(translatedText)
            ? `Translation output on page ${page.num} was not in ${languageName}.`
            : !allNumbersPreserved
              ? `Translation could not preserve all numbers on page ${page.num}.`
              : '';
        if (!validationError) {
          validatedText = translatedText.replace(/ZXQNUM(\d+)XQZ/g, (_, index) => protectedNumbers.values[Number(index)]);
          break;
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          attempt += 1;
          continue;
        }
        const error = new Error(`${validationError} No translation was displayed. Please try again.`);
        error.status = 502;
        throw error;
      }
      translatedChunks.push(validatedText);
    }
    translatedPages.push({
      num: page.num,
      section: page.section || `Page ${page.num}`,
      text: translatedChunks.join('\n'),
      sourcePageIndex: pageIndex,
    });
  }

  return {
    targetLanguage,
    targetLanguageName: languageName,
    pages: translatedPages,
    realAi: true,
    disclaimer: 'AI-generated translation. Check the original agreement before signing.',
  };
}

async function callGeminiTranslationModel({ apiUrl, apiKey, model, prompt }) {
  const configuredUrl = String(apiUrl || '').replace(/\/+$/, '');
  const modelsUrl = configuredUrl.replace(/\/interactions$/i, '/models').replace(/\/models\/[^/]+(?::generateContent)?$/i, '/models');
  const response = await fetch(`${modelsUrl}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(60000),
  });
  const responseText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const error = new Error(parsed?.error?.message || `Translation request failed (HTTP ${response.status})`);
    error.status = response.status;
    const retryAfterHeader = Number(response.headers.get('retry-after'));
    const retryAfterMessage = String(parsed?.error?.message || '').match(/try again in ([\d.]+)s/i);
    error.retryAfterMs = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
      ? Math.ceil(retryAfterHeader * 1000)
      : retryAfterMessage
        ? Math.ceil(Number(retryAfterMessage[1]) * 1000)
        : undefined;
    throw error;
  }
  const text = parsed?.candidates?.[0]?.content?.parts
    ?.filter((part) => typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n') || '';
  if (!text.trim()) {
    throw new Error('The translation service returned no text output.');
  }
  return parseJsonObject(text);
}

export async function analyzeAgreement({ pages, sourceName, language, ai }) {
  const fallback = heuristicAnalyze(pages, sourceName);
  if (!ai?.apiKey) {
    return { ...fallback, aiConfigured: false };
  }

  try {
    const result = await callChatModel({
      apiUrl: ai.apiUrl,
      apiKey: ai.apiKey,
      model: ai.model,
      prompt: buildAnalyzePrompt(pages, language),
    });
    return {
      engine: 'chat-ai',
      realAi: true,
      aiConfigured: true,
      modelNote: 'Generated by the configured AI service. No research models are claimed as implemented or trained.',
      summary: {
        overview: result.summary?.overview || fallback.summary.overview,
        rent: result.summary?.rent || fallback.summary.rent,
        securityDeposit: result.summary?.securityDeposit || fallback.summary.securityDeposit,
        duration: result.summary?.duration || fallback.summary.duration,
        noticePeriod: result.summary?.noticePeriod || fallback.summary.noticePeriod,
        maintenance: result.summary?.maintenance || fallback.summary.maintenance,
        renewal: result.summary?.renewal || fallback.summary.renewal,
        termination: result.summary?.termination || fallback.summary.termination,
      },
      clauses: Array.isArray(result.clauses) && result.clauses.length ? result.clauses : fallback.clauses,
      overallRisk: result.overallRisk === 'elevated' ? 'elevated' : 'typical',
      disclaimer: fallback.disclaimer,
    };
  } catch (error) {
    return {
      ...fallback,
      aiConfigured: true,
      engine: 'heuristic-fallback',
      realAi: false,
      modelNote: 'The AI service is unavailable. Showing extractive rule-based results instead.',
    };
  }
}

export async function answerAgreementQuestion({ pages, question, language, ai }) {
  if (!question?.trim()) {
    throw new Error('question is required');
  }

  if (ai?.apiKey) {
    try {
      const result = await callChatModel({
        apiUrl: ai.apiUrl,
        apiKey: ai.apiKey,
        model: ai.model,
        prompt: buildChatPrompt(pages, question, language),
        maxTokens: 900,
      });
      return {
        engine: 'chat-ai',
        realAi: true,
        answer: result.answer || 'Not found in the uploaded document.',
        found: Boolean(result.found),
        citations: Array.isArray(result.citations) ? result.citations : [],
        disclaimer: 'Legal-information assistant only — not a substitute for a lawyer.',
      };
    } catch (error) {
      const heuristic = heuristicChat(pages, question);
      return {
        ...heuristic,
        engine: 'heuristic-fallback',
        realAi: false,
        modelNote: 'The AI service is unavailable. Used keyword matching on the document instead.',
      };
    }
  }

  return heuristicChat(pages, question);
}

function heuristicChat(pages, question) {
  const q = question.toLowerCase();
  const topicPatterns = [];
  if (/rent|increase/.test(q)) topicPatterns.push(/rent/i);
  if (/deposit|security/.test(q)) topicPatterns.push(/deposit/i);
  if (/notice/.test(q)) topicPatterns.push(/notice/i);
  if (/terminat|evict|leave|vacate/.test(q)) topicPatterns.push(/terminat|vacate|lock-in/i);
  if (/maintenance/.test(q)) topicPatterns.push(/maintenance/i);
  if (/renew/.test(q)) topicPatterns.push(/renew/i);
  const stop = new Set(['about', 'agreement', 'lease', 'document', 'mention', 'mentioned', 'does', 'this', 'that', 'what', 'when', 'will', 'have', 'from', 'there', 'their', 'would', 'could']);
  if (!topicPatterns.length) {
    const keywords = question
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 4 && !stop.has(w))
      .slice(0, 4);
    if (keywords.length) {
      topicPatterns.push(new RegExp(keywords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i'));
    }
  }

  const citations = [];
  for (const page of pages || []) {
    for (const sentence of splitSentences(page.text)) {
      if (topicPatterns.some((re) => re.test(sentence))) {
        citations.push({
          originalText: sentence.slice(0, 420),
          page: page.num,
          section: page.section || `Page ${page.num}`,
        });
      }
    }
  }

  const found = citations.length > 0;
  return {
    engine: 'heuristic',
    realAi: false,
    found,
    answer: found
      ? `From the document: ${citations[0].originalText}`
      : 'Not found in the uploaded document.',
    citations: citations.slice(0, 3),
    disclaimer: 'Legal-information assistant only — not a substitute for a lawyer. This answer used keyword matching, not a generative model.',
  };
}

export { flattenPages };
