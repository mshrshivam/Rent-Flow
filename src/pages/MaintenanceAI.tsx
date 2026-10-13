import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, FileText, ImagePlus, IndianRupee, Loader2, MapPin, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import { cn, formatINR } from '@/lib/utils';
import { toast } from 'sonner';
import type { AgreementPage } from '@/lib/agreementAi';
import {
  analyzeDamagePhoto,
  getMaintenanceAiStatus,
  type MaintenanceAiStatus,
  type MaintenanceDamageAnalysis,
} from '@/lib/maintenanceAi';

type SavedAgreementContext = {
  sourceName?: string;
  pages?: AgreementPage[];
};

const loadAgreementContext = (): SavedAgreementContext | null => {
  try {
    const stored = localStorage.getItem('rentalAssistantContext');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as SavedAgreementContext;
    return Array.isArray(parsed.pages) && parsed.pages.length ? parsed : null;
  } catch {
    return null;
  }
};

const severityStyles: Record<MaintenanceDamageAnalysis['severity'], string> = {
  low: 'bg-emerald-500/15 text-emerald-300',
  moderate: 'bg-amber-500/15 text-amber-200',
  high: 'bg-orange-500/15 text-orange-200',
  urgent: 'bg-destructive/20 text-destructive',
  unclear: 'bg-muted text-muted-foreground',
};

const formatCost = (value: number | null) => value == null ? 'Not available' : formatINR(value);

export default function MaintenanceAI() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<MaintenanceAiStatus | null>(null);
  const [agreement, setAgreement] = useState<SavedAgreementContext | null>(null);
  const [analysis, setAnalysis] = useState<MaintenanceDamageAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    getMaintenanceAiStatus()
      .then(setStatus)
      .catch((error: unknown) => {
        setStatus(null);
        setAnalysisError(error instanceof Error ? error.message : 'Could not check photo analysis setup. Ensure the backend is running.');
      });
    setAgreement(loadAgreementContext());
  }, []);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be 8 MB or smaller.');
      return;
    }
    setPhoto(file);
    setAnalysis(null);
    setAnalysisError(null);
    localStorage.removeItem('rentalMaintenanceAssistantContext');
    window.dispatchEvent(new CustomEvent('rental-maintenance-context', { detail: null }));
  };

  const handleAnalyze = async () => {
    if (!photo) {
      toast.error('Upload a photo first.');
      return;
    }
    if (!location.trim()) {
      toast.error('Enter the property city or PIN/postal code for the estimate.');
      return;
    }
    setBusy(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const result = await analyzeDamagePhoto({
        photo,
        location: location.trim(),
        agreementPages: agreement?.pages,
      });
      setAnalysis(result);
      const assistantContext = {
        analysis: result,
        agreementPages: agreement?.pages || [],
        sourceName: photo.name,
        lastUpdated: Date.now(),
      };
      localStorage.setItem('rentalMaintenanceAssistantContext', JSON.stringify(assistantContext));
      window.dispatchEvent(new CustomEvent('rental-maintenance-context', { detail: assistantContext }));
      toast.success(result.needsMoreInfo ? 'Photo reviewed — more details are needed' : 'Photo analysis ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photo analysis failed.';
      setAnalysisError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Maintenance intelligence
          </p>
          <h1 className="font-display text-3xl font-bold">AI Property Assistant</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Upload a clear photo to get cautious visual triage, possible repair steps, an indicative cost range, and a check of any uploaded maintenance clauses.
          </p>
        </div>

        <GlassCard className="p-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', status?.visionConfigured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200')}>
              {status?.visionConfigured ? 'Photo analysis ready' : 'Photo analysis setup required'}
            </span>
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">
              {status?.note || 'Checking photo analysis setup…'}
            </p>
          </div>
        </GlassCard>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard className="space-y-5 p-5 sm:p-6">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Camera className="h-5 w-5 text-primary" /> Upload damage photo
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">JPEG, PNG, or WebP · maximum 8 MB. Images are sent securely for analysis and are not saved by this endpoint.</p>
            </div>

            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-48 w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/[0.03] text-center transition hover:border-primary/50 hover:bg-primary/5"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Selected property damage preview" className="max-h-64 w-full object-contain" />
              ) : (
                <>
                  <ImagePlus className="mb-3 h-9 w-9 text-primary" />
                  <span className="font-medium">Choose a damage photo</span>
                  <span className="mt-1 text-xs text-muted-foreground">Broken fixtures, leaks, cracks, doors, or tiles</span>
                </>
              )}
            </button>
            {photo && <p className="truncate text-xs text-muted-foreground">Selected: {photo.name}</p>}

            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-accent" /> Property city or PIN/postal code</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="input-glass"
                placeholder="e.g. Pune or 411045"
                maxLength={100}
              />
            </label>

            <div className={cn('rounded-xl border p-3 text-sm', agreement?.pages?.length ? 'border-accent/30 bg-accent/5' : 'border-white/10 bg-white/[0.03]')}>
              <p className="flex items-center gap-2 font-medium">
                <FileText className="h-4 w-4 text-accent" />
                {agreement?.pages?.length ? `Agreement attached: ${agreement.sourceName || 'uploaded lease'}` : 'No agreement attached'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {agreement?.pages?.length
                  ? 'Maintenance and damage clauses will be checked. The assistant will not assign responsibility if the text is unclear.'
                  : 'Upload or select a demo agreement on the Agreements AI page to include responsibility clauses.'}
              </p>
            </div>

            {!status?.visionConfigured && (
              <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="font-semibold text-amber-100">Photo analysis is not configured yet</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-100/80">
                  Add the vision service credentials in <code className="rounded bg-black/20 px-1 py-0.5">server/.env</code>, then restart the backend.
                </p>
              </div>
            )}

            <button
              type="button"
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-all',
                busy || !status?.visionConfigured || !photo || !location.trim()
                  ? 'cursor-not-allowed border border-white/10 bg-muted/50 text-muted-foreground shadow-none'
                  : 'btn-primary'
              )}
              onClick={handleAnalyze}
              disabled={busy || !status?.visionConfigured || !photo || !location.trim()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? 'Analyzing photo…' : !status?.visionConfigured ? 'Photo analysis setup required' : !photo ? 'Upload a photo to continue' : !location.trim() ? 'Enter city or PIN to continue' : 'Analyze Damage'}
            </button>
            {status?.visionConfigured && !location.trim() && (
              <p className="text-xs text-muted-foreground">Enter the property's city or PIN/postal code to request the clearly labelled indicative estimate.</p>
            )}
          </GlassCard>

          {analysisError && (
            <GlassCard role="alert" className="border border-destructive/30 bg-destructive/5 p-5">
              <p className="font-semibold text-destructive">Photo analysis failed</p>
              <p className="mt-2 break-words text-sm text-muted-foreground">{analysisError}</p>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={busy || !photo || !location.trim() || !status?.visionConfigured}
                className="btn-ghost mt-4 px-4 py-2 text-sm"
              >
                Try again
              </button>
            </GlassCard>
          )}

          {analysis ? (
            <div className="space-y-5">
              <GlassCard className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Likely issue</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">{analysis.needsMoreInfo ? 'More information needed' : analysis.issue}</h2>
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold capitalize', severityStyles[analysis.severity])}>
                    {analysis.severity} severity
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">Photo Analysis</span>
                  <span>Confidence: {analysis.confidence}</span>
                  <span>Location: {analysis.location}</span>
                </div>

                {analysis.needsMoreInfo && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="flex items-center gap-2 font-medium text-amber-100"><AlertTriangle className="h-4 w-4" />The photo does not support a confident identification yet</p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {analysis.clarificationQuestions.map((question) => <li key={question}>{question}</li>)}
                    </ul>
                  </div>
                )}

                {analysis.visibleDamage.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Visible damage</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {analysis.visibleDamage.map((item) => <li key={item} className="flex gap-2"><span className="text-primary">•</span>{item}</li>)}
                    </ul>
                  </div>
                )}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold">Possible cause <span className="font-normal text-muted-foreground">(uncertain)</span></p>
                  <p className="mt-2 text-sm text-muted-foreground">{analysis.likelyCause}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{analysis.causeUncertainty}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />Immediate next step</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{analysis.immediateSafety}</p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4 text-primary" />Repair recommendation</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{analysis.repairAssessment}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {analysis.repairOrReplace === 'inspect_first' ? 'Technician inspection recommended before choosing repair or replacement.' : `Suggested approach: ${analysis.repairOrReplace.replace('_', ' ')}.`}
                    {analysis.professionalRequired ? ` Professional recommended: ${analysis.professionalType}.` : ''}
                  </p>
                </div>
                {analysis.partsMaterials.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Possible parts and materials</p>
                    <div className="flex flex-wrap gap-2">
                      {analysis.partsMaterials.map((part) => <span key={part} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">{part}</span>)}
                    </div>
                  </div>
                )}
              </GlassCard>

              <GlassCard className="space-y-4 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><IndianRupee className="h-5 w-5 text-accent" />Indicative repair estimate</h2>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Parts', analysis.costEstimate.partsLow, analysis.costEstimate.partsHigh],
                    ['Labour', analysis.costEstimate.laborLow, analysis.costEstimate.laborHigh],
                    ['Total', analysis.costEstimate.totalLow, analysis.costEstimate.totalHigh],
                  ].map(([label, low, high]) => (
                    <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={cn('mt-1 text-sm font-semibold', label === 'Total' && 'text-accent')}>
                        {low == null || high == null ? 'Unavailable' : `${formatCost(low as number)} – ${formatCost(high as number)}`}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{analysis.costEstimate.basis}</p>
                <p className="flex items-start gap-2 text-xs text-amber-100"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />This is an AI planning range, not a contractor quotation or verified local price. Get an on-site quote before authorizing work.</p>
              </GlassCard>

              <GlassCard className="space-y-3 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><FileText className="h-5 w-5 text-secondary" />Agreement responsibility check</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{analysis.agreementAssessment.explanation}</p>
                <p className="text-xs font-medium capitalize text-foreground/80">
                  Responsibility in text: {analysis.agreementAssessment.responsibility.replace('_', ' ')}
                </p>
                {analysis.agreementAssessment.citations.map((citation, index) => (
                  <blockquote key={`${citation.originalText}-${index}`} className="rounded-lg border-l-2 border-accent bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
                    “{citation.originalText}”
                    <span className="mt-1 block font-medium">{citation.section || 'Agreement clause'}{citation.page != null ? ` · Page ${citation.page}` : ''}</span>
                  </blockquote>
                ))}
              </GlassCard>

              <GlassCard className="p-4 text-xs leading-relaxed text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-accent" />Photo triage, not an inspection</p>
                <p className="mt-2">{analysis.disclaimer}</p>
                <p className="mt-1">AI can miss hidden damage. If there is active flooding, electrical exposure, structural movement, or immediate danger, keep clear and contact emergency maintenance or a qualified professional.</p>
              </GlassCard>
            </div>
          ) : (
            <GlassCard className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Camera className="h-7 w-7" /></div>
              <h2 className="font-display text-lg font-semibold">Your assessment will appear here</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">Add a well-lit photo and property location. The assistant will report only what it can reasonably identify and ask for more detail when the image is unclear.</p>
            </GlassCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
