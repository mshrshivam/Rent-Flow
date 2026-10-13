// Lease Summarization Service using NLP
// Based on: https://github.com/masfaatanveer/Lease-Summarization-Model-NLP

export interface LeaseSummary {
  keyTerms: {
    rentAmount: string;
    securityDeposit: string;
    leaseDuration: string;
    startDate: string;
    endDate: string;
  };
  importantClauses: string[];
  responsibilities: {
    landlord: string[];
    tenant: string[];
  };
  restrictions: string[];
  penalties: string[];
  summary: string;
}

// Extract key information using NLP patterns
function extractKeyTerms(text: string): LeaseSummary['keyTerms'] {
  const terms = {
    rentAmount: '',
    securityDeposit: '',
    leaseDuration: '',
    startDate: '',
    endDate: ''
  };

  // Extract rent amount
  const rentPatterns = [
    /rent[:\s]+(?:of\s+)?(?:rs\.?|₹|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /monthly\s+rent[:\s]+(?:rs\.?|₹|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /(?:rs\.?|₹|\$)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s+per\s+month/i
  ];
  
  for (const pattern of rentPatterns) {
    const match = text.match(pattern);
    if (match) {
      terms.rentAmount = `₹${match[1].replace(/,/g, '')}`;
      break;
    }
  }

  // Extract security deposit
  const depositPatterns = [
    /security\s+deposit[:\s]+(?:rs\.?|₹|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
    /deposit[:\s]+(?:rs\.?|₹|\$)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/i
  ];
  
  for (const pattern of depositPatterns) {
    const match = text.match(pattern);
    if (match) {
      terms.securityDeposit = `₹${match[1].replace(/,/g, '')}`;
      break;
    }
  }

  // Extract lease duration
  const durationPatterns = [
    /(?:lease\s+)?(?:term|duration|period)[:\s]+(\d+)\s+(month|year)s?/i,
    /(\d+)\s+(month|year)s?\s+lease/i
  ];
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      terms.leaseDuration = `${match[1]} ${match[2]}${match[1] !== '1' ? 's' : ''}`;
      break;
    }
  }

  // Extract dates
  const datePatterns = [
    /start(?:ing)?\s+date[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /from[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /commencing[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      terms.startDate = match[1];
      break;
    }
  }

  const endDatePatterns = [
    /end(?:ing)?\s+date[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /(?:to|until)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /expir(?:ing|y)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
  ];
  
  for (const pattern of endDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      terms.endDate = match[1];
      break;
    }
  }

  return terms;
}

// Extract important clauses
function extractImportantClauses(text: string): string[] {
  const clauses: string[] = [];
  const clauseKeywords = [
    'maintenance', 'repair', 'utilities', 'parking', 'pets',
    'subletting', 'termination', 'renewal', 'notice period',
    'late payment', 'eviction', 'insurance', 'modifications'
  ];

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  for (const sentence of sentences) {
    for (const keyword of clauseKeywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        clauses.push(sentence.trim());
        break;
      }
    }
  }

  return [...new Set(clauses)].slice(0, 5);
}

// Extract responsibilities
function extractResponsibilities(text: string): LeaseSummary['responsibilities'] {
  const responsibilities = {
    landlord: [] as string[],
    tenant: [] as string[]
  };

  const landlordKeywords = ['landlord', 'owner', 'lessor'];
  const tenantKeywords = ['tenant', 'lessee', 'renter'];

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    if (landlordKeywords.some(k => lowerSentence.includes(k)) && 
        (lowerSentence.includes('shall') || lowerSentence.includes('must') || 
         lowerSentence.includes('responsible') || lowerSentence.includes('provide'))) {
      responsibilities.landlord.push(sentence.trim());
    }
    
    if (tenantKeywords.some(k => lowerSentence.includes(k)) && 
        (lowerSentence.includes('shall') || lowerSentence.includes('must') || 
         lowerSentence.includes('responsible') || lowerSentence.includes('agree'))) {
      responsibilities.tenant.push(sentence.trim());
    }
  }

  return {
    landlord: [...new Set(responsibilities.landlord)].slice(0, 5),
    tenant: [...new Set(responsibilities.tenant)].slice(0, 5)
  };
}

// Extract restrictions
function extractRestrictions(text: string): string[] {
  const restrictions: string[] = [];
  const restrictionKeywords = [
    'not allowed', 'prohibited', 'forbidden', 'restricted',
    'shall not', 'must not', 'cannot', 'no pets', 'no smoking'
  ];

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (restrictionKeywords.some(k => lowerSentence.includes(k))) {
      restrictions.push(sentence.trim());
    }
  }

  return [...new Set(restrictions)].slice(0, 5);
}

// Extract penalties
function extractPenalties(text: string): string[] {
  const penalties: string[] = [];
  const penaltyKeywords = [
    'penalty', 'fine', 'charge', 'fee', 'late payment',
    'breach', 'violation', 'damages', 'forfeit'
  ];

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (penaltyKeywords.some(k => lowerSentence.includes(k))) {
      penalties.push(sentence.trim());
    }
  }

  return [...new Set(penalties)].slice(0, 5);
}

// Generate summary using extractive summarization
function generateSummary(text: string, keyTerms: LeaseSummary['keyTerms']): string {
  const parts = [];

  if (keyTerms.rentAmount) {
    parts.push(`Monthly rent: ${keyTerms.rentAmount}`);
  }
  
  if (keyTerms.securityDeposit) {
    parts.push(`Security deposit: ${keyTerms.securityDeposit}`);
  }
  
  if (keyTerms.leaseDuration) {
    parts.push(`Lease duration: ${keyTerms.leaseDuration}`);
  }
  
  if (keyTerms.startDate && keyTerms.endDate) {
    parts.push(`Period: ${keyTerms.startDate} to ${keyTerms.endDate}`);
  }

  const summary = parts.join('. ') + '.';
  
  return summary || 'Lease agreement summary could not be generated. Please review the document manually.';
}

// Main summarization function
export async function summarizeLease(leaseText: string): Promise<LeaseSummary> {
  try {
    console.log('Starting lease summarization...');
    
    // Extract all components
    const keyTerms = extractKeyTerms(leaseText);
    const importantClauses = extractImportantClauses(leaseText);
    const responsibilities = extractResponsibilities(leaseText);
    const restrictions = extractRestrictions(leaseText);
    const penalties = extractPenalties(leaseText);
    const summary = generateSummary(leaseText, keyTerms);

    console.log('Lease summarization completed');

    return {
      keyTerms,
      importantClauses,
      responsibilities,
      restrictions,
      penalties,
      summary
    };
  } catch (error) {
    console.error('Error summarizing lease:', error);
    throw error;
  }
}

// Analyze lease for potential issues
export function analyzeLease(summary: LeaseSummary): {
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check for missing key terms
  if (!summary.keyTerms.rentAmount) {
    warnings.push('Rent amount not clearly specified');
  }
  
  if (!summary.keyTerms.securityDeposit) {
    warnings.push('Security deposit not mentioned');
  }
  
  if (!summary.keyTerms.leaseDuration) {
    warnings.push('Lease duration not specified');
  }

  // Check for important clauses
  if (summary.importantClauses.length < 3) {
    warnings.push('Limited important clauses found');
  }

  // Recommendations
  if (summary.responsibilities.tenant.length === 0) {
    recommendations.push('Tenant responsibilities should be clearly defined');
  }
  
  if (summary.restrictions.length === 0) {
    recommendations.push('Consider adding property usage restrictions');
  }
  
  if (summary.penalties.length === 0) {
    recommendations.push('Late payment penalties should be specified');
  }

  return { warnings, recommendations };
}
