import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { registerAgreementRoutes } from './agreementRoutes.js';
import { registerMaintenanceAiRoutes } from './maintenanceAiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
const app = express();
app.use(cors());

// Body parser should NOT process multipart/form-data (used by file uploads)
app.use((req, res, next) => {
  if (req.is('multipart/form-data')) {
    return next();
  }
  bodyParser.json()(req, res, next);
});

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomUUID();
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|plain|octet-stream/i;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images, PDFs, and documents allowed.'));
  }
});

let PDFParseClass = null;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const AI_CHAT_API_URL = process.env.AI_CHAT_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-20b';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_VISION_API_URL = process.env.AI_VISION_API_URL || 'https://generativelanguage.googleapis.com/v1beta/interactions';
const AI_VISION_API_KEY = GEMINI_API_KEY || process.env.AI_VISION_API_KEY;
const AI_VISION_MODEL = process.env.AI_VISION_MODEL || 'gemini-3.8-flash';
const GEMINI_TRANSLATE_MODEL = process.env.GEMINI_TRANSLATE_MODEL || 'gemini-3.5-flash-lite';
const EXTRACT_MAX_CHARS = Number(process.env.EXTRACT_MAX_CHARS || 120000);

registerAgreementRoutes(app, {
  uploadsDir,
  ai: {
    apiUrl: AI_CHAT_API_URL,
    apiKey: AI_API_KEY,
    model: AI_MODEL,
    translationApiUrl: AI_VISION_API_URL,
    translationApiKey: AI_VISION_API_KEY,
    translationModel: GEMINI_TRANSLATE_MODEL,
  },
});
registerMaintenanceAiRoutes(app, {
  ai: {
    apiUrl: AI_CHAT_API_URL,
    apiKey: AI_API_KEY,
    model: AI_MODEL,
    visionApiUrl: AI_VISION_API_URL,
    visionApiKey: AI_VISION_API_KEY,
  },
  visionModel: AI_VISION_MODEL,
});

// Helper to generate UUIDs
function generateId() {
  return crypto.randomUUID();
}

function looksLikeUuid(value) {
  if (!value || typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveUserIdentifiers(client, rawIdentifier) {
  if (!rawIdentifier) return [];

  const value = String(rawIdentifier).trim();
  if (!value) return [];

  const identifiers = new Set([value]);

  if (looksLikeUuid(value)) {
    const byId = await client.query('SELECT id, email FROM users WHERE id = $1', [value]);
    if (byId.rows.length > 0) {
      identifiers.add(byId.rows[0].id);
      if (byId.rows[0].email) identifiers.add(byId.rows[0].email);
    }
  } else {
    const byEmail = await client.query('SELECT id, email FROM users WHERE email = $1', [value]);
    if (byEmail.rows.length > 0) {
      identifiers.add(byEmail.rows[0].id);
      if (byEmail.rows[0].email) identifiers.add(byEmail.rows[0].email);
    }
  }

  return Array.from(identifiers);
}

function buildOfflineAssistantReply(promptText = '') {
  const text = String(promptText || '');
  const extractedMarker = '[Extracted file content for summarization]';
  const extractedStart = text.indexOf(extractedMarker);
  const hasAttachmentText = extractedStart >= 0;

  const attachmentSource = hasAttachmentText
    ? text.slice(extractedStart + extractedMarker.length)
    : '';

  const latestUserMessage = text
    .replace(/\[Extracted file content for summarization\][\s\S]*/i, '')
    .trim();

  const shouldSummarize = /(summari[sz]e|summary|key\s*points|tldr|brief|overview|analy[sz]e|explain\s+(this|the)\s+(pdf|doc|document|file))/i
    .test(latestUserMessage || text);

  if (hasAttachmentText && shouldSummarize) {
    const cleaned = attachmentSource
      .replace(/--- Extracted text \d+ from .*? ---/g, '\n')
      .replace(/\r/g, '')
      .trim();

    const lines = cleaned
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 2)
      .filter((line) => !/^\d+[.)]?$/.test(line));

    const uniqueLines = [...new Set(lines)];
    const topLines = uniqueLines.slice(0, 10);

    if (topLines.length === 0) {
      return 'Sure. I can summarize the uploaded document, but I could not read meaningful text from it. Please try a clearer PDF/DOCX or upload again.';
    }

    const bullets = topLines.slice(0, 6).map((line) => `- ${line}`).join('\n');

    return `Sure, here is a quick summary of your attached document:\n\n${bullets}\n\nIf you want, I can also give you:\n1. A shorter executive summary\n2. Missing/blank fields\n3. A clean JSON output of the extracted details`;
  }

  if (hasAttachmentText) {
    return 'I can read your uploaded document. Ask me something specific like "summarize this file", "extract key details", or "list missing fields" and I will do that.';
  }

  if (!latestUserMessage) {
    return 'I am here to help. You can ask me property, tenant, maintenance, or lease-related questions.';
  }

  return `Got it. You said: "${latestUserMessage}". I can help with that. If you upload a PDF/DOCX and ask for a summary, I will summarize it for you.`;
}

async function resolveOrCreateUserId(client, rawIdentifier, role = 'tenant', fullName = null) {
  if (!rawIdentifier) throw new Error('User identifier is required');

  if (looksLikeUuid(rawIdentifier)) {
    const byId = await client.query('SELECT id FROM users WHERE id = $1', [rawIdentifier]);
    if (byId.rows.length > 0) return byId.rows[0].id;
  }

  const byEmail = await client.query('SELECT id FROM users WHERE email = $1', [rawIdentifier]);
  if (byEmail.rows.length > 0) return byEmail.rows[0].id;

  if (typeof rawIdentifier === 'string' && rawIdentifier.includes('@')) {
    const hash = await bcrypt.hash('defaultPassword123', 10);
    const created = await client.query(
      'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [rawIdentifier, hash, fullName || rawIdentifier.split('@')[0], role]
    );
    return created.rows[0].id;
  }

  // Fallback for legacy/local IDs that are neither UUID nor email.
  // Use a deterministic synthetic email so repeated requests map to the same user.
  if (typeof rawIdentifier === 'string') {
    const syntheticLocalPart = `legacy_${crypto
      .createHash('sha1')
      .update(rawIdentifier)
      .digest('hex')
      .slice(0, 16)}`;
    const syntheticEmail = `${syntheticLocalPart}@local.user`;

    const bySyntheticEmail = await client.query('SELECT id FROM users WHERE email = $1', [syntheticEmail]);
    if (bySyntheticEmail.rows.length > 0) return bySyntheticEmail.rows[0].id;

    const hash = await bcrypt.hash('defaultPassword123', 10);
    const created = await client.query(
      'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [syntheticEmail, hash, fullName || rawIdentifier, role]
    );
    return created.rows[0].id;
  }

  throw new Error('Unable to resolve user identifier');
}

async function translateWithGemini(text, source, target) {
  if (!GEMINI_API_KEY) return null;

  const instruction = [
    `Translate the following text from ${source} to ${target}.`,
    'Return only the translated text.',
    'Do not add explanations, markdown, or quotes.',
    '',
    text,
  ].join('\n');

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_TRANSLATE_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: instruction }] }],
      generationConfig: {
        temperature: 0,
        topP: 0.95,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini translate failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const translatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!translatedText) {
    throw new Error('Gemini translate returned empty result');
  }

  return translatedText;
}

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create properties table
    await client.query(`
      CREATE TABLE IF NOT EXISTS properties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500),
        city VARCHAR(100),
        state VARCHAR(100),
        postal_code VARCHAR(20),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create units table
    await client.query(`
      CREATE TABLE IF NOT EXISTS units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id),
        unit_number VARCHAR(50),
        unit_type VARCHAR(100),
        bedrooms INT,
        bathrooms INT,
        rent_amount DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'available',
        area_sqft INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create tenancies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenancies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id UUID NOT NULL REFERENCES units(id),
        tenant_id UUID NOT NULL REFERENCES users(id),
        start_date DATE NOT NULL,
        end_date DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participants TEXT[] NOT NULL,
        subject VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id),
        sender_id UUID NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(100) DEFAULT 'general',
        reference_id UUID,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create rent_payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rent_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES users(id),
        unit_id UUID NOT NULL REFERENCES units(id),
        amount DECIMAL(10, 2) NOT NULL,
        payment_date DATE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create maintenance_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES users(id),
        unit_id UUID NOT NULL REFERENCES units(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      ALTER TABLE maintenance_requests
      ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS photo TEXT;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES users(id),
        unit_id UUID NOT NULL REFERENCES units(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (tenant_id, unit_id)
      );
    `);

    console.log('Database tables initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
  } finally {
    client.release();
  }
}

// Initialize on startup
initializeDatabase().catch(console.error);

// --- Auth routes ---
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already in use' });
    
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role',
      [email, hash, fullName, role || 'user']
    );
    
    const user = { id: result.rows[0].id, email: result.rows[0].email, fullName: result.rows[0].full_name, role: result.rows[0].role };
    res.json({ user });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT id, email, password, full_name, role FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    
    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    
    res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// profile lookup
app.get('/api/auth/profile', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  
  try {
    const result = await pool.query('SELECT id, email, full_name, role FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    const user = result.rows[0];
    res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role } });
  } catch (err) {
    console.error('Profile lookup error:', err);
    res.status(400).json({ error: 'Invalid userId format' });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  const role = req.query.role;
  const ownerId = req.query.ownerId;

  try {
    if (role === 'manager') {
      const [ownersResult, propertiesResult, tenantsResult, pendingRequestsResult] = await Promise.all([
        pool.query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'owner'"),
        pool.query('SELECT COUNT(*)::int AS total FROM properties'),
        pool.query('SELECT COUNT(*)::int AS total FROM tenancies WHERE is_active = true'),
        pool.query("SELECT COUNT(*)::int AS total FROM maintenance_requests WHERE status = 'pending'")
      ]);

      return res.json({
        owners: ownersResult.rows[0]?.total || 0,
        properties: propertiesResult.rows[0]?.total || 0,
        tenants: tenantsResult.rows[0]?.total || 0,
        pendingRequests: pendingRequestsResult.rows[0]?.total || 0
      });
    }

    if (role === 'owner') {
      if (!ownerId) {
        return res.status(400).json({ error: 'ownerId required for owner stats' });
      }

      const [propertiesResult, tenantsResult, pendingRequestsResult] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS total FROM properties WHERE owner_id = $1', [ownerId]),
        pool.query(
          `SELECT COUNT(DISTINCT t.tenant_id)::int AS total
           FROM tenancies t
           JOIN units u ON t.unit_id = u.id
           JOIN properties p ON u.property_id = p.id
           WHERE p.owner_id = $1 AND t.is_active = true`,
          [ownerId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM maintenance_requests mr
           JOIN units u ON mr.unit_id = u.id
           JOIN properties p ON u.property_id = p.id
           WHERE p.owner_id = $1 AND mr.status = 'pending'`,
          [ownerId]
        )
      ]);

      return res.json({
        properties: propertiesResult.rows[0]?.total || 0,
        tenants: tenantsResult.rows[0]?.total || 0,
        pendingRequests: pendingRequestsResult.rows[0]?.total || 0
      });
    }

    return res.status(400).json({ error: 'role must be manager or owner' });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const {
    messages,
    systemPrompt,
    model = AI_MODEL,
    temperature = 0.7,
    max_tokens = 1024,
  } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!AI_API_KEY) {
    return res.status(500).json({ error: 'No AI API key is configured (AI_API_KEY)' });
  }

  try {
    const chatPayload = {
      model: typeof model === 'string' && model ? model : AI_MODEL,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        {
          role: 'system',
          content: 'For new rent, deposit, payment, and repair prices, use Indian Rupees (INR), the ₹ symbol, and en-IN number grouping. Preserve exact quoted source-document text without altering its currency.',
        },
        ...messages,
      ],
      temperature,
      max_tokens,
    };

    const aiResponse = await fetch(AI_CHAT_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatPayload),
    });

    const rawText = await aiResponse.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }

    if (!aiResponse.ok) {
      const upstreamMessage = parsed?.error?.message || `AI request failed with HTTP ${aiResponse.status}`;
      console.error('AI proxy request failed:', {
        status: aiResponse.status,
        detail: String(upstreamMessage).replaceAll(AI_API_KEY, '[redacted]').slice(0, 1000),
      });
      return res.status(aiResponse.status).json({
        error: `AI request failed (HTTP ${aiResponse.status}). Please try again.`,
      });
    }

    const content = parsed?.choices?.[0]?.message?.content || '';
    return res.json({ content, raw: parsed });
  } catch (error) {
    console.error('AI proxy error:', error);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

app.post('/api/translate', async (req, res) => {
  const { text, source, target } = req.body || {};

  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }
  if (typeof target !== 'string' || !target.trim()) {
    return res.status(400).json({ error: 'target is required' });
  }

  if (!source || source === target) {
    return res.json({ translatedText: text });
  }

  if (GEMINI_API_KEY) {
    try {
      const translatedText = await translateWithGemini(text, source, target);
      if (translatedText) {
        return res.json({ translatedText, provider: 'gemini' });
      }
    } catch (error) {
      console.warn('Gemini translate provider failed:', error?.message || error);
    }
  }

  try {
    const libre = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: 'text',
      }),
    });

    if (libre.ok) {
      const data = await libre.json();
      if (data?.translatedText) {
        return res.json({ translatedText: data.translatedText, provider: 'libretranslate.de' });
      }
    }
  } catch (error) {
    console.warn('Primary translate provider failed:', error?.message || error);
  }

  try {
    const pair = `${source}|${target}`;
    const fallback = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`
    );
    if (fallback.ok) {
      const data = await fallback.json();
      const translatedText = data?.responseData?.translatedText;
      if (translatedText) {
        return res.json({ translatedText, provider: 'mymemory' });
      }
    }
  } catch (error) {
    console.warn('Fallback translate provider failed:', error?.message || error);
  }

  return res.json({ translatedText: text, provider: 'passthrough' });
});

app.post('/api/translate/batch', async (req, res) => {
  const { items, target } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }
  if (typeof target !== 'string' || !target.trim()) {
    return res.status(400).json({ error: 'target is required' });
  }

  try {
    const translated = await Promise.all(
      items.map(async (item) => {
        const text = typeof item?.text === 'string' ? item.text : '';
        const source = typeof item?.source === 'string' ? item.source : 'en';
        if (!text || source === target) {
          return { translatedText: text };
        }

        if (GEMINI_API_KEY) {
          try {
            const translatedText = await translateWithGemini(text, source, target);
            return { translatedText, provider: 'gemini' };
          } catch (error) {
            console.warn('Gemini batch item failed, falling back:', error?.message || error);
          }
        }

        try {
          const libre = await fetch('https://libretranslate.de/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: text, source, target, format: 'text' }),
          });
          if (libre.ok) {
            const data = await libre.json();
            if (data?.translatedText) {
              return { translatedText: data.translatedText, provider: 'libretranslate.de' };
            }
          }
        } catch (error) {
          console.warn('Libre batch item failed:', error?.message || error);
        }

        try {
          const pair = `${source}|${target}`;
          const fallback = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`
          );
          if (fallback.ok) {
            const data = await fallback.json();
            const translatedText = data?.responseData?.translatedText;
            if (translatedText) {
              return { translatedText, provider: 'mymemory' };
            }
          }
        } catch (error) {
          console.warn('MyMemory batch item failed:', error?.message || error);
        }

        return { translatedText: text, provider: 'passthrough' };
      })
    );

    return res.json({ items: translated });
  } catch (error) {
    console.error('Batch translate error:', error);
    return res.status(500).json({ error: 'Failed to batch translate' });
  }
});

// Properties endpoints
app.get('/api/properties', async (req, res) => {
  const ownerId = req.query.ownerId;
  const tenantId = req.query.tenantId;
  const scope = req.query.scope;
  
  try {
    if (scope === 'all') {
      const result = await pool.query('SELECT id, owner_id, name, address, city, state, postal_code, country, created_at, updated_at FROM properties ORDER BY created_at DESC');
      return res.json(result.rows);
    }

    // If tenantId is provided, get properties where the tenant has an active tenancy
    if (tenantId) {
      const result = await pool.query(`
        SELECT DISTINCT p.id, p.owner_id, p.name, p.address, p.city, p.state, p.postal_code, p.country, p.created_at, p.updated_at 
        FROM properties p
        JOIN units u ON p.id = u.property_id
        JOIN tenancies t ON u.id = t.unit_id
        WHERE t.tenant_id = $1 AND t.is_active = true
      `, [tenantId]);
      res.json(result.rows);
    } else if (ownerId) {
      // Get properties owned by the user
      const result = await pool.query('SELECT id, owner_id, name, address, city, state, postal_code, country, created_at, updated_at FROM properties WHERE owner_id = $1', [ownerId]);
      res.json(result.rows);
    } else {
      res.status(400).json({ error: 'ownerId or tenantId required' });
    }
  } catch (err) {
    console.error('Get properties error:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

app.post('/api/properties', async (req, res) => {
  const { owner_id, name, address, city, state, postal_code, country } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO properties (owner_id, name, address, city, state, postal_code, country) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [owner_id, name, address, city, state, postal_code, country]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

app.patch('/api/properties', async (req, res) => {
  const { id, name, address, city, state, postal_code, country } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  
  try {
    const result = await pool.query(
      'UPDATE properties SET name = COALESCE($1, name), address = COALESCE($2, address), city = COALESCE($3, city), state = COALESCE($4, state), postal_code = COALESCE($5, postal_code), country = COALESCE($6, country), updated_at = CURRENT_TIMESTAMP WHERE id = $7 RETURNING *',
      [name, address, city, state, postal_code, country, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update property error:', err);
    res.status(500).json({ error: 'Failed to update property' });
  }
});

app.delete('/api/properties', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  
  try {
    await pool.query('DELETE FROM properties WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error('Delete property error:', err);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

// Units endpoints
app.get('/api/units', async (req, res) => {
  const propertyId = req.query.propertyId;
  const status = req.query.status;
  
  try {
    // If no propertyId specified, return all units (optionally filtered by status)
    if (!propertyId) {
      let query = `
        SELECT u.*, p.name as property_name, p.address, p.city, p.state 
        FROM units u
        JOIN properties p ON u.property_id = p.id
      `;
      const params = [];
      
      if (status) {
        query += ' WHERE u.status = $1';
        params.push(status);
      }
      
      query += ' ORDER BY u.created_at DESC';
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } else {
      // Get units for a specific property
      const result = await pool.query('SELECT id, property_id, unit_number, unit_type, bedrooms, bathrooms, rent_amount, rent_amount AS monthly_rent, status, area_sqft, created_at, updated_at FROM units WHERE property_id = $1', [propertyId]);
      res.json(result.rows);
    }
  } catch (err) {
    console.error('Get units error:', err);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
});

app.post('/api/units', async (req, res) => {
  const { property_id, unit_number, unit_type, bedrooms, bathrooms, rent_amount, status, area_sqft } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO units (property_id, unit_number, unit_type, bedrooms, bathrooms, rent_amount, status, area_sqft) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [property_id, unit_number, unit_type, bedrooms, bathrooms, rent_amount, status || 'available', area_sqft]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create unit error:', err);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

app.patch('/api/units', async (req, res) => {
  const { id, unit_number, unit_type, rent_amount, status, area_sqft } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'id is required' });
  }

  if (status && !['available', 'occupied'].includes(status)) {
    return res.status(400).json({ error: 'status must be available or occupied' });
  }

  try {
    const result = await pool.query(
      `UPDATE units
       SET unit_number = COALESCE($1, unit_number),
           unit_type = COALESCE($2, unit_type),
           rent_amount = COALESCE($3, rent_amount),
           status = COALESCE($4, status),
           area_sqft = COALESCE($5, area_sqft),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *, rent_amount AS monthly_rent`,
      [unit_number, unit_type, rent_amount, status, area_sqft, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update unit error:', err);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

app.patch('/api/units/status', async (req, res) => {
  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ error: 'id and status are required' });
  }

  if (!['available', 'occupied'].includes(status)) {
    return res.status(400).json({ error: 'status must be available or occupied' });
  }

  try {
    const result = await pool.query(
      `UPDATE units
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *, rent_amount AS monthly_rent`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update unit status error:', err);
    res.status(500).json({ error: 'Failed to update unit status' });
  }
});

// Tenancies endpoints
app.get('/api/tenancies', async (req, res) => {
  const ownerId = req.query.ownerId;
  const tenantId = req.query.tenantId;
  const scope = req.query.scope;
  
  try {
    if (tenantId) {
      const result = await pool.query(`
        SELECT
          t.id,
          t.unit_id,
          t.tenant_id,
          t.start_date,
          t.end_date,
          t.is_active,
          t.created_at,
          t.updated_at,
          u.unit_number,
          u.unit_type,
          u.rent_amount,
          u.bedrooms,
          u.bathrooms,
          p.id AS property_id,
          p.name AS property_name,
          p.address AS property_address,
          p.city AS property_city
        FROM tenancies t
        JOIN units u ON t.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE t.tenant_id = $1 AND t.is_active = true
        ORDER BY t.created_at DESC
      `, [tenantId]);
      return res.json(result.rows);
    }

    if (scope === 'all') {
      const result = await pool.query(`
        SELECT
          t.id,
          t.unit_id,
          t.tenant_id,
          t.start_date,
          t.end_date,
          t.is_active,
          t.created_at,
          t.updated_at,
          u.unit_number,
          u.unit_type,
          u.rent_amount,
          p.id AS property_id,
          p.name AS property_name,
          p.address AS property_address,
          p.city AS property_city
        FROM tenancies t
        JOIN units u ON t.unit_id = u.id
        JOIN properties p ON u.property_id = p.id
        WHERE t.is_active = true
        ORDER BY t.created_at DESC
      `);
      return res.json(result.rows);
    }

    if (!ownerId) return res.status(400).json({ error: 'ownerId or tenantId required' });

    const result = await pool.query(`
      SELECT
        t.id,
        t.unit_id,
        t.tenant_id,
        t.start_date,
        t.end_date,
        t.is_active,
        t.created_at,
        t.updated_at,
        u.unit_number,
        u.unit_type,
        u.rent_amount,
        p.id AS property_id,
        p.name AS property_name,
        p.address AS property_address,
        p.city AS property_city
      FROM tenancies t
      JOIN units u ON t.unit_id = u.id
      JOIN properties p ON u.property_id = p.id
      WHERE p.owner_id = $1 AND t.is_active = true
      ORDER BY t.created_at DESC
    `, [ownerId]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get tenancies error:', err);
    res.status(500).json({ error: 'Failed to fetch tenancies' });
  }
});

// Tenants endpoints
app.get('/api/tenants', async (req, res) => {
  const ownerId = req.query.ownerId;
  const scope = req.query.scope;
  
  try {
    if (scope === 'unregistered') {
      const result = await pool.query(`
        SELECT
          u.id AS id,
          u.id AS tenant_id,
          u.full_name,
          u.email,
          NULL::text AS phone,
          u.created_at
        FROM users u
        WHERE u.role = 'tenant'
          AND NOT EXISTS (
            SELECT 1
            FROM tenancies t
            WHERE t.tenant_id = u.id
              AND t.is_active = true
          )
        ORDER BY u.created_at DESC
      `);
      return res.json(result.rows);
    }

    if (scope === 'all') {
      const result = await pool.query(`
        SELECT
          t.id AS id,
          u.id AS tenant_id,
          u.full_name,
          u.email,
          NULL::text AS phone,
          un.id AS unit_id,
          un.unit_number,
          p.name AS property_name,
          p.address AS property_address,
          un.rent_amount AS monthly_rent,
          t.start_date,
          t.is_active
        FROM tenancies t
        JOIN users u ON u.id = t.tenant_id
        JOIN units un ON t.unit_id = un.id
        JOIN properties p ON un.property_id = p.id
        WHERE t.is_active = true
        ORDER BY t.created_at DESC
      `);
      return res.json(result.rows);
    }

    if (!ownerId) return res.status(400).json({ error: 'ownerId or scope required' });

    const result = await pool.query(`
      SELECT
        t.id AS id,
        u.id AS tenant_id,
        u.full_name,
        u.email,
        NULL::text AS phone,
        un.id AS unit_id,
        un.unit_number,
        p.name AS property_name,
        p.address AS property_address,
        un.rent_amount AS monthly_rent,
        t.start_date,
        t.is_active
      FROM tenancies t
      JOIN users u ON u.id = t.tenant_id
      JOIN units un ON t.unit_id = un.id
      JOIN properties p ON un.property_id = p.id
      WHERE p.owner_id = $1 AND t.is_active = true
      ORDER BY t.created_at DESC
    `, [ownerId]);
    return res.json(result.rows);
  } catch (err) {
    console.error('Get tenants error:', err);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get all owners endpoint
app.get('/api/owners', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        COUNT(p.id) as property_count
      FROM users u
      LEFT JOIN properties p ON u.id = p.owner_id
      WHERE u.role = 'owner'
      GROUP BY u.id, u.email, u.full_name, u.role
      ORDER BY u.full_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get owners error:', err);
    res.status(500).json({ error: 'Failed to fetch owners' });
  }
});

// Create tenant profile + tenancy
app.post('/api/tenants', async (req, res) => {
  const { email, full_name, phone, unit_id, start_date, end_date } = req.body;
  if (!email || !unit_id || !start_date) return res.status(400).json({ error: 'Missing required fields' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    let tenantId;
    if (existing.rows.length > 0) {
      tenantId = existing.rows[0].id;
    } else {
      // Use the standard demo password so newly added tenants can log in immediately.
      const hash = await bcrypt.hash('password123', 10);
      const result = await client.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, hash, full_name, 'tenant']
      );
      tenantId = result.rows[0].id;
    }
    
    const tenancyResult = await client.query(
      'INSERT INTO tenancies (unit_id, tenant_id, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
      [unit_id, tenantId, start_date, end_date]
    );

    await client.query('UPDATE units SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['occupied', unit_id]);
    
    await client.query('COMMIT');
    
    const tenant = { id: tenantId, email, fullName: full_name, role: 'tenant' };
    const tenancy = tenancyResult.rows[0];
    res.json({ tenant, tenancy });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create tenant error:', err);
    res.status(500).json({ error: 'Failed to create tenant' });
  } finally {
    client.release();
  }
});

// Assign an existing (unregistered) tenant to a unit/flat
app.post('/api/tenants/assign', async (req, res) => {
  const { tenant_id, unit_id, start_date, end_date } = req.body || {};

  if (!tenant_id || !unit_id || !start_date) {
    return res.status(400).json({ error: 'tenant_id, unit_id and start_date are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tenant = await client.query('SELECT id FROM users WHERE id = $1 AND role = $2', [tenant_id, 'tenant']);
    if (tenant.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const unit = await client.query('SELECT id, status FROM units WHERE id = $1', [unit_id]);
    if (unit.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unit not found' });
    }

    if (unit.rows[0].status === 'occupied') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Selected unit is already occupied' });
    }

    // End any previous active tenancy for this tenant before creating a new one.
    await client.query(
      'UPDATE tenancies SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE tenant_id = $1 AND is_active = true',
      [tenant_id]
    );

    const tenancyResult = await client.query(
      'INSERT INTO tenancies (unit_id, tenant_id, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, true) RETURNING *',
      [unit_id, tenant_id, start_date, end_date || null]
    );

    await client.query('UPDATE units SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['occupied', unit_id]);

    await client.query('COMMIT');
    return res.json({ tenancy: tenancyResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign tenant error:', err);
    return res.status(500).json({ error: 'Failed to assign tenant to unit' });
  } finally {
    client.release();
  }
});

// File upload endpoint with enhanced error handling
app.post('/api/upload', upload.array('files', 5), (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Files:', req.files);
    console.log('Body:', req.body);

    if (!req.files || req.files.length === 0) {
      console.error('No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const fileData = req.files.map(file => {
      const fileInfo = {
        name: file.originalname,
        url: `/uploads/${file.filename}`,
        size: file.size,
        type: file.mimetype
      };
      console.log('Processed file:', fileInfo);
      return fileInfo;
    });

    console.log('Upload successful:', fileData);
    res.json({ files: fileData, success: true });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload files', 
      details: error.message 
    });
  }
});

// Extract text from uploaded attachments (PDF/TXT) for AI summarization
app.post('/api/files/extract-text', async (req, res) => {
  const { attachments } = req.body || {};

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return res.status(400).json({ error: 'attachments array is required' });
  }

  try {
    const extracted = [];

    for (const attachment of attachments) {
      const url = attachment?.url;
      const name = attachment?.name || 'file';
      const mimeType = attachment?.type || '';

      if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
        continue;
      }

      const safeFileName = path.basename(url);
      const filePath = path.join(uploadsDir, safeFileName);

      if (!fs.existsSync(filePath)) {
        continue;
      }

      const isPdf = mimeType.includes('pdf') || name.toLowerCase().endsWith('.pdf');
      const isDoc = mimeType.includes('word') || name.toLowerCase().endsWith('.doc') || name.toLowerCase().endsWith('.docx');
      const isTxt = mimeType.includes('text/plain') || name.toLowerCase().endsWith('.txt');

      if (isPdf || isDoc) {
        let rawText = '';

        if (isPdf) {
          if (!PDFParseClass) {
            PDFParseClass = (await import('pdf-parse')).PDFParse;
          }
          const buffer = await fs.promises.readFile(filePath);
          const parser = new PDFParseClass({ data: buffer });
          const parsed = await parser.getText();
          await parser.destroy();
          rawText = (parsed?.text || '').trim();
        } else if (name.toLowerCase().endsWith('.docx')) {
          const mammoth = await import('mammoth');
          const parsed = await mammoth.extractRawText({ path: filePath });
          rawText = String(parsed?.value || '').trim();
        }

        if (rawText) {
          const maxChars = Number.isFinite(EXTRACT_MAX_CHARS) ? EXTRACT_MAX_CHARS : 120000;
          extracted.push({
            name,
            type: isPdf ? 'pdf' : 'doc',
            text: rawText.slice(0, maxChars),
            truncated: rawText.length > maxChars,
          });
        }
        continue;
      }

      if (isTxt) {
        const rawText = (await fs.promises.readFile(filePath, 'utf8')).trim();
        if (rawText) {
          const maxChars = 20000;
          extracted.push({
            name,
            type: 'txt',
            text: rawText.slice(0, maxChars),
            truncated: rawText.length > maxChars,
          });
        }
      }
    }

    return res.json({ files: extracted });
  } catch (error) {
    console.error('Extract text error:', error);
    return res.status(500).json({ error: 'Failed to extract file text' });
  }
});

// Add error handling for multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 5 files.' });
    }
    return res.status(400).json({ error: error.message });
  }
  
  if (error.message && error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }

  next(error);
});

// Conversations endpoints
app.get('/api/conversations', async (req, res) => {
  const userId = req.query.userId;
  const userEmail = req.query.userEmail;

  if (!userId && !userEmail) {
    return res.status(400).json({ error: 'userId or userEmail is required' });
  }
  
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.participants,
        c.subject,
        c.created_at,
        c.updated_at,
        lm.content AS last_message
      FROM conversations c
      LEFT JOIN LATERAL (
        SELECT m.content
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) lm ON true
      WHERE (($1::text) IS NOT NULL AND ($1::text) = ANY(c.participants))
        OR (($2::text) IS NOT NULL AND ($2::text) = ANY(c.participants))
      ORDER BY c.updated_at DESC
     `, [userId || null, userEmail || null]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

app.post('/api/conversations', async (req, res) => {
  const { participants, subject } = req.body;

  // Backward-compatible payload normalization:
  // - New format: { participants: [userA, userB], subject }
  // - Legacy/broken format seen in clients: { participants: userA, subject: userB }
  const normalizedParticipants = [];
  let normalizedSubject = typeof subject === 'string' ? subject : 'Conversation';

  if (Array.isArray(participants)) {
    normalizedParticipants.push(...participants);
  } else if (typeof participants === 'string' && participants.trim()) {
    normalizedParticipants.push(participants.trim());

    if (typeof subject === 'string' && subject.trim() && (looksLikeUuid(subject) || subject.includes('@'))) {
      normalizedParticipants.push(subject.trim());
      normalizedSubject = 'Conversation';
    }
  }

  const uniqueParticipants = [...new Set(normalizedParticipants.filter((p) => typeof p === 'string' && p.trim()))];

  if (uniqueParticipants.length < 2) {
    return res.status(400).json({
      error: 'participants must contain at least two user identifiers',
    });
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO conversations (participants, subject) VALUES ($1, $2) RETURNING *',
      [uniqueParticipants, normalizedSubject]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Messages endpoints
app.get('/api/messages', async (req, res) => {
  const conversationId = req.query.conversationId;
  
  try {
    const result = await pool.query(
      'SELECT id, conversation_id, sender_id, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/messages', async (req, res) => {
  const { conversation_id, sender_id, content, attachments } = req.body;
  
  const client = await pool.connect();
  try {
    const resolvedSenderId = await resolveOrCreateUserId(client, sender_id, 'tenant');

    const attachmentsJson = attachments && Array.isArray(attachments) ? JSON.stringify(attachments) : '[]';

    const conversationResult = await client.query(
      'SELECT id, participants FROM conversations WHERE id = $1',
      [conversation_id]
    );

    if (conversationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversationResult.rows[0];

    const result = await pool.query(
      'INSERT INTO messages (conversation_id, sender_id, content, attachments) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversation_id, resolvedSenderId, content, attachmentsJson]
    );

    await pool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversation_id]
    );

    const senderAliases = await resolveUserIdentifiers(client, sender_id);
    senderAliases.push(String(resolvedSenderId));
    const senderAliasSet = new Set(senderAliases.map((v) => String(v)));

    const recipients = (conversation.participants || []).filter(
      (participant) => !senderAliasSet.has(String(participant))
    );

    for (const recipientIdentifier of recipients) {
      try {
        const recipientId = await resolveOrCreateUserId(client, recipientIdentifier, 'tenant');
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id, is_read)
           VALUES ($1, $2, $3, $4, $5, false)`,
          [recipientId, 'New Message', String(content || 'You have a new message').slice(0, 240), 'message', conversation_id]
        );
      } catch (notifyError) {
        console.error('Create message notification error:', notifyError);
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create message error:', err);
    res.status(500).json({ error: 'Failed to create message' });
  } finally {
    client.release();
  }
});

// Property inquiry endpoint - creates DB message and owner notification
app.post('/api/property-inquiries', async (req, res) => {
  const { unit_id, tenant_id, content, unit_number, property_name, attachments } = req.body;

  if ((!unit_id && !unit_number) || !tenant_id || !content) {
    return res.status(400).json({ error: 'unit_id or unit_number, tenant_id, and content are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let unitResult = { rows: [] };
    if (unit_id && looksLikeUuid(unit_id)) {
      unitResult = await client.query(`
      SELECT
        u.id AS unit_id,
        u.unit_number,
        p.id AS property_id,
        p.name AS property_name,
        p.owner_id,
        owner.full_name AS owner_full_name,
        owner.email AS owner_email
      FROM units u
      JOIN properties p ON p.id = u.property_id
      JOIN users owner ON owner.id = p.owner_id
      WHERE u.id = $1
    `, [unit_id]);
    }

    if (unitResult.rows.length === 0 && unit_number) {
      unitResult = await client.query(`
        SELECT
          u.id AS unit_id,
          u.unit_number,
          p.id AS property_id,
          p.name AS property_name,
          p.owner_id,
          owner.full_name AS owner_full_name,
          owner.email AS owner_email
        FROM units u
        JOIN properties p ON p.id = u.property_id
        JOIN users owner ON owner.id = p.owner_id
        WHERE u.unit_number = $1
        ORDER BY u.created_at DESC
        LIMIT 1
      `, [unit_number]);
    }

    let unitData;
    if (unitResult.rows.length === 0) {
      const ownerFallback = await client.query(
        `SELECT id, full_name, email FROM users WHERE role = 'owner' ORDER BY created_at ASC LIMIT 1`
      );
      if (ownerFallback.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'No property owner found to receive inquiry' });
      }

      unitData = {
        unit_id: null,
        unit_number: unit_number || 'Unknown Unit',
        property_id: null,
        property_name: property_name || 'Property Inquiry',
        owner_id: ownerFallback.rows[0].id,
        owner_full_name: ownerFallback.rows[0].full_name,
        owner_email: ownerFallback.rows[0].email,
      };
    } else {
      unitData = unitResult.rows[0];
    }

    const ownerId = unitData.owner_id;
    const resolvedTenantId = await resolveOrCreateUserId(client, tenant_id, 'tenant');

    const subject = `Property Inquiry: ${unitData.unit_number} - ${unitData.property_name}`;

    let conversationResult = await client.query(
      `SELECT id, participants, subject, created_at, updated_at
       FROM conversations
       WHERE $1 = ANY(participants)
         AND $2 = ANY(participants)
         AND subject = $3
       ORDER BY updated_at DESC
       LIMIT 1`,
      [tenant_id, ownerId, subject]
    );

    if (conversationResult.rows.length === 0) {
      conversationResult = await client.query(
        `SELECT id, participants, subject, created_at, updated_at
         FROM conversations
         WHERE $1 = ANY(participants)
           AND $2 = ANY(participants)
           AND subject = $3
         ORDER BY updated_at DESC
         LIMIT 1`,
        [resolvedTenantId, ownerId, subject]
      );
    }

    let conversation;
    if (conversationResult.rows.length === 0) {
      const participantSet = Array.from(new Set([tenant_id, resolvedTenantId, ownerId].filter(Boolean)));
      const insertedConversation = await client.query(
        'INSERT INTO conversations (participants, subject) VALUES ($1, $2) RETURNING *',
        [participantSet, subject]
      );
      conversation = insertedConversation.rows[0];
    } else {
      conversation = conversationResult.rows[0];
    }

    const messageResult = await client.query(
      'INSERT INTO messages (conversation_id, sender_id, content, attachments) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversation.id, resolvedTenantId, content, JSON.stringify(attachments || [])]
    );

    await client.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversation.id]
    );

    const notificationText = `New inquiry for ${unitData.property_name} (${unitData.unit_number})`;
    const notificationResult = await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, is_read)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [ownerId, 'New Property Inquiry', notificationText, 'property_inquiry', conversation.id]
    );

    await client.query('COMMIT');

    res.json({
      conversation,
      message: messageResult.rows[0],
      notification: notificationResult.rows[0],
      owner: {
        id: ownerId,
        full_name: unitData.owner_full_name,
        email: unitData.owner_email,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Property inquiry error:', err);
    res.status(500).json({ error: 'Failed to send property inquiry' });
  } finally {
    client.release();
  }
});

app.get('/api/notifications', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const identifiers = await resolveUserIdentifiers(pool, userId);
    if (identifiers.length === 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT id, user_id, title, message, type, reference_id, is_read, created_at
       FROM notifications
       WHERE user_id::text = ANY($1::text[])
       ORDER BY created_at DESC
       LIMIT 50`,
      [identifiers]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.patch('/api/notifications/:id/read', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

// Payments endpoints
app.get('/api/payments', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
  
  try {
    const result = await pool.query(
      'SELECT id, tenant_id, unit_id, amount, payment_date, status, created_at FROM rent_payments WHERE tenant_id = $1',
      [tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/payments', async (req, res) => {
  const { tenant_id, unit_id, amount, payment_date, status } = req.body;
  
  try {
    const result = await pool.query(
      'INSERT INTO rent_payments (tenant_id, unit_id, amount, payment_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [tenant_id, unit_id, amount, payment_date, status || 'pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

app.patch('/api/payments', async (req, res) => {
  const { id, status, payment_date } = req.body;
  if (!id) return res.status(400).json({ error: 'id required' });
  
  try {
    const result = await pool.query(
      'UPDATE rent_payments SET status = COALESCE($1, status), payment_date = COALESCE($2, payment_date) WHERE id = $3 RETURNING *',
      [status, payment_date, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Maintenance endpoints
app.post('/api/maintenance', async (req, res) => {
  const { tenant_id, unit_id, title, description, status, category, priority, photo } = req.body;

  if (!tenant_id || !unit_id || !title) {
    return res.status(400).json({ error: 'tenant_id, unit_id, and title are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resolvedTenantId = await resolveOrCreateUserId(client, tenant_id, 'tenant');

    const unitLookup = await client.query(
      `SELECT u.id, p.owner_id, p.name AS property_name, u.unit_number
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE u.id = $1`,
      [unit_id]
    );

    if (unitLookup.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unit not found' });
    }

    const unitData = unitLookup.rows[0];

    const result = await client.query(
      `INSERT INTO maintenance_requests
       (tenant_id, unit_id, title, description, status, category, priority, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        resolvedTenantId,
        unit_id,
        title,
        description || '',
        status || 'pending',
        category || 'general',
        priority || 'medium',
        photo || null,
      ]
    );

    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, is_read)
       VALUES ($1, $2, $3, $4, $5, false)`,
      [
        unitData.owner_id,
        'New Maintenance Request',
        `Unit ${unitData.unit_number} (${unitData.property_name}) has a new maintenance request: ${title}`,
        'maintenance',
        result.rows[0].id,
      ]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create maintenance request error:', err);
    res.status(500).json({ error: 'Failed to create maintenance request' });
  } finally {
    client.release();
  }
});

app.get('/api/maintenance', async (req, res) => {
  const userId = req.query.userId;
  const role = req.query.role;
  
  try {
    if (role === 'manager') {
      const result = await pool.query(
        `SELECT mr.id, mr.tenant_id, mr.unit_id, mr.title, mr.description, mr.status, mr.category, mr.priority, mr.photo, mr.created_at, mr.updated_at,
                u.unit_number,
                p.name AS property_name,
                tenant.full_name AS tenant_name,
                tenant.email AS tenant_email
         FROM maintenance_requests mr
         JOIN units u ON mr.unit_id = u.id
         JOIN properties p ON u.property_id = p.id
         JOIN users tenant ON mr.tenant_id = tenant.id
         ORDER BY mr.created_at DESC`
      );
      return res.json(result.rows);
    }

    if (role === 'owner') {
      const ownerIdentifiers = await resolveUserIdentifiers(pool, userId);
      if (ownerIdentifiers.length === 0) {
        return res.json([]);
      }

      const result = await pool.query(
        `SELECT mr.id, mr.tenant_id, mr.unit_id, mr.title, mr.description, mr.status, mr.category, mr.priority, mr.photo, mr.created_at, mr.updated_at,
                u.unit_number,
                p.name AS property_name,
                tenant.full_name AS tenant_name,
                tenant.email AS tenant_email
         FROM maintenance_requests mr
         JOIN units u ON mr.unit_id = u.id
         JOIN properties p ON u.property_id = p.id
         JOIN users tenant ON mr.tenant_id = tenant.id
         WHERE p.owner_id::text = ANY($1::text[])
         ORDER BY mr.created_at DESC`,
        [ownerIdentifiers]
      );
      return res.json(result.rows);
    }

    const tenantIdentifiers = await resolveUserIdentifiers(pool, userId);
    if (tenantIdentifiers.length === 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT mr.id, mr.tenant_id, mr.unit_id, mr.title, mr.description, mr.status, mr.category, mr.priority, mr.photo, mr.created_at, mr.updated_at,
              u.unit_number,
              p.name AS property_name
       FROM maintenance_requests mr
       JOIN units u ON mr.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE mr.tenant_id::text = ANY($1::text[])
       ORDER BY mr.created_at DESC`,
      [tenantIdentifiers]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get maintenance requests error:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance requests' });
  }
});

app.post('/api/tour-requests', async (req, res) => {
  const { unit_id, tenant_id, name, email, phone, date, time, note } = req.body || {};

  if (!unit_id || !tenant_id || !date || !time) {
    return res.status(400).json({ error: 'unit_id, tenant_id, date and time are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resolvedTenantId = await resolveOrCreateUserId(client, tenant_id, 'tenant', name || null);

    const unitDataResult = await client.query(
      `SELECT u.id AS unit_id, u.unit_number, p.id AS property_id, p.name AS property_name, p.owner_id
       FROM units u
       JOIN properties p ON p.id = u.property_id
       WHERE u.id = $1`,
      [unit_id]
    );

    if (unitDataResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Unit not found' });
    }

    const unitData = unitDataResult.rows[0];
    const ownerId = unitData.owner_id;

    const subject = `Tour Request: ${unitData.property_name} - Unit ${unitData.unit_number}`;
    let conversationResult = await client.query(
      `SELECT id FROM conversations
       WHERE $1 = ANY(participants) AND $2 = ANY(participants) AND subject = $3
       ORDER BY updated_at DESC LIMIT 1`,
      [resolvedTenantId, ownerId, subject]
    );

    let conversationId;
    if (conversationResult.rows.length > 0) {
      conversationId = conversationResult.rows[0].id;
    } else {
      const createdConversation = await client.query(
        'INSERT INTO conversations (participants, subject) VALUES ($1, $2) RETURNING id',
        [[resolvedTenantId, ownerId], subject]
      );
      conversationId = createdConversation.rows[0].id;
    }

    const details = [
      `Tour request for ${unitData.property_name} (Unit ${unitData.unit_number})`,
      `Preferred date: ${date}`,
      `Preferred time: ${time}`,
      name ? `Tenant name: ${name}` : null,
      email ? `Email: ${email}` : null,
      phone ? `Phone: ${phone}` : null,
      note ? `Note: ${note}` : null,
    ].filter(Boolean).join('\n');

    const messageResult = await client.query(
      'INSERT INTO messages (conversation_id, sender_id, content, attachments) VALUES ($1, $2, $3, $4) RETURNING *',
      [conversationId, resolvedTenantId, details, JSON.stringify([])]
    );

    await client.query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [conversationId]);

    const notificationResult = await client.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id, is_read)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`,
      [
        ownerId,
        'New Tour Request',
        `${name || 'A tenant'} requested a tour for ${unitData.property_name} - Unit ${unitData.unit_number}`,
        'tour_request',
        conversationId,
      ]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      conversation_id: conversationId,
      message: messageResult.rows[0],
      notification: notificationResult.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create tour request error:', err);
    return res.status(500).json({ error: 'Failed to create tour request' });
  } finally {
    client.release();
  }
});

app.get('/api/favorites', async (req, res) => {
  const tenantId = req.query.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  try {
    const tenantIdentifiers = await resolveUserIdentifiers(pool, tenantId);
    if (tenantIdentifiers.length === 0) {
      return res.json([]);
    }

    const result = await pool.query(
      `SELECT f.id, f.tenant_id, f.unit_id, f.created_at,
              u.unit_number, u.unit_type, u.bedrooms, u.bathrooms, u.area_sqft, u.rent_amount,
              p.name AS property_name, p.city, p.address
       FROM favorites f
       JOIN units u ON u.id = f.unit_id
       JOIN properties p ON p.id = u.property_id
       WHERE f.tenant_id::text = ANY($1::text[])
       ORDER BY f.created_at DESC`,
      [tenantIdentifiers]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', async (req, res) => {
  const { tenant_id, unit_id } = req.body || {};
  if (!tenant_id || !unit_id) {
    return res.status(400).json({ error: 'tenant_id and unit_id are required' });
  }

  const client = await pool.connect();
  try {
    const resolvedTenantId = await resolveOrCreateUserId(client, tenant_id, 'tenant');
    const result = await client.query(
      `INSERT INTO favorites (tenant_id, unit_id)
       VALUES ($1, $2)
       ON CONFLICT (tenant_id, unit_id) DO NOTHING
       RETURNING *`,
      [resolvedTenantId, unit_id]
    );
    res.json(result.rows[0] || { tenant_id: resolvedTenantId, unit_id });
  } catch (err) {
    console.error('Create favorite error:', err);
    res.status(500).json({ error: 'Failed to create favorite' });
  } finally {
    client.release();
  }
});

app.delete('/api/favorites', async (req, res) => {
  const { tenant_id, unit_id } = req.body || {};
  if (!tenant_id || !unit_id) {
    return res.status(400).json({ error: 'tenant_id and unit_id are required' });
  }

  const client = await pool.connect();
  try {
    const identifiers = await resolveUserIdentifiers(client, tenant_id);
    if (identifiers.length === 0) {
      return res.sendStatus(204);
    }
    await client.query(
      'DELETE FROM favorites WHERE unit_id = $1 AND tenant_id::text = ANY($2::text[])',
      [unit_id, identifiers]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error('Delete favorite error:', err);
    res.status(500).json({ error: 'Failed to delete favorite' });
  } finally {
    client.release();
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
