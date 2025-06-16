// useParsedSentences.ts
import { useState, useCallback, useEffect } from 'react';
import { DBSentence } from '@/components/db/bookDatabase';
import { ParsedSentence, ParsedWord } from '../types/types';

export const useParsedSentences = (chapterSentences: DBSentence[]) => {
  const [parsedSentences, setParsedSentences] = useState<Map<number, ParsedSentence>>(new Map());

  useEffect(() => {
    // Parse all sentences when chapter sentences change
    const newParsedSentences = new Map();
    chapterSentences.forEach(sentence => {
      const parsed = parseSentence(sentence);
      newParsedSentences.set(sentence.sentence_number, parsed);
    });
    setParsedSentences(newParsedSentences);
  }, [chapterSentences]);

  const updateParsedSentences = useCallback((sentence: DBSentence, parsed: ParsedSentence) => {
    setParsedSentences(prev => {
      const newMap = new Map(prev);
      newMap.set(sentence.sentence_number, parsed);
      return newMap;
    });
  }, []);

  const parseSentenceText = useCallback((sentenceNumber: number): ParsedSentence => {
    const sentence = chapterSentences.find(s => s.sentence_number === sentenceNumber);
    if (!sentence ) {
      return { original: [], translation: [] };      
    }
        // If it's a special character or unparsed text
        if (!sentence.original_parsed_text || !sentence.translation_parsed_text) {
          return {
              original: [{
                  word: sentence.original_text === "···" ? "" : sentence.original_text,
                  sentenceNumber,
                  wordIndex: 0,
                  groupNumber: -1,
                  linkeNumber: [],
                  wordLinkedNumber: [],
                  linkedWordMirror: [],
                  wordLinkedWordMirror: [],
                  isSpace: false,
                  isTranslation: false
              }],
              translation: []
          };
      }

    const parseText = (text: string, sentenceNumber: number, isTranslation: boolean): ParsedWord[] => {
      const textParts = text.split(/(\s+)/);
      const words: ParsedWord[] = [];
    
      // First pass: create basic word objects and collect numbers
      const numberToIndicesMap = new Map<number, number[]>(); // key is number (33), value is array of indices
    
      textParts.forEach((part, index) => {
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          words.push({
            word: part,
            sentenceNumber,
            wordIndex: index,
            groupNumber: -1,
            linkeNumber: [],
            wordLinkedNumber: [],
            linkedWordMirror: [],
            wordLinkedWordMirror: [],
            isSpace: true,
            isTranslation
          });
          return;
        }
    
        // Parse number and word
        const numberMatch = part.match(/\/(\d+)\//);
        const groupNumber = numberMatch ? parseInt(numberMatch[1]) : -1;
        const cleanWord = part.replace(/\/\d+\//g, '').trim();
    
        // Track word indices by their number
        if (groupNumber !== -1) {
          if (!numberToIndicesMap.has(groupNumber)) {
            numberToIndicesMap.set(groupNumber, []);
          }
          numberToIndicesMap.get(groupNumber)!.push(index);
        }
    
        words.push({
          word: cleanWord,
          sentenceNumber,
          wordIndex: index,
          groupNumber,
          linkeNumber: [],
          wordLinkedNumber: [],
          linkedWordMirror: [],
          wordLinkedWordMirror: [],
          isSpace: false,
          isTranslation
        });
      });
    
      // Second pass: fill in group indices and words
      words.forEach((word, wordIndex) => {
        if (!word.isSpace && word.groupNumber !== -1) {
          // Get all indices for this number
          const groupIndices = numberToIndicesMap.get(word.groupNumber) || [];
          // Filter out own index
          word.linkeNumber = groupIndices.filter(idx => idx !== wordIndex);
          // Get words for these indices
          word.wordLinkedNumber = word.linkeNumber.map(idx => words[idx].word);
        }
      });
    
      return words;
    };

    return {
      original: parseText(sentence.original_parsed_text, sentenceNumber, false),
      translation: parseText(sentence.translation_parsed_text, sentenceNumber, true)
    };
  }, [chapterSentences]);

  const parseSentence = useCallback((sentence: DBSentence) => {
    const parsed = parseSentenceText(sentence.sentence_number);
    const { original, translation } = parsed;

    // Establish bidirectional links between words
    original.forEach((origWord, origIndex) => {
      if (origWord.groupNumber !== -1) {
        translation.forEach((transWord, transIndex) => {
          if (origWord.groupNumber === transWord.groupNumber) {
            // Add indices
            origWord.linkedWordMirror.push(transIndex);
            transWord.linkedWordMirror.push(origIndex);
            
            // Add actual words
            origWord.wordLinkedWordMirror.push(transWord.word);
            transWord.wordLinkedWordMirror.push(origWord.word);
          }
        });
      }
    });

    return { original, translation };
  }, [parseSentenceText]);

  return {
    parsedSentences,
    updateParsedSentences,
    parseSentence
  };
};