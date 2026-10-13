import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  FileText,
  Languages,
  Loader2,
  Scale,
  Sparkles,
  Upload,
  Download,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  analyzeAgreement,
  askAgreementQuestion,
  extractAgreementFile,
  getAgreementStatus,
  listDemoAgreements,
  translateAgreement,
  type AgreementAnalysis,
  type AgreementChatResult,
  type AgreementPage,
  type AgreementStatus,
  type AgreementTranslation,
  type DemoAgreementMeta,
} from '@/lib/agreementAi';
import { toast } from 'sonner';

const SAMPLE_QUESTIONS = [
  'Can my landlord increase the rent?',
  'What is the notice period?',
  'When will I get my security deposit back?',
];

const TRANSLATION_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'as', label: 'Assamese (অসমীয়া)' },
];

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] || character);
}

function openTranslationForPdf(sourceName: string, translation: AgreementTranslation) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const safeName = escapeHtml(sourceName || 'Rental agreement');
  const language = TRANSLATION_LANGUAGES.find((item) => item.code === translation.targetLanguage);
  const title = `${safeName} - ${language?.label || translation.targetLanguage}`;
  const sections = translation.pages.map((page) => `
    <section>
      <h2>${escapeHtml(page.section || `Page ${page.num}`)}</h2>
      <pre>${escapeHtml(page.text)}</pre>
    </section>
  `).join('');
  const direction = translation.targetLanguage === 'ur' ? 'rtl' : 'ltr';

  printWindow.document.write(`<!doctype html>
    <html lang="${escapeHtml(translation.targetLanguage)}" dir="${direction}">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { color: #172033; font: 12pt/1.65 Arial, "Noto Sans", sans-serif; }
          h1 { font-size: 20pt; margin: 0 0 4pt; }
          h2 { border-bottom: 1px solid #cbd5e1; font-size: 13pt; margin: 22pt 0 8pt; padding-bottom: 4pt; }
          .notice { color: #475569; font-size: 9pt; margin: 0 0 18pt; }
          pre { font: inherit; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
          section { break-inside: auto; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="notice">AI-generated translation. Check the original agreement before signing.</p>
        ${sections}
      </body>
    </html>`);
  printWindow.document.close();
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
  return true;
}

const persistRentalAssistantContext = (context: {
  sourceName?: string;
  pages?: AgreementPage[];
  summary?: AgreementAnalysis['summary'];
  aiGenerated?: boolean;
}) => {
  const payload = {
    ...context,
    lastUpdated: Date.now(),
  };
  localStorage.setItem('rentalAssistantContext', JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent('rental-assistant-context', { detail: payload }));
};

const AgreementsAI = () => {
  const { language } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<AgreementStatus | null>(null);
  const [demos, setDemos] = useState<DemoAgreementMeta[]>([]);
  const [pages, setPages] = useState<AgreementPage[] | null>(null);
  const [demoId, setDemoId] = useState<string | undefined>();
  const [sourceName, setSourceName] = useState('');
  const [analysis, setAnalysis] = useState<AgreementAnalysis | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>(language);
  const [translation, setTranslation] = useState<AgreementTranslation | null>(null);
  const [translationError, setTranslationError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState<Array<{ q: string; a: AgreementChatResult }>>([]);

  useEffect(() => {
    getAgreementStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
    listDemoAgreements()
      .then((data) => setDemos(data.agreements || []))
      .catch(() => toast.error('Could not load demo agreements'));
  }, []);

  const canChat = Boolean(pages?.length || demoId);

  const riskLabel = useMemo(() => {
    if (!analysis?.overallRisk) return null;
    return analysis.overallRisk === 'elevated' ? 'Elevated / unusual terms' : 'Typical terms';
  }, [analysis]);

  const runAnalyze = async (payload: {
    demoId?: string;
    pages?: AgreementPage[];
    sourceName?: string;
  }, languageOverride = targetLanguage, clearChat = true) => {
    setBusy('analyze');
    try {
      const result = await analyzeAgreement({ ...payload, language: languageOverride });
      setAnalysis(result);
      setPages(result.pages);
      setSourceName(result.sourceName);
      persistRentalAssistantContext({
        sourceName: result.sourceName,
        pages: result.pages,
        summary: result.summary,
        aiGenerated: result.realAi,
      });
      if (clearChat) setChat([]);
      toast.success(result.realAi ? 'AI summary ready' : 'Extractive summary ready');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setBusy(null);
    }
  };

  const handleUpload = async (file: File) => {
    const ok = /\.(pdf|docx|txt)$/i.test(file.name);
    if (!ok) {
      toast.error('Please upload a PDF, DOCX, or TXT file');
      return;
    }
    setBusy('extract');
    setDemoId(undefined);
    setTranslation(null);
    setTranslationError('');
    try {
      const extracted = await extractAgreementFile(file);
      setPages(extracted.pages);
      setSourceName(extracted.fileName);
      persistRentalAssistantContext({
        sourceName: extracted.fileName,
        pages: extracted.pages,
        aiGenerated: false,
      });
      toast.success(`Extracted ${extracted.pageCount} page${extracted.pageCount === 1 ? '' : 's'}`);
      await runAnalyze({ pages: extracted.pages, sourceName: extracted.fileName });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read that file');
      setBusy(null);
    }
  };

  const handleDemo = (id: string) => {
    setDemoId(id);
    setTranslation(null);
    setTranslationError('');
    runAnalyze({ demoId: id });
  };

  const handleLanguageChange = (nextLanguage: string) => {
    if (nextLanguage === targetLanguage) return;
    setTargetLanguage(nextLanguage);
    setTranslation(null);
    setTranslationError('');
    if (analysis && status?.aiConfigured) {
      void runAnalyze(
        { demoId, pages: demoId ? undefined : pages || undefined, sourceName },
        nextLanguage,
        false,
      );
    }
  };

  const handleTranslate = async () => {
    if (!pages?.length && !demoId) {
      setTranslationError('Upload an agreement or load a demo before translating.');
      return;
    }
    setBusy('translate');
    setTranslationError('');
    try {
      const result = await translateAgreement({
        demoId,
        pages: demoId ? undefined : pages || undefined,
        targetLanguage,
      });
      if (!result.realAi || !result.pages.length ||
          result.pages.some((page) => typeof page.text !== 'string' || !page.text.trim())) {
        throw new Error('The translation response was incomplete. No translation was displayed.');
      }
      setTranslation(result);
      toast.success('Complete agreement translation is ready');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Agreement translation failed';
      setTranslationError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  const handleAsk = async (event?: FormEvent, preset?: string) => {
    event?.preventDefault();
    const nextQuestion = (preset || question).trim();
    if (!nextQuestion) return;
    if (!canChat) {
      toast.error('Load a demo or upload an agreement first');
      return;
    }
    setBusy('chat');
    try {
      const result = await askAgreementQuestion({
        demoId,
        pages: demoId ? undefined : pages || undefined,
        question: nextQuestion,
        language: targetLanguage,
      });
      setChat((prev) => [...prev, { q: nextQuestion, a: result }]);
      setQuestion('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chat failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-2">Lease intelligence</p>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            Agreements AI
          </h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Upload a rental agreement or load a fictional demo. The app extracts text, summarizes key money and exit
            terms, flags unusual clauses, and answers questions with citations. This is a legal-information assistant,
            not a substitute for a lawyer.
          </p>
        </motion.div>

        <GlassCard className="p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className={cn('px-3 py-1.5 rounded-lg text-sm font-medium w-fit', status?.aiConfigured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200')}>
              {status?.aiConfigured ? 'AI-generated summaries and answers enabled' : 'Rule-based demo mode (AI service not configured)'}
            </div>
            <p className="text-sm text-muted-foreground">{status?.note}</p>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard className="p-6 lg:col-span-1 space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload agreement
            </h2>
            <p className="text-sm text-muted-foreground">PDF or DOCX. Text is extracted on the server, then summarized.</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn-primary w-full"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
            >
              {busy === 'extract' ? 'Reading file…' : 'Choose PDF or DOCX'}
            </button>
            {sourceName && (
              <p className="text-xs text-muted-foreground">Loaded: {sourceName}{demoId ? ' (demo)' : ''}</p>
            )}
          </GlassCard>

          <GlassCard className="p-6 lg:col-span-2 space-y-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent" />
              Demo data for your professor
            </h2>
            <p className="text-sm text-muted-foreground">
              Three fictional Indian leases. Use Campus View to show risky clauses and Sunrise for a more typical lease.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {demos.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleDemo(demo.id)}
                  disabled={busy !== null}
                  className={cn(
                    'text-left p-4 rounded-xl border transition-colors',
                    demoId === demo.id ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                  )}
                >
                  <p className="font-medium text-sm">{demo.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{demo.subtitle}</p>
                  <span className={cn('inline-block mt-2 text-[11px] px-2 py-0.5 rounded', demo.riskLevel === 'elevated' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/15 text-emerald-200')}>
                    {demo.riskLevel}
                  </span>
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <Languages className="w-5 h-5 text-primary" />
                Translate complete agreement
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Translate the extracted agreement text without changing the original file. Summaries and future questions use the selected language where available.
              </p>
            </div>
            {translation && (
              <button
                type="button"
                className="btn-ghost inline-flex items-center gap-2"
                onClick={() => {
                  if (!openTranslationForPdf(sourceName, translation)) {
                    toast.error('Allow pop-ups to print or save the translated agreement as PDF.');
                  }
                }}
              >
                <Download className="w-4 h-4" />
                Print / Save PDF
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 space-y-1.5">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Select language</span>
              <select
                className="input-glass w-full"
                value={targetLanguage}
                onChange={(event) => handleLanguageChange(event.target.value)}
                disabled={busy !== null}
              >
                {TRANSLATION_LANGUAGES.map((item) => (
                  <option key={item.code} value={item.code}>{item.label}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
                onClick={handleTranslate}
                disabled={!canChat || busy !== null}
              >
                {busy === 'translate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                {busy === 'translate' ? 'Translating…' : 'Translate Agreement'}
              </button>
            </div>
          </div>
          {busy === 'translate' && (
            <div className="space-y-2" role="status" aria-live="polite">
              <p className="text-sm text-muted-foreground">
                Translating the complete agreement in order. Longer documents may take more time; the original remains unchanged.
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          )}
          {translationError && (
            <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
              Translation failed: {translationError}
            </p>
          )}
          {translation && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Original agreement ↔ {TRANSLATION_LANGUAGES.find((item) => item.code === translation.targetLanguage)?.label}
                </p>
                <span className="rounded-lg bg-primary/15 px-2 py-1 text-xs text-primary">AI-generated translation</span>
              </div>
              {translation.pages.map((translatedPage, index) => {
                const originalPage = pages?.[index];
                return (
                  <div key={`${translatedPage.num}-${index}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <section className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Original · {originalPage?.section || `Page ${originalPage?.num ?? translatedPage.num}`}
                      </h3>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{originalPage?.text || ''}</p>
                    </section>
                    <section
                      className="min-w-0 rounded-xl border border-primary/20 bg-primary/[0.04] p-4"
                      dir={translation.targetLanguage === 'ur' ? 'rtl' : 'auto'}
                    >
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {translation.targetLanguageName} · {translatedPage.section}
                      </h3>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{translatedPage.text}</p>
                    </section>
                  </div>
                );
              })}
              <p className="text-xs text-amber-200">{translation.disclaimer}</p>
            </div>
          )}
        </GlassCard>

        {busy === 'analyze' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing agreement…
          </div>
        )}

        {analysis && (
          <>
            <GlassCard className="p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold">AI summary</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn('px-2 py-1 rounded-lg', analysis.realAi ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted-foreground')}>
                    {analysis.realAi ? 'Generative AI' : 'Extractive / heuristic'}
                  </span>
                  {riskLabel && (
                    <span className={cn('px-2 py-1 rounded-lg', analysis.overallRisk === 'elevated' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/15 text-emerald-200')}>
                      {riskLabel}
                    </span>
                  )}
                </div>
              </div>
              {analysis.modelNote && <p className="text-xs text-muted-foreground">{analysis.modelNote}</p>}
              {analysis.summary.overview && <p className="text-sm leading-relaxed">{analysis.summary.overview}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  ['Rent', analysis.summary.rent],
                  ['Security deposit', analysis.summary.securityDeposit],
                  ['Duration', analysis.summary.duration],
                  ['Notice period', analysis.summary.noticePeriod],
                  ['Maintenance', analysis.summary.maintenance],
                  ['Renewal', analysis.summary.renewal],
                  ['Termination', analysis.summary.termination],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted/30 border border-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-sm mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                Important and unusual clauses
              </h2>
              <div className="space-y-3">
                {analysis.clauses.map((clause, index) => (
                  <div key={`${clause.title}-${index}`} className="rounded-xl border border-white/10 p-4 bg-white/5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{clause.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {clause.section ? `${clause.section}` : 'Section n/a'}
                        {clause.page != null ? ` · p.${clause.page}` : ''}
                      </p>
                    </div>
                    <blockquote className="text-sm text-muted-foreground mt-2 border-l-2 border-primary/40 pl-3">
                      {clause.originalText}
                    </blockquote>
                    {clause.whyItMatters && <p className="text-xs mt-2">{clause.whyItMatters}</p>}
                  </div>
                ))}
              </div>
            </GlassCard>
          </>
        )}

        <GlassCard className="p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-secondary" />
            Ask about this agreement
          </h2>
          <p className="text-sm text-muted-foreground">Answers use only the loaded document and should cite the clause.</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                className="btn-ghost text-sm py-2 px-3"
                disabled={!canChat || busy !== null}
                onClick={() => handleAsk(undefined, item)}
              >
                {item}
              </button>
            ))}
          </div>
          <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-3">
            <input
              className="input-glass flex-1"
              placeholder="Ask a question about the loaded lease…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={!canChat || busy !== null}
            />
            <button type="submit" className="btn-primary" disabled={!canChat || busy !== null}>
              {busy === 'chat' ? 'Thinking…' : 'Ask'}
            </button>
          </form>
          <div className="space-y-3">
            {chat.map((turn, index) => (
              <div key={`${turn.q}-${index}`} className="rounded-xl bg-muted/20 border border-white/5 p-4 space-y-2">
                <p className="text-sm font-medium">{turn.q}</p>
                <p className="text-sm text-muted-foreground">{turn.a.answer}</p>
                <p className="text-[11px] text-muted-foreground">
                  {turn.a.realAi ? 'Generative AI' : 'Heuristic match'} · {turn.a.found ? 'Cited from document' : 'Not found'}
                </p>
                {turn.a.citations?.map((cite, citeIndex) => (
                  <blockquote key={citeIndex} className="text-xs border-l-2 border-accent/40 pl-3 text-muted-foreground">
                    {cite.originalText}
                    <span className="block mt-1 opacity-70">
                      {cite.section || 'Clause'}{cite.page != null ? ` · p.${cite.page}` : ''}
                    </span>
                  </blockquote>
                ))}
              </div>
            ))}
          </div>
        </GlassCard>

        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Scale className="w-4 h-4" />
          {analysis?.disclaimer ||
            'Legal-information assistant for demonstration. Not legal advice and not a substitute for a lawyer.'}
        </p>
      </div>
    </DashboardLayout>
  );
};

export default AgreementsAI;
