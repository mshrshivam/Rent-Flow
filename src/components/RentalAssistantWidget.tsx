import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  FileSearch,
  MessageSquareText,
  Minus,
  SendHorizonal,
  ShieldCheck,
  Sparkles,
  X,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AgreementPage = {
  num: number;
  section?: string;
  text: string;
};

type SummaryFields = {
  overview?: string;
  rent?: string;
  securityDeposit?: string;
  duration?: string;
  noticePeriod?: string;
  maintenance?: string;
  renewal?: string;
  termination?: string;
};

type AgreementContext = {
  sourceName?: string;
  pages?: AgreementPage[];
  summary?: SummaryFields;
  aiGenerated?: boolean;
  lastUpdated?: number;
};

type MaintenanceContext = {
  analysis: Record<string, unknown>;
  agreementPages?: AgreementPage[];
  sourceName?: string;
  lastUpdated?: number;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  source?: string;
  realAi?: boolean;
  citations?: Array<{ originalText: string; page?: number | null; section?: string | null }>;
};

const generalQuestions = [
  'What is a rental agreement?',
  'What is a security deposit?',
  'What is a notice period?',
  'What should I check before signing a rental agreement?',
  'Can you summarize my uploaded agreement?',
];

const agreementQuestions = [
  'Summarize this agreement',
  'What is the notice period?',
  'When is my deposit returned?',
  'Can the rent increase?',
  'Show me unusual clauses',
];

const maintenanceQuestions = [
  'What should I do first?',
  'Could this need a professional repair?',
  'How was the cost range estimated?',
  'Who is responsible under my agreement?',
];

const welcomeMessage = "Hi! I'm your Rental Assistant. How can I help you today?";

function loadAgreementContext(): AgreementContext | null {
  try {
    const raw = localStorage.getItem('rentalAssistantContext');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AgreementContext;
    return parsed && Array.isArray(parsed.pages) && parsed.pages.length ? parsed : null;
  } catch {
    return null;
  }
}

function loadMaintenanceContext(): MaintenanceContext | null {
  try {
    const raw = localStorage.getItem('rentalMaintenanceAssistantContext');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MaintenanceContext;
    return parsed && parsed.analysis && typeof parsed.analysis === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function buildGeneralFallback(question: string) {
  const q = question.trim();
  const normalized = q.toLowerCase();

  if (normalized.includes('rental agreement')) {
    return 'A rental agreement is the contract between a landlord and tenant that sets the rent, duration, notice period, responsibilities, and rules for the property. It should be read carefully before signing because it affects your rights, repairs, deposits, and exit terms. For complex disputes or a clause that feels unfair, speak with a qualified lawyer.';
  }

  if (normalized.includes('security deposit')) {
    return 'A security deposit is money paid upfront to protect the landlord against unpaid rent, damages, or breach of the lease. It is usually returned after the tenancy ends, less any valid deductions. Always check the refund timeline, deduction rules, and whether the deposit is interest-bearing or refundable.';
  }

  if (normalized.includes('notice period')) {
    return 'A notice period is the amount of time one party must give before ending the tenancy or changing a term. Common notice periods are 30 days or 60 days, but this varies by agreement and local law. Read the clause carefully and check whether notice must be written, served in a certain way, or delivered by email.';
  }

  if (normalized.includes('before signing')) {
    return 'Before signing, check the rent amount and due date, security deposit and refund clause, lease duration and renewal terms, maintenance and utility responsibilities, notice period and termination rights, entry rights, repairs, pet or guest restrictions, and any lock-in or rent increase clauses. If anything is unclear, ask for clarification before signing.';
  }

  if (normalized.includes('summarize my uploaded agreement')) {
    return 'Upload a rental agreement or load a demo lease first, and I can summarize rent, deposit, duration, notice period, maintenance, renewal, and termination terms. Once the document is loaded, I can use the actual agreement text for the summary.';
  }

  return 'I can help with general rental questions, but I am not a substitute for a lawyer. If a question involves legal risk, eviction, a disputed refund, or a clause you do not understand, consult a qualified legal professional.';
}

function formatAgreementSummary(summary?: SummaryFields, sourceName?: string) {
  if (!summary) {
    return 'No summary is available for the currently uploaded agreement yet.';
  }

  const lines = [
    `Here is a quick summary of ${sourceName || 'your uploaded agreement'}:`,
    '',
    `• Rent: ${summary.rent || 'Not found in the uploaded document.'}`,
    `• Security deposit: ${summary.securityDeposit || 'Not found in the uploaded document.'}`,
    `• Duration: ${summary.duration || 'Not found in the uploaded document.'}`,
    `• Notice period: ${summary.noticePeriod || 'Not found in the uploaded document.'}`,
    `• Maintenance: ${summary.maintenance || 'Not found in the uploaded document.'}`,
    `• Renewal: ${summary.renewal || 'Not found in the uploaded document.'}`,
    `• Termination: ${summary.termination || 'Not found in the uploaded document.'}`,
  ];

  return lines.join('\n');
}

export default function RentalAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [agreementContext, setAgreementContext] = useState<AgreementContext | null>(null);
  const [maintenanceContext, setMaintenanceContext] = useState<MaintenanceContext | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', text: welcomeMessage, source: 'Rental Assistant' },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const previousMaintenanceUpdate = useRef<number | null>(null);

  useEffect(() => {
    const syncAgreementContext = () => setAgreementContext(loadAgreementContext());
    const syncMaintenanceContext = () => setMaintenanceContext(loadMaintenanceContext());
    syncAgreementContext();
    syncMaintenanceContext();
    window.addEventListener('storage', syncAgreementContext);
    window.addEventListener('rental-assistant-context', syncAgreementContext as EventListener);
    window.addEventListener('storage', syncMaintenanceContext);
    window.addEventListener('rental-maintenance-context', syncMaintenanceContext as EventListener);

    return () => {
      window.removeEventListener('storage', syncAgreementContext);
      window.removeEventListener('rental-assistant-context', syncAgreementContext as EventListener);
      window.removeEventListener('storage', syncMaintenanceContext);
      window.removeEventListener('rental-maintenance-context', syncMaintenanceContext as EventListener);
    };
  }, []);

  useEffect(() => {
    const currentUpdate = maintenanceContext?.lastUpdated ?? null;
    if (previousMaintenanceUpdate.current !== null && previousMaintenanceUpdate.current !== currentUpdate) {
      setMessages([{ id: crypto.randomUUID(), role: 'assistant', text: welcomeMessage, source: 'Rental Assistant' }]);
    }
    previousMaintenanceUpdate.current = currentUpdate;
  }, [maintenanceContext?.lastUpdated]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized]);

  const contextLabel = useMemo(() => {
    if (maintenanceContext) {
      return `Photo assessment · ${maintenanceContext.sourceName || 'damage photo'}`;
    }
    if (agreementContext?.sourceName) {
      return `Using uploaded agreement: ${agreementContext.sourceName}`;
    }
    return 'General rental guidance';
  }, [agreementContext, maintenanceContext]);

  async function askQuestion(questionText: string) {
    const trimmed = questionText.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let answerText = '';
      let answerSource = 'Rental Assistant';
      let realAi = false;
      let citations: ChatMessage['citations'] = [];

      if (maintenanceContext) {
        const response = await fetch('/api/maintenance-ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            analysis: maintenanceContext.analysis,
            agreementPages: maintenanceContext.agreementPages || agreementContext?.pages || [],
            history: messages
              .filter((message) => message.role !== 'assistant' || message.source !== 'Rental Assistant')
              .slice(-8)
              .map((message) => ({ role: message.role, content: message.text })),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Unable to answer using the photo assessment.');
        answerText = data.answer || 'I could not find enough information to answer that confidently.';
        answerSource = 'AI answer · photo assessment';
        realAi = Boolean(data.realAi);
        citations = Array.isArray(data.citations) ? data.citations : [];
      } else if (agreementContext?.pages?.length) {
        const lower = trimmed.toLowerCase();
        if (/(summariz|summary|brief|overview)/.test(lower)) {
          answerText = formatAgreementSummary(agreementContext.summary, agreementContext.sourceName);
          answerSource = agreementContext.aiGenerated
            ? 'AI summary · agreement'
            : 'Extractive agreement summary';
          realAi = Boolean(agreementContext.aiGenerated);
        } else {
          const response = await fetch('/api/agreements/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pages: agreementContext.pages,
              question: trimmed,
              language: 'en',
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data?.error || 'Unable to answer using this agreement.');

          answerText = data.answer || 'Not found in the uploaded document.';
          answerSource = data.realAi ? 'AI answer · agreement grounded' : 'Rule-based · agreement grounded';
          realAi = Boolean(data.realAi);
          citations = Array.isArray(data.citations) ? data.citations : [];
        }
      } else {
        try {
          const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: trimmed }],
              systemPrompt:
                'You are a rental assistant for an Indian property website. Give general informational answers about rental agreements, tenant rights, security deposits, maintenance, notice periods, and lease review. Express new prices in Indian Rupees (INR) using the ₹ symbol and Indian number grouping. Preserve quoted agreement clauses exactly as written. Do not act as a lawyer. Clearly say when a question needs legal advice or a lawyer. Provide concise but practical explanations.',
              temperature: 0.5,
              max_tokens: 600,
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data?.error || 'AI unavailable');
          answerText = typeof data.content === 'string' ? data.content : buildGeneralFallback(trimmed);
          answerSource = 'AI-generated · general guidance';
          realAi = true;
        } catch {
          answerText = buildGeneralFallback(trimmed);
          answerSource = 'General rental guidance';
          realAi = false;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: answerText,
          source: answerSource,
          realAi,
          citations,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text:
            error instanceof Error
              ? error.message
              : 'I could not answer that right now. Please try again or upload an agreement for clause-level support.',
          source: 'Assistant error',
          realAi: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-[1.02]"
          aria-label="Open Rental Assistant"
        >
          <Bot className="h-5 w-5" />
          <span className="hidden sm:inline">Rental Assistant</span>
        </button>
      ) : (
        <div className="flex max-h-[calc(100dvh-2rem)] w-[min(92vw,390px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-primary/20 to-secondary/20 px-4 py-3">
            <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                  <p className="text-sm font-semibold">RentFlow Assistant</p>
                  <p className="max-w-[230px] truncate text-[10px] text-muted-foreground">{contextLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                aria-label="Minimize chat"
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!isMinimized ? (
            <>
              <div className="max-h-[min(38vh,340px)] min-h-40 overflow-y-auto p-3 sm:max-h-[420px]" ref={scrollRef}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'mb-3 max-w-[94%] rounded-2xl p-3 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto border border-white/10 bg-white/[0.06] text-foreground'
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] opacity-75">
                      <span>{message.role === 'user' ? 'You' : 'RentFlow Assistant'}</span>
                      {message.role === 'assistant' && message.source && (
                        <span className="rounded-full bg-white/5 px-2 py-0.5">{message.source}</span>
                      )}
                    </div>
                    <p className="whitespace-pre-line">{message.text}</p>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                          <FileSearch className="h-3.5 w-3.5" />
                          Relevant agreement clauses
                        </p>
                        {message.citations.slice(0, 3).map((citation, index) => (
                          <div
                            key={`${citation.originalText}-${index}`}
                            className="rounded-lg border-l-2 border-accent bg-background/50 px-2.5 py-2 text-xs text-muted-foreground"
                          >
                            <p className="leading-relaxed">“{citation.originalText}”</p>
                            <span className="mt-1.5 block font-medium text-foreground/70">
                              {citation.section || 'Agreement clause'}
                              {citation.page != null ? ` · Page ${citation.page}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="mr-auto max-w-[90%] rounded-2xl bg-white/5 p-3 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {maintenanceContext ? (
                      <><Wrench className="h-3.5 w-3.5 text-accent" />Ask about this damage</>
                    ) : agreementContext?.pages?.length ? (
                      <><FileSearch className="h-3.5 w-3.5 text-accent" />Ask about this agreement</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 text-primary" />Quick questions</>
                  )}
                </div>
                <div className="mb-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                  {(maintenanceContext
                    ? maintenanceQuestions
                    : agreementContext?.pages?.length
                      ? agreementQuestions
                      : generalQuestions).map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => askQuestion(question)}
                      disabled={isLoading}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-left text-[11px] text-foreground transition hover:border-primary/30 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>

                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    askQuestion(input);
                  }}
                >
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask about rent, deposits, or clauses…"
                    className="input-glass h-11 flex-1 bg-white/5"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </button>
                </form>
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
                  Informational support only—not legal advice. For disputes or legal decisions, consult a qualified lawyer.
                </p>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground"
            >
              <span className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-primary" />
                RentFlow Assistant
              </span>
              <span className="text-xs text-muted-foreground">Open</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
