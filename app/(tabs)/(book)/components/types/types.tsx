export interface ParsedWord {
  word: string;
  sentenceNumber: number;

  wordIndex: number;     // Position of this word
  groupNumber: number;  // The tag number (like 33 from /33/)
  
  linkeNumber: number[]; // Indices of words in same group in the same sentence
  wordLinkedNumber: string[]; // Words in same group in same sentence
  
  linkedWordMirror: number[]; // Indices of translation words
  wordLinkedWordMirror: string[]; // Translation words
  
  isSpace?: boolean;
  isTranslation: boolean;
}
  
  export interface ParsedSentence {
    original: ParsedWord[];
    translation: ParsedWord[];
  }
  

  
export interface HighlightState {
    sentenceNumber: number | null;
    linkedNumbers: number[];
  }
  
export interface DBReaderProps {
    bookUrl: string;
    bookTitle: string;
    imageUrl: string;
  }
  