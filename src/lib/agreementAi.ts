export type AgreementPage = {
  num: number;
  section?: string;
  text: string;
};

export type DemoAgreementMeta = {
  id: string;
  title: string;
  subtitle: string;
  city: string;
  riskLevel: string;
  description: string;
};

export type ClauseHit = {
  title: string;
  originalText: string;
  page?: number | null;
  section?: string | null;
  risk?: 'typical' | 'elevated' | string;
  whyItMatters?: string;
};

export type AgreementAnalysis = {
  sourceName: string;
  pageCount: number;
  pages: AgreementPage[];
  engine: string;
  realAi: boolean;
  aiConfigured?: boolean;
  modelNote?: string;
  overallRisk?: string;
  disclaimer?: string;
  summary: {
    overview?: string;
    rent: string;
    securityDeposit: string;
    duration: string;
    noticePeriod: string;
    maintenance: string;
    renewal: string;
    termination: string;
  };
  clauses: ClauseHit[];
};

export type AgreementChatResult = {
  answer: string;
  found: boolean;
  realAi: boolean;
  engine: string;
  citations: Array<{ originalText: string; page?: number | null; section?: string | null }>;
  disclaimer?: string;
  modelNote?: string;
};

export type AgreementStatus = {
  aiConfigured: boolean;
  note: string;
};

export type AgreementTranslationPage = {
  num: number;
  section: string;
  text: string;
};

export type AgreementTranslation = {
  targetLanguage: string;
  targetLanguageName: string;
  pages: AgreementTranslationPage[];
  realAi: true;
  disclaimer: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function getAgreementStatus() {
  const response = await fetch('/api/agreements/status');
  return readJson<AgreementStatus>(response);
}

export async function listDemoAgreements() {
  const response = await fetch('/api/agreements/demo');
  return readJson<{ agreements: DemoAgreementMeta[] }>(response);
}

export async function extractAgreementFile(file: File) {
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/agreements/extract', { method: 'POST', body });
  return readJson<{ fileName: string; pageCount: number; pages: AgreementPage[]; fullText: string }>(response);
}

export async function analyzeAgreement(payload: {
  demoId?: string;
  pages?: AgreementPage[];
  language?: string;
  sourceName?: string;
}) {
  const response = await fetch('/api/agreements/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJson<AgreementAnalysis>(response);
}

export async function askAgreementQuestion(payload: {
  demoId?: string;
  pages?: AgreementPage[];
  question: string;
  language?: string;
}) {
  const response = await fetch('/api/agreements/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJson<AgreementChatResult>(response);
}

export async function translateAgreement(payload: {
  demoId?: string;
  pages?: AgreementPage[];
  targetLanguage: string;
}) {
  const response = await fetch('/api/agreements/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJson<AgreementTranslation>(response);
}
