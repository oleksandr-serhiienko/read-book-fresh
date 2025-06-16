// Word.tsx
import React, { memo, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { ParsedWord } from '../types/types';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';
import { EmittedWord, SlidePanelEvents } from '../events/slidePanelEvents';
import WordPopup from './WordPopup';

interface WordProps {
  word: ParsedWord;
  sentence: DBSentence;
  isHighlighted: boolean;
  fontSize: number;
  database: BookDatabase; // Add database instance as a prop
  isTranslation: boolean;
  onPress: (word: string, sentence: DBSentence, wordIndex: number) => Promise<ParsedWord>;
  onLongPress?: () => void;
}

interface Word {
  word: string;
  wordIndex: number;
}

interface UpdatedWord {
  word: string;
  wordIndex: number;
  isTranslation: boolean;
  linkeNumber: number[];
  wordLinkedNumber: string[];
  linkedWordMirror: number[];
  wordLinkedWordMirror: string[];
}

interface Translation {
  word: string;
  pos: string;
}

interface TranslationContext {
  original: string;
  translation: string;
}

interface DbTranslation {
  translations: string[];
  contexts?: {
    original_text?: string;
    translated_text?: string;
  }[];
}

interface TranslationResponse {
  Original: string;
  Translations: Translation[];
  Contexts: TranslationContext[];
  Book: string;
  TextView: string;
}


// Custom comparison function for memo
const arePropsEqual = (prevProps: WordProps, nextProps: WordProps) => {
  const isEqual = (
    prevProps.word.word === nextProps.word.word &&
    prevProps.isHighlighted === nextProps.isHighlighted &&
    prevProps.fontSize === nextProps.fontSize
  );

  return isEqual;
};

const Word: React.FC<WordProps> = memo(({
  word,
  sentence,
  isHighlighted,
  fontSize,
  database,
  isTranslation,
  onPress,
  onLongPress
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const [popupTranslation, setPopupTranslation] = useState('');
  
  if (word.isSpace) {
    return <Text style={{ width: fontSize * 0.25 }}>{' '}</Text>;  
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'baseline',  
      alignSelf: 'flex-start',  
      paddingTop: 1,           
    },
    word: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.5,
      includeFontPadding: false,  // Android specific
      textAlignVertical: 'center',
      ...(isTranslation && {
        color: '#666',
        fontStyle: 'italic',
      })
    }
  });

  function cleanWord(word: string ) {
    if (!word || typeof word !== 'string') {
      return '';
    }
    
    // Trim non-letters from start and end
    // \p{L} matches any kind of letter from any language
    return word
      .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
      .trim();
  }
  
    


  const handleWordPress = async (): Promise<void> => {
    const cleanedWord = cleanWord(word.word.toLowerCase());
    // Get updated word data
    const updatedWord = await onPress(word.word, sentence, word.wordIndex);
    if (!updatedWord) return;

    // Check if word is part of a group (has linked words)
    if (updatedWord.linkeNumber.length > 0) {
      await handleWordGroup(updatedWord, cleanedWord);
    } else {
      await handleSingleWord(updatedWord);
    }
  };

  /**
   * Handle a word that's part of a linked group
   */
  const handleWordGroup = async (updatedWord: UpdatedWord, cleanedWord: string): Promise<void> => {
    // Show popup for individual word if available
    //await showIndividualWordPopup(cleanedWord);
    
    // Get all words in the group and their translations
    const allGroupWords = extractGroupWords(updatedWord);
    const sortedTranslations = extractSortedTranslations(updatedWord);
    
    // Determine current phrase and translation phrase
    const currentPhrase = allGroupWords.join(' ');
    const translationPhrase = sortedTranslations.join(' ');
    
    if (updatedWord.isTranslation) {
      // We're looking at a translation, get original text details
      await handleTranslatedWordGroup(currentPhrase, translationPhrase);
    } else {
      // We're looking at original text, get translation details
      await handleOriginalWordGroup(currentPhrase, translationPhrase);
    }
  };

  /**
   * Handle a translated word group
   */
  const handleTranslatedWordGroup = async (
    currentPhrase: string, 
    translationPhrase: string
  ): Promise<void> => {


    const wordToEmmit: EmittedWord = {
      word: currentPhrase,
      translation: translationPhrase,
      bookTitle: database.getDbName(),
      sentenceId: sentence.sentence_number 
    }
    
    SlidePanelEvents.emit(wordToEmmit, true);
  };

  /**
   * Handle an original word group
   */
  const handleOriginalWordGroup = async (
    currentPhrase: string, 
    translationPhrase: string
  ): Promise<void> => {
    const wordToEmmit: EmittedWord = {
      word: currentPhrase,
      translation: translationPhrase,
      bookTitle: database.getDbName(),
      sentenceId: sentence.sentence_number 
    }
    
    SlidePanelEvents.emit(wordToEmmit, true);
  };

  /**
   * Handle a single word (not part of a group)
   */
  const handleSingleWord = async (updatedWord: UpdatedWord): Promise<void> => {
    if (updatedWord.isTranslation) {
      await handleTranslatedSingleWord(updatedWord);
    } else {
      await handleOriginalSingleWord(updatedWord);
    }
  };

  /**
   * Handle a translated single word
   */
  const handleTranslatedSingleWord = async (updatedWord: UpdatedWord): Promise<void> => {
    // For translated words, we show the original
    const cleanedWord = cleanWord(updatedWord.wordLinkedWordMirror.join(' '));

    const wordToEmmit: EmittedWord = {
      word: cleanedWord,
      translation: updatedWord.word.toLowerCase() ||  await getMissedTranslation(cleanedWord),
      bookTitle: database.getDbName(),
      sentenceId: sentence.sentence_number 
    }
    
    SlidePanelEvents.emit(wordToEmmit, true);
  };

  /**
   * Handle an original single word
   */
  const handleOriginalSingleWord = async (updatedWord: UpdatedWord): Promise<void> => {
    const cleanedWord = cleanWord(updatedWord.word.toLowerCase());
    
    // Get coupled translation
    const coupledTranslation = extractCoupledTranslation(updatedWord);
    
    const wordToEmmit: EmittedWord = {
      word: cleanedWord,
      translation: coupledTranslation || await getMissedTranslation(cleanedWord),
      bookTitle: database.getDbName(),
      sentenceId: sentence.sentence_number 
    }
    
    SlidePanelEvents.emit(wordToEmmit, true);
  };

  const getMissedTranslation = async (word: string): Promise<string> => {
    const foundWord = await database.getWordTranslation(word);
    return foundWord?.translations?.[0]?.meaning ?? "";
  }

  /**
   * Show popup for individual word if translation exists
   */
  // const showIndividualWordPopup = async (cleanedWord: string): Promise<void> => {
  //   const individualTranslation = await database.getWordTranslation(cleanedWord.toLowerCase());
  //   if (individualTranslation) {
  //     setPopupTranslation(individualTranslation.translations[0]);
  //     setShowPopup(true);
  //   }
  // };

  /**
   * Extract all words in a group, sorted by index
   */
  const extractGroupWords = (updatedWord: UpdatedWord): string[] => {
    return [
      { index: updatedWord.wordIndex, word: cleanWord(updatedWord.word.toLowerCase()) },
      ...updatedWord.wordLinkedNumber.map((word, i) => ({
        index: updatedWord.linkeNumber[i],
        word: cleanWord(word.toLowerCase())
      }))
    ]
    .sort((a, b) => a.index - b.index)
    .map(item => item.word);
  };

  /**
   * Extract translations sorted by their indices
   */
  const extractSortedTranslations = (updatedWord: UpdatedWord): string[] => {
    return updatedWord.linkedWordMirror
      .map((index, i) => ({
        index,
        word: cleanWord(updatedWord.wordLinkedWordMirror[i].toLowerCase())
      }))
      .sort((a, b) => a.index - b.index)
      .map(item => item.word);
  };


  /**
   * Extract coupled translation from updatedWord
   */
  const extractCoupledTranslation = (updatedWord: UpdatedWord): string => {
    return updatedWord.linkedWordMirror
      .map((index, i) => ({
        index,
        word: cleanWord(updatedWord.wordLinkedWordMirror[i].toLowerCase())
      }))
      .sort((a, b) => a.index - b.index)
      .map(item => item.word)
      .join(' ');
  };


return (
  <View style={dynamicStyles.container}>
  <Text
    onPress={handleWordPress}
    onLongPress={onLongPress}
    style={[
      dynamicStyles.word,
      isHighlighted && styles.highlightedWord
    ]}
  >
    {word.word}
  </Text>
  <WordPopup 
    translation={popupTranslation}
    visible={showPopup}
    onHide={() => setShowPopup(false)}
  />
</View>
);
}, arePropsEqual);

const styles = StyleSheet.create({
  space: {
    width: 4,
  },
  highlightedWord: {
    backgroundColor: '#3498db',
    color: '#fff',
    borderRadius: 4,          // This adds rounded corners
    //marginTop: 1
    //height: 'auto',
    //paddingHorizontal: 4,     // This adds some horizontal padding
    //paddingVertical: 2,       // This reduces the vertical padding/height
    //marginHorizontal: 1,       // This can help offset the extra height from padding
  }
});

export { Word };