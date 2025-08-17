import React, { FC, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';
import { getWordHints } from '../../../../../components/db/nextWordToLearn';
import { createExampleHashSync, selectBestContext } from '../shared/helpers';
import { cardHelpers, Example } from '@/components/db/database';

const renderHighlightedText = (text: string) => {
  return text.replace(/<\/?em>/g, '');
};

const localStyles = StyleSheet.create({
  contextText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  translationContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  // New styles for hints
  hintsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    padding: 10,
  },
  hintLetter: {
    fontSize: 18,
    color: '#666',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    minWidth: 36,
    textAlign: 'center',
  },
  showHintsButton: {
    marginVertical: 10,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    alignSelf: 'center',
  },
  showHintsText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});

const styles = {
  ...cardStyles,
  ...localStyles,
};

const ContextWithBlankTranslation: FC<CardProps> = ({ card, onShowAnswer, contextId, isFlipping }) => {
  const [showHints, setShowHints] = useState(false);
  
  useEffect(() => {
    setShowHints(false);
  }, [card.word]); // Reset when word changes
  
  const allExamples = cardHelpers.getAllExamples(card);
  if (allExamples.length === 0) return null;

  // Find the example that matches the contextId (which is now a hash)
  let selectedExample: Example | null = null;
  for (const example of allExamples) {
    const hash = createExampleHashSync(example.source || '', example.target || '');
    if (hash === contextId) {
      selectedExample = example;
      break;
    }
  }

  // If no match found, use the first example
  if (!selectedExample) {
    selectedExample = allExamples[0];
  }

  if (!selectedExample) return null;

  const originalTranslation = selectedExample.translation || '';
  
  // Function to replace text between <em></em> tags with underscores
  const renderTextWithBlanks = (text: string) => {
    return text.replace(/<em>(.*?)<\/em>/g, (match, content) => {
      return '_'.repeat(content.length);
    });
  };
  
  // Extract the text between <em></em> tags for hints
  const getEmphasisedText = (text: string) => {
    const matches = text.match(/<em>(.*?)<\/em>/g);
    if (matches) {
      // Extract content from all matches and join with space
      const contents = matches.map(match => match.replace(/<\/?em>/g, ''));
      return contents.join(' ');
    }
    
    // Fallback to existing logic if no <em> tags found
    const allMeanings = cardHelpers.getAllMeanings(card);
    return allMeanings.find(meaning => text.toLowerCase().includes(meaning.toLowerCase())) 
      ?? allMeanings[0] 
      ?? '';
  };

  const emphasisedText = getEmphasisedText(originalTranslation);
  const hints = getWordHints(emphasisedText);
  
  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {renderHighlightedText(selectedExample?.sentence ?? "")}
      </Text>
      
      <View style={styles.translationContainer}>
        <Text style={styles.contextText}>
          {renderTextWithBlanks(originalTranslation)}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.showHintsButton}
        onPress={() => setShowHints(!showHints)}
      >
        <Text style={styles.showHintsText}>
          {showHints ? 'Hide Hints' : 'Show Hints (?)'} 
        </Text>
      </TouchableOpacity>

      {showHints && (
        <View style={styles.hintsContainer}>
          {hints.map((letter: string, index: number) => (
            <Text key={index} style={styles.hintLetter}>
              {letter}
            </Text>
          ))}
        </View>
      )}

      {!isFlipping && onShowAnswer && (
        <TouchableOpacity 
          style={styles.showAnswerButton}
          onPress={onShowAnswer}
        >
          <Text style={styles.buttonText}>Show Answer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ContextWithBlankTranslation;