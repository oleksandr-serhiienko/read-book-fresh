import React, { FC, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';
import { getWordHints } from '../../../../../components/db/nextWordToLearn';
import { Card, cardHelpers } from '@/components/db/database';
import { createExampleHashSync, selectBestContext } from '../shared/helpers';

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

const ContextWithBlankOriginal: FC<CardProps> = ({ card, onShowAnswer, contextId, isFlipping }) => {
  const [showHints, setShowHints] = useState(false);
  useEffect(() => {
    setShowHints(false);
  }, [card.word]); // Reset when word changes
  
  // Check if there are any examples
  const allExamples = cardHelpers.getAllExamples(card);
  if (allExamples.length === 0) return null;
  
  // Find the example that matches the contextId (which is now a hash)
  let selectedExample = null;
  for (const example of allExamples) {
    const hash = createExampleHashSync(example.sentence || '', example.translation || '');
    if (hash === contextId) {
      selectedExample = example;
      break;
    }
  }
  
  // If no match found, use the first example
  if (!selectedExample) {
    selectedExample = allExamples[0];
  }
  
  const originalSentence = selectedExample.sentence?.replace(/<\/?em>/g, '') || '';
  const hints = getWordHints(card.word);
  
  const renderHighlightedText = (text: string) => {
    return text.replace(/<\/?em>/g, '');
  };
  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {originalSentence.replace(card.word, '_'.repeat(card.word.length))}
      </Text>

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
      
      <View style={styles.translationContainer}>
        <Text style={styles.contextText}>
          {renderHighlightedText(selectedExample.translation ?? "")}
        </Text>
      </View>

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

export default ContextWithBlankOriginal;