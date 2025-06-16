// app/services/reverso/languages/entities/languages.ts

export type SupportedLanguage = 
  'arabic' | 'german' | 'spanish' | 'french' | 'hebrew' | 'italian' | 'japanese' | 
  'dutch' | 'polish' | 'portuguese' | 'romanian' | 'russian' | 'turkish' | 
  'chinese' | 'english' | 'ukrainian';

const SupportedLanguages = {
  ARABIC: 'arabic' as SupportedLanguage,
  GERMAN: 'german' as SupportedLanguage,
  SPANISH: 'spanish' as SupportedLanguage,
  FRENCH: 'french' as SupportedLanguage,
  HEBREW: 'hebrew' as SupportedLanguage,
  ITALIAN: 'italian' as SupportedLanguage,
  JAPANESE: 'japanese' as SupportedLanguage,
  DUTCH: 'dutch' as SupportedLanguage,
  POLISH: 'polish' as SupportedLanguage,
  PORTUGUESE: 'portuguese' as SupportedLanguage,
  ROMANIAN: 'romanian' as SupportedLanguage,
  RUSSIAN: 'russian' as SupportedLanguage,
  TURKISH: 'turkish' as SupportedLanguage,
  CHINESE: 'chinese' as SupportedLanguage,
  ENGLISH: 'english' as SupportedLanguage,
  UKRAINIAN: 'ukrainian' as SupportedLanguage,
};

export default SupportedLanguages;