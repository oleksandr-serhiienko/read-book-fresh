import Translation from './languages/entities/translation';
import TranslationContext from './languages/entities/translationContext';

export interface ResponseTranslation{
    Original:string,
    Translations:Translation[],
    Contexts:TranslationContext[],
    TextView:string,
    Book:string
}

export interface SentenceTranslation{
  Original: string,
  Translation: string,
  id?: number,
  bookTitle?: string
}