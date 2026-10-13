import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { getDemoById, getDemoList, flattenPages as flattenDemo } from './data/demoAgreements.js';
import {
  AGREEMENT_TRANSLATION_LANGUAGES,
  analyzeAgreement,
  answerAgreementQuestion,
  flattenPages,
  translateAgreement,
} from './agreementAi.js';

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|docx|txt)$/i.test(file.originalname);
    if (ok) return cb(null, true);
    cb(new Error('Invalid file type. Upload PDF, DOCX, or TXT.'));
  },
});

function pagesFromPlainText(text, name = 'Document') {
  const chunks = String(text || '')
    .split(/\f|\n{3,}/)
    .map((t) => t.trim())
    .filter(Boolean);
  const parts = chunks.length ? chunks : [String(text || '').trim()].filter(Boolean);
  return parts.map((body, i) => ({
    num: i + 1,
    section: parts.length > 1 ? `${name} part ${i + 1}` : name,
    text: body,
  }));
}

async function extractPagesFromBuffer(buffer, originalname, mimeType) {
  const name = originalname || 'upload';
  const isPdf = mimeType?.includes('pdf') || name.toLowerCase().endsWith('.pdf');
  const isDocx = name.toLowerCase().endsWith('.docx');
  const isTxt = mimeType?.includes('text/plain') || name.toLowerCase().endsWith('.txt');

  if (isPdf) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const pages = (parsed.pages || []).map((page) => ({
      num: page.num,
      section: `Page ${page.num}`,
      text: String(page.text || '').trim(),
    })).filter((p) => p.text);
    if (pages.length) return pages;
    return pagesFromPlainText(parsed.text || '', name);
  }

  if (isDocx) {
    const mammoth = await import('mammoth');
    const parsed = await mammoth.extractRawText({ buffer });
    return pagesFromPlainText(parsed?.value || '', name);
  }

  if (isTxt) {
    return pagesFromPlainText(buffer.toString('utf8'), name);
  }

  throw new Error('Unsupported file type');
}

export function registerAgreementRoutes(app, { ai, uploadsDir }) {
  app.get('/api/agreements/status', (req, res) => {
    res.json({
      aiConfigured: Boolean(ai.apiKey),
      note: ai.apiKey
        ? 'AI-generated summaries and answers are available through the secure backend.'
        : 'The AI service is not configured. Rule-based extraction remains available for demonstrations.',
    });
  });

  app.get('/api/agreements/demo', (req, res) => {
    res.json({
      agreements: getDemoList(),
      note: 'Fictional agreements for a college demonstration. Not real contracts.',
    });
  });

  app.get('/api/agreements/demo/:id', (req, res) => {
    const demo = getDemoById(req.params.id);
    if (!demo) return res.status(404).json({ error: 'Demo agreement not found' });
    res.json({
      ...demo,
      fullText: flattenDemo(demo.pages),
      fictional: true,
    });
  });

  app.post('/api/agreements/extract', memoryUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Upload a PDF or DOCX file as "file"' });
      }
      const pages = await extractPagesFromBuffer(req.file.buffer, req.file.originalname, req.file.mimetype);
      if (!pages.length) {
        return res.status(422).json({ error: 'No extractable text found in that file' });
      }
      res.json({
        fileName: req.file.originalname,
        pageCount: pages.length,
        pages,
        fullText: flattenPages(pages),
        engine: 'pdf-parse/mammoth',
        realAi: false,
        note: 'Text extraction only. Summaries and Q&A are a separate step.',
      });
    } catch (error) {
      console.error('Agreement extract error:', error);
      res.status(500).json({ error: error.message || 'Failed to extract agreement text' });
    }
  });

  app.post('/api/agreements/analyze', async (req, res) => {
    try {
      const { demoId, pages, language = 'en', sourceName } = req.body || {};
      let resolvedPages = pages;
      let name = sourceName || 'Uploaded agreement';

      if (demoId) {
        const demo = getDemoById(demoId);
        if (!demo) return res.status(404).json({ error: 'Demo agreement not found' });
        resolvedPages = demo.pages;
        name = demo.title;
      }

      if (!Array.isArray(resolvedPages) || resolvedPages.length === 0) {
        return res.status(400).json({ error: 'pages array or demoId is required' });
      }

      const analysis = await analyzeAgreement({
        pages: resolvedPages,
        sourceName: name,
        language,
        ai,
      });

      res.json({
        sourceName: name,
        pageCount: resolvedPages.length,
        pages: resolvedPages,
        ...analysis,
      });
    } catch (error) {
      console.error('Agreement analyze error:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze agreement' });
    }
  });

  app.post('/api/agreements/chat', async (req, res) => {
    try {
      const { demoId, pages, question, language = 'en' } = req.body || {};
      let resolvedPages = pages;

      if (demoId) {
        const demo = getDemoById(demoId);
        if (!demo) return res.status(404).json({ error: 'Demo agreement not found' });
        resolvedPages = demo.pages;
      }

      if (!Array.isArray(resolvedPages) || resolvedPages.length === 0) {
        return res.status(400).json({ error: 'pages array or demoId is required' });
      }

      const result = await answerAgreementQuestion({
        pages: resolvedPages,
        question,
        language,
        ai,
      });
      res.json(result);
    } catch (error) {
      console.error('Agreement chat error:', error);
      res.status(400).json({ error: error.message || 'Failed to answer question' });
    }
  });

  app.post('/api/agreements/translate', async (req, res) => {
    try {
      const { demoId, pages, targetLanguage } = req.body || {};
      let resolvedPages = pages;

      if (demoId) {
        const demo = getDemoById(demoId);
        if (!demo) return res.status(404).json({ error: 'Demo agreement not found' });
        resolvedPages = demo.pages;
      }

      if (!Array.isArray(resolvedPages) || resolvedPages.length === 0 ||
          resolvedPages.some((page) => !page || typeof page.text !== 'string')) {
        return res.status(400).json({ error: 'pages array or demoId is required' });
      }
      if (resolvedPages.reduce((total, page) => total + page.text.length, 0) > 120000) {
        return res.status(413).json({ error: 'Agreement text exceeds the 120,000-character translation limit.' });
      }
      if (!Object.hasOwn(AGREEMENT_TRANSLATION_LANGUAGES, targetLanguage)) {
        return res.status(400).json({ error: 'Select one of the supported translation languages.' });
      }

      const translation = await translateAgreement({ pages: resolvedPages, targetLanguage, ai });
      res.json(translation);
    } catch (error) {
      console.error('Agreement translation failed:', error.status || error.message);
      res.status(error.status || 502).json({
        error: error.message || 'Agreement translation failed. Please try again.',
      });
    }
  });

  // Optional: extract from a previously uploaded /uploads file
  app.post('/api/agreements/extract-from-upload', async (req, res) => {
    try {
      const url = req.body?.url;
      if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
        return res.status(400).json({ error: 'url must start with /uploads/' });
      }
      const filePath = path.join(uploadsDir, path.basename(url));
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      const buffer = await fs.promises.readFile(filePath);
      const pages = await extractPagesFromBuffer(buffer, path.basename(url), '');
      res.json({ pages, fullText: flattenPages(pages) });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Failed to extract' });
    }
  });
}
