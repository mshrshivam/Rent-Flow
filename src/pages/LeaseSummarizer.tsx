import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Sparkles, AlertTriangle, CheckCircle, Download, Copy } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import { summarizeLease, analyzeLease, type LeaseSummary } from '@/lib/leaseSummarization';
import { toast } from 'sonner';

const LeaseSummarizer = () => {
  const [leaseText, setLeaseText] = useState('');
  const [summary, setSummary] = useState<LeaseSummary | null>(null);
  const [analysis, setAnalysis] = useState<{ warnings: string[]; recommendations: string[] } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setLeaseText(text);
        toast.success('File uploaded successfully!');
      };
      reader.readAsText(file);
    }
  };

  const handleSummarize = async () => {
    if (!leaseText.trim()) {
      toast.error('Please enter or upload lease text');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await summarizeLease(leaseText);
      const analysisResult = analyzeLease(result);
      
      setSummary(result);
      setAnalysis(analysisResult);
      toast.success('Lease summarized successfully!');
    } catch (error) {
      toast.error('Failed to summarize lease');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const sampleLease = `RENTAL LEASE AGREEMENT

This Rental Lease Agreement is entered into on 01/01/2024 between:

LANDLORD: Rajesh Kumar (Owner)
TENANT: Amit Patel

PROPERTY: Apartment A-101, Sunrise Apartments, Mumbai

TERMS:
1. Lease Duration: 12 months
2. Start Date: 01/01/2024
3. End Date: 31/12/2024
4. Monthly Rent: Rs. 25,000
5. Security Deposit: Rs. 50,000

LANDLORD RESPONSIBILITIES:
- The landlord shall maintain the structural integrity of the property
- The landlord shall provide 24-hour water supply and electricity
- The landlord must repair any major damages to the property

TENANT RESPONSIBILITIES:
- The tenant shall pay rent on or before the 5th of each month
- The tenant must maintain cleanliness of the premises
- The tenant shall not make any structural modifications without written permission

RESTRICTIONS:
- Pets are not allowed in the premises
- Subletting is strictly prohibited
- No commercial activities shall be conducted

PENALTIES:
- Late payment penalty: Rs. 500 per day after 5th of the month
- Breach of agreement may result in immediate eviction
- Security deposit will be forfeited for property damages

UTILITIES:
- Electricity and water charges to be paid by tenant
- Maintenance charges: Rs. 2,000 per month

NOTICE PERIOD:
- Either party must provide 2 months notice for termination

This agreement is legally binding upon both parties.`;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                Lease Summarizer
              </h1>
              <p className="text-muted-foreground mt-1">AI-powered lease document analysis using NLP</p>
            </div>
            <button
              onClick={() => setLeaseText(sampleLease)}
              className="btn-ghost flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Load Sample
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard className="p-6 h-full">
              <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Input Lease Document
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Upload Text File
                  </label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="input-glass w-full"
                  />
                </div>

                <div className="relative">
                  <label className="block text-sm text-muted-foreground mb-2">
                    Or Paste Lease Text
                  </label>
                  <textarea
                    value={leaseText}
                    onChange={(e) => setLeaseText(e.target.value)}
                    placeholder="Paste your lease agreement text here..."
                    rows={15}
                    className="input-glass w-full resize-none font-mono text-sm"
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                    {leaseText.length} characters
                  </div>
                </div>

                <button
                  onClick={handleSummarize}
                  disabled={isProcessing || !leaseText.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Summarize Lease
                    </>
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>

          {/* Output Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {summary ? (
              <>
                {/* Summary */}
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-xl flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Summary
                    </h2>
                    <button
                      onClick={() => handleCopy(summary.summary)}
                      className="btn-ghost p-2"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm">{summary.summary}</p>
                </GlassCard>

                {/* Key Terms */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-3">Key Terms</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {summary.keyTerms.rentAmount && (
                      <div>
                        <span className="text-muted-foreground">Rent:</span>
                        <p className="font-medium">{summary.keyTerms.rentAmount}</p>
                      </div>
                    )}
                    {summary.keyTerms.securityDeposit && (
                      <div>
                        <span className="text-muted-foreground">Deposit:</span>
                        <p className="font-medium">{summary.keyTerms.securityDeposit}</p>
                      </div>
                    )}
                    {summary.keyTerms.leaseDuration && (
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <p className="font-medium">{summary.keyTerms.leaseDuration}</p>
                      </div>
                    )}
                    {summary.keyTerms.startDate && (
                      <div>
                        <span className="text-muted-foreground">Start:</span>
                        <p className="font-medium">{summary.keyTerms.startDate}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>

                {/* Analysis */}
                {analysis && (analysis.warnings.length > 0 || analysis.recommendations.length > 0) && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold mb-3">Analysis</h3>
                    
                    {analysis.warnings.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-warning flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          Warnings
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {analysis.warnings.map((warning, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-warning mt-1">•</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-success flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4" />
                          Recommendations
                        </h4>
                        <ul className="space-y-1 text-sm">
                          {analysis.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-success mt-1">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </GlassCard>
                )}

                {/* Responsibilities */}
                {(summary.responsibilities.landlord.length > 0 || summary.responsibilities.tenant.length > 0) && (
                  <GlassCard className="p-6">
                    <h3 className="font-semibold mb-3">Responsibilities</h3>
                    
                    {summary.responsibilities.landlord.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-primary mb-2">Landlord</h4>
                        <ul className="space-y-1 text-sm">
                          {summary.responsibilities.landlord.map((resp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span className="text-muted-foreground">{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.responsibilities.tenant.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-accent mb-2">Tenant</h4>
                        <ul className="space-y-1 text-sm">
                          {summary.responsibilities.tenant.map((resp, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-accent mt-1">•</span>
                              <span className="text-muted-foreground">{resp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </GlassCard>
                )}
              </>
            ) : (
              <GlassCard className="p-12 text-center">
                <Sparkles className="w-16 h-16 text-muted-foreground opacity-50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Summary Yet</h3>
                <p className="text-muted-foreground">
                  Upload or paste a lease document and click "Summarize Lease" to get started
                </p>
              </GlassCard>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeaseSummarizer;
