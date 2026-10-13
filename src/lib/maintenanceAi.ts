import type { AgreementPage } from '@/lib/agreementAi';

export type MaintenanceDamageAnalysis = {
  realAi: boolean;
  engine: string;
  location: string;
  issue: string;
  visibleDamage: string[];
  likelyCause: string;
  causeUncertainty: string;
  severity: 'low' | 'moderate' | 'high' | 'urgent' | 'unclear';
  confidence: 'high' | 'medium' | 'low';
  needsMoreInfo: boolean;
  clarificationQuestions: string[];
  immediateSafety: string;
  repairAssessment: string;
  repairOrReplace: 'repair' | 'replace' | 'inspect_first' | 'unclear';
  partsMaterials: string[];
  professionalRequired: boolean;
  professionalType: string;
  costEstimate: {
    currency: 'INR';
    partsLow: number | null;
    partsHigh: number | null;
    laborLow: number | null;
    laborHigh: number | null;
    totalLow: number | null;
    totalHigh: number | null;
    basis: string;
  };
  agreementAssessment: {
    responsibility: 'tenant' | 'landlord' | 'shared' | 'unclear' | 'not_mentioned';
    explanation: string;
    citations: Array<{ originalText: string; page?: number | null; section?: string | null }>;
  };
  disclaimer: string;
};

export type MaintenanceAiStatus = {
  visionConfigured: boolean;
  textAiConfigured: boolean;
  note: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${response.status})`);
  }
  return data as T;
}

export async function getMaintenanceAiStatus() {
  const response = await fetch('/api/maintenance-ai/status');
  return readJson<MaintenanceAiStatus>(response);
}

export async function analyzeDamagePhoto(payload: {
  photo: File;
  location: string;
  agreementPages?: AgreementPage[];
}) {
  const body = new FormData();
  body.append('photo', payload.photo);
  body.append('location', payload.location);
  if (payload.agreementPages?.length) {
    body.append('agreementPages', JSON.stringify(payload.agreementPages));
  }
  const response = await fetch('/api/maintenance-ai/analyze', { method: 'POST', body });
  return readJson<MaintenanceDamageAnalysis>(response);
}

export async function askMaintenanceFollowUp(payload: {
  question: string;
  analysis: MaintenanceDamageAnalysis;
  agreementPages?: AgreementPage[];
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}) {
  const response = await fetch('/api/maintenance-ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return readJson<{
    answer: string;
    citations: Array<{ originalText: string; page?: number | null; section?: string | null }>;
    realAi: boolean;
    disclaimer?: string;
  }>(response);
}
