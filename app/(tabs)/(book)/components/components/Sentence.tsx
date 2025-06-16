// Sentence.tsx
import { Text, View, StyleSheet, TouchableWithoutFeedback } from "react-native";
import { Word } from "./Word";
import { ParsedSentence, ParsedWord } from "../types/types";
import { BookDatabase, DBSentence } from "@/components/db/bookDatabase";
import { database } from "@/components/db/database";

export interface SentenceProps {
  sentence: DBSentence;
  parsedSentence?: ParsedSentence;
  isSelected: boolean;
  bookTitle: string;
  fontSize: number;
  onWordPress: (word: string, sentence: DBSentence, index: number) => Promise<ParsedWord>;
  onLongPress: () => void;
  isWordHighlighted: (word: ParsedWord) => boolean;
  database: BookDatabase
}

export const Sentence: React.FC<SentenceProps> = ({
  sentence,
  parsedSentence,
  isSelected,
  bookTitle,
  fontSize,
  onWordPress,
  onLongPress,
  isWordHighlighted, 
  database
}) => {
  const dynamicStyles = StyleSheet.create({
    paragraph: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.5,
    },
    translationText: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.5,
      color: '#666',
      fontStyle: 'italic',
    },
    wordContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
    },
    paragraphIndent: {
      width: fontSize * 1.5, // Paragraph indentation - approximately 1.5 characters wide
      height: 1,
    }
  });
  
  return (
    <View>
      {/* Original text rendering with improved layout */}
      <TouchableWithoutFeedback onLongPress={onLongPress}>
        <View style={dynamicStyles.wordContainer}>
          {/* Add paragraph indentation spacer at the beginning */}
          <View style={dynamicStyles.paragraphIndent} />
          
          {parsedSentence ? 
            // For parsed sentences, render each word with the Word component
            parsedSentence.original.map((word, index) => (
              <Word
                key={`original-${index}`}
                word={word}
                sentence={sentence}
                fontSize={fontSize}
                isHighlighted={isWordHighlighted(word)}
                onPress={onWordPress}
                onLongPress={onLongPress}
                database={database}
                isTranslation={false}
              />
            ))
            : 
            // For unparsed text, split and render each word
            sentence.original_text.split(/(\s+)/).map((word, index) => {
              const isSpace = /^\s+$/.test(word);
              const parsedWord: ParsedWord = {
                word,
                sentenceNumber: sentence.sentence_number,
                wordIndex: index, 
                groupNumber: 0,             
                linkeNumber: [],
                wordLinkedNumber: [],
                linkedWordMirror: [],
                wordLinkedWordMirror: [],
                isSpace,
                isTranslation: false
              };
              return (
                <Word
                  key={`unparsed-${index}`}
                  word={parsedWord}
                  sentence={sentence}
                  isHighlighted={false}
                  fontSize={fontSize}
                  onPress={onWordPress}
                  onLongPress={onLongPress}
                  database={database}
                  isTranslation={false}
                />
              );
            })
          }
        </View>
      </TouchableWithoutFeedback>
      
      {/* Translation text rendering */}
      {isSelected && parsedSentence && (
        <View style={styles.translationContainer}>
          <View style={dynamicStyles.wordContainer}>
            {/* Add paragraph indentation spacer for the translation as well */}
            <View style={dynamicStyles.paragraphIndent} />
            
            {parsedSentence.translation.map((word, index) => (
              <Word
                key={`translation-${index}`}
                word={word}
                sentence={sentence}
                isHighlighted={isWordHighlighted(word)}
                fontSize={fontSize}
                onPress={onWordPress}
                database={database}
                isTranslation={true}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  translationContainer: {
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
    marginTop: 8,
    marginBottom: 16,
    paddingLeft: 16,
  }
});