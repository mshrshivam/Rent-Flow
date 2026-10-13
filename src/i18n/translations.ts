//---------------------------------------------
// Language type
//---------------------------------------------

export type Language = 'en' | 'hi' | 'ta';

export const translations: Record<Language, Record<string, any>> = {
  en: {
    messages: {
      title: 'Messages',
      searchPlaceholder: 'Search conversations...',
    },
  },
  hi: {
    messages: {
      title: 'संदेश',
      searchPlaceholder: 'बातचीत खोजें...',
    },
  },
  ta: {
    messages: {
      title: 'செய்திகள்',
      searchPlaceholder: 'உரையாடல்களை தேடுங்கள்...',
    },
  },
};

//---------------------------------------------
// UNIVERSAL TRANSLATION FUNCTION
//---------------------------------------------

export async function translateText(
  text: string,
  targetLanguage: Language = 'hi'
): Promise<string> {

  try {

    const response = await fetch(
      "https://libretranslate.de/translate",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          q: text,

          // AUTO detect karega language
          source: "auto",

          // target language
          target: targetLanguage,

          format: "text",
        }),

      }
    );

    const data = await response.json();

    console.log("Original:", text);
    console.log("Translated:", data.translatedText);

    return data.translatedText;

  } catch (error) {

    console.error("Translation error:", error);

    return text;

  }

}