// Enhanced translation with multiple fallback APIs
export async function translateText(text: string, source: string, target: string): Promise<string> {
  if (!text || source === target) return text;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, target }),
    });

    if (response.ok) {
      const data = await response.json();
      if (typeof data?.translatedText === 'string' && data.translatedText) {
        return data.translatedText;
      }
    }
  } catch (error) {
    console.warn('Translation proxy failed, using fallback');
  }

  // Final fallback keeps UX non-blocking when translation providers are unavailable.
  return `[${target.toUpperCase()}] ${text}`;
}

// Detect language from text
export function detectLanguage(text: string): string {
  // Simple language detection based on character sets
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Oriya
  if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
  return 'en'; // Default to English
}

// Batch translate multiple messages
export async function batchTranslate(
  messages: Array<{ text: string; sourceLang: string }>,
  targetLang: string
): Promise<string[]> {
  if (!messages.length) return [];

  try {
    const response = await fetch('/api/translate/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: targetLang,
        items: messages.map((msg) => ({ text: msg.text, source: msg.sourceLang })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.items)) {
        return data.items.map((item: any, idx: number) => {
          const translated = typeof item?.translatedText === 'string' ? item.translatedText : '';
          return translated || messages[idx]?.text || '';
        });
      }
    }
  } catch (error) {
    console.warn('Batch translation failed, falling back to per-message translation');
  }

  return Promise.all(messages.map((msg) => translateText(msg.text, msg.sourceLang, targetLang)));
}