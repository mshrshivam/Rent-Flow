// Groq API Service for AI-powered chat and lease summarization
// Calls backend proxy endpoint (/api/ai/chat) to avoid browser-side key/CORS issues

export interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GroqProxyResponse {
  content: string;
  error?: string;
  details?: unknown;
}

/**
 * Send a message to Groq API and get AI response
 */
export async function sendToGroqAI(messages: GroqMessage[], systemPrompt?: string): Promise<string> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      messages: systemPrompt 
        ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
        : messages,
      temperature: 0.7,
      max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Groq proxy error:', error);
      const message =
        (typeof error?.error === 'string' && error.error) ||
        (typeof error?.details?.error?.message === 'string' && error.details.error.message) ||
        `AI service request failed (HTTP ${response.status})`;
      throw new Error(message);
    }

    const data: GroqProxyResponse = await response.json();
    return data.content || 'No response from AI';
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw error;
  }
}

/**
 * Summarize a lease document using AI
 */
export async function summarizeLeaseDQWithGroq(leaseText: string): Promise<{
  summary: string;
  keyPoints: string[];
  warnings: string[];
  recommendations: string[];
}> {
  const systemPrompt = `You are an expert real estate lawyer and lease agreement analyst. 
Analyze lease agreements and provide clear, concise summaries with key points, warnings, and recommendations.
Format your response as JSON with fields: summary, keyPoints (array), warnings (array), recommendations (array)`;

  const userMessage: GroqMessage = {
    role: 'user',
    content: `Please analyze this lease agreement and provide a summary with key points, warnings, and recommendations:\n\n${leaseText}`,
  };

  try {
    const response = await sendToGroqAI([userMessage], systemPrompt);
    
    // Try to parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback if response isn't JSON
    return {
      summary: response,
      keyPoints: [],
      warnings: [],
      recommendations: [],
    };
  } catch (error) {
    console.error('Error summarizing lease with Groq:', error);
    throw error;
  }
}

/**
 * Get AI response for tenant queries
 */
export async function getTenantAIResponse(query: string, context?: string): Promise<string> {
  const systemPrompt = context
    ? `You are a helpful property management AI assistant. You help tenants with questions about their lease, rent, maintenance, and property-related issues. 
Additional context: ${context}`
    : `You are a helpful property management AI assistant. You help tenants with questions about their lease, rent, maintenance, and property-related issues.`;

  const messages: GroqMessage[] = [
    {
      role: 'user',
      content: query,
    },
  ];

  return sendToGroqAI(messages, systemPrompt);
}

/**
 * Get AI response for maintenance requests
 */
export async function getMaintenanceAIResponse(issue: string): Promise<{
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
  estimatedTime: string;
}> {
  const systemPrompt = `You are a property maintenance expert. Analyze maintenance issues and provide severity assessment, recommendations, and estimated fix time.
Format response as JSON with fields: severity (low/medium/high), recommendation (string), estimatedTime (string)`;

  const messages: GroqMessage[] = [
    {
      role: 'user',
      content: `Analyze this maintenance issue and provide assessment: ${issue}`,
    },
  ];

  try {
    const response = await sendToGroqAI(messages, systemPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {
      severity: 'medium',
      recommendation: response,
      estimatedTime: 'Unknown',
    };
  } catch (error) {
    console.error('Error getting maintenance AI response:', error);
    throw error;
  }
}

/**
 * Chat completions for messages
 */
export async function getChatCompletion(
  userMessage: string,
  conversationHistory: GroqMessage[] = [],
  role: 'tenant' | 'manager' | 'owner' = 'tenant'
): Promise<string> {
  const systemPrompts = {
    tenant: `You are a helpful property management assistant helping tenants with their rental questions. 
Be professional, helpful, and provide clear information about lease terms, maintenance, payments, and properties.`,
    manager: `You are a property management assistant helping property managers. 
Provide advice on tenant management, maintenance coordination, and property operations.`,
    owner: `You are a real estate advisor helping property owners. 
Provide guidance on property management, tenant relations, and investment decisions.`,
  };

  // Keep AI requests bounded to avoid model context overflow with long PDF content.
  const maxHistoryItems = 8;
  const maxMessageChars = 4000;

  const boundedHistory = conversationHistory
    .slice(-maxHistoryItems)
    .map((m) => ({
      ...m,
      content: String(m.content || '').slice(0, maxMessageChars),
    }));

  const messages: GroqMessage[] = [
    ...boundedHistory,
    { role: 'user', content: String(userMessage || '').slice(0, maxMessageChars) },
  ];

  return sendToGroqAI(messages, systemPrompts[role]);
}
