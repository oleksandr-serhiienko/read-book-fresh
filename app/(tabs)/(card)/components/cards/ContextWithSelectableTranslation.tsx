import React, { FC, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { createExampleHashSync, renderHighlightedText } from '../shared/helpers';
import { cardHelpers, Example } from '@/components/db/database';

// Define complete local styles
const localStyles = StyleSheet.create({
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 200,
    width: '100%',
  },
  selectableTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  contextText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
  },
  wordButton: {
    padding: 6,
    borderRadius: 6,
    position: 'relative',
    minHeight: 40,
  },
  correctWord: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  partialCorrectWord: {
    backgroundColor: 'rgba(241, 196, 15, 0.2)',
    borderWidth: 1,
    borderColor: '#f1c40f',
  },
  wrongWord: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  translationContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  showAnswerButton: {
    marginTop: 20,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 3,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  }
});

// No need to merge with cardStyles since we've defined all needed styles locally
const styles = localStyles;

function cleanWord(word: string) {
  if (!word || typeof word !== 'string') {
    return '';
  }
  
  // Trim non-letters from start and end
  // \p{L} matches any kind of letter from any language
  return word
    .replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
    .trim()
    .toLowerCase(); // Convert to lowercase for case-insensitive comparison
}

const ContextWithSelectableTranslation: FC<CardProps> = ({ card, onShowAnswer, contextId, isFlipping }) => {
  // Check if there are any examples
  const allExamples = cardHelpers.getAllExamples(card);
  if (allExamples.length === 0) return null;
  
  // Track the selected indices
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [correctIndices, setCorrectIndices] = useState<number[]>([]);
  const [isAllCorrect, setIsAllCorrect] = useState<boolean>(false);
  
  // Store card id and context hash for comparison when props change
  const [currentCardId, setCurrentCardId] = useState<number | null>(null);
  const [currentContextHash, setCurrentContextHash] = useState<string | null>(null);

  // Find the example that matches the contextId (which is now a hash)
  let selectedExample: Example | null = null;
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
  
  if (!selectedExample) return null;
  
  // Extract the translation raw sentence with <em> tags
  const translationRawSentence = selectedExample.translation || '';
  // Clean version for display
  const translationSentence = translationRawSentence.replace(/<\/?em>/g, '');
  const words = translationSentence.split(/\s+/);
  
  // Reset selections when card changes
  useEffect(() => {
    // Check if card or context has changed
    if (card.id !== currentCardId || contextId !== currentContextHash) {
      // Reset selection state
      setSelectedIndices([]);
      setIsAllCorrect(false);
      setCurrentCardId(card.id || null);
      setCurrentContextHash(contextId || null);
    }
  }, [card.id, contextId]);
  
  // Reset selections when isFlipping changes from true to false
  useEffect(() => {
    if (isFlipping === false) {
      // Reset selection state when flipping animation finishes
      setSelectedIndices([]);
      setIsAllCorrect(false);
    }
  }, [isFlipping]);
  
  // Extract the correct answer indices from the <em> tags
  useEffect(() => {
    const getCorrectIndices = () => {
      const emphasisContent = [];
      let match;
      const emphasisRegex = /<em>(.*?)<\/em>/g;
      
      while ((match = emphasisRegex.exec(translationRawSentence)) !== null) {
        emphasisContent.push(match[1]);
      }
      
      // Join all emphasized parts with space
      const combinedEmphasis = emphasisContent.join(' ');
      
      // Split into individual words
      const correctWords = combinedEmphasis.split(/\s+/);
      
      // Find indices of these words in the sentence
      const indices: number[] = [];
      words.forEach((word, index) => {
        if (correctWords.some(correctWord => 
          cleanWord(word) === cleanWord(correctWord))) {
          indices.push(index);
        }
      });
      
      setCorrectIndices(indices);
    };
    
    getCorrectIndices();
  }, [translationRawSentence]);

  // Function to check if the current selection is correct
  const checkCorrectness = (indices: number[]) => {
    // Check if we've selected all correct words and only correct words
    const allCorrectWordsSelected = correctIndices.every(i => 
      indices.includes(i));
    const onlyCorrectWordsSelected = indices.every(i => 
      correctIndices.includes(i));
    
    // Set as correct if:
    // 1. The selection only includes correct words, AND
    // 2. Either all correct words are selected OR this is a single correct word answer
    const isSingleWordAnswer = correctIndices.length === 1;
    
    return onlyCorrectWordsSelected && (allCorrectWordsSelected || (isSingleWordAnswer && indices.length > 0));
  };
  
  const handleWordPress = (word: string, index: number) => {
    let newSelectedIndices: number[];
    
    // Check if this index is already selected
    if (selectedIndices.includes(index)) {
      // Remove from selection if already there
      newSelectedIndices = selectedIndices.filter(i => i !== index);
    } else {
      // Add this index to selected indices
      newSelectedIndices = [...selectedIndices, index];
    }
    
    // Update the state
    setSelectedIndices(newSelectedIndices);
    
    // Check if the new selection is correct
    const isCorrect = checkCorrectness(newSelectedIndices);
    setIsAllCorrect(isCorrect);
  };
  
  // Function to determine which style to apply to each word
  const getWordStyle = (index: number) => {
    const isSelected = selectedIndices.includes(index);
    const isCorrect = correctIndices.includes(index);
    
    if (!isSelected) {
      return styles.wordButton;
    }
    
    if (isAllCorrect) {
      return {...styles.wordButton, ...styles.correctWord};
    } else if (isCorrect) {
      return {...styles.wordButton, ...styles.partialCorrectWord};
    } else {
      return {...styles.wordButton, ...styles.wrongWord};
    }
  };
  
  // Simple implementation for renderHighlightedText if the imported one doesn't work
  const renderHighlightedTextFallback = (text: string) => {
    const parts = text.split(/(<em>.*?<\/em>)/);
    return parts.map((part, index) => {
      if (part.startsWith('<em>') && part.endsWith('</em>')) {
        return (
          <Text key={index} style={{fontWeight: 'bold'}}>
            {part.slice(4, -5)}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };
  
  return (
    <View style={styles.cardContent}>
      <Text style={styles.contextText}>
        {renderHighlightedText
          ? renderHighlightedText(selectedExample?.sentence ?? "", styles)
          : renderHighlightedTextFallback(selectedExample?.sentence ?? "")}
      </Text>
      
      <View style={styles.translationContainer}>
        <View style={styles.selectableTextContainer}>
          {words.map((word, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleWordPress(word, index)}
              style={getWordStyle(index)}
            >
              <Text style={styles.contextText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
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

export default ContextWithSelectableTranslation;