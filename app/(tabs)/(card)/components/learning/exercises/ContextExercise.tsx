// ContextExercise.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';
import ExerciseContainer from '../../shared/exerciseContainer';
import { cardHelpers } from '@/components/db/database';

const ContextExercise: React.FC<LearningExerciseProps> = ({
  card,
  onSuccess,
  onFailure,
  otherCards
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [options, setOptions] = useState<string[]>([]); // Add this line

  // Add this useEffect
  useEffect(() => {
    // Get 3 random words from other cards
    const otherOptions = otherCards
      .filter(c => c.id !== card.id)
      .map(c => c.word)
      .slice(0, 3);

    // Combine with correct answer and shuffle
    const shuffledOptions = [card.word, ...otherOptions]
      .sort(() => Math.random() - 0.5);
      
    setOptions(shuffledOptions);
  }, [card.id]); // Only regenerate when card changes

  const handleOptionPress = (option: string) => {
    setSelectedOption(option);
    setShowResult(true);
    
    setTimeout(() => {
      if (option === card.word) {
        onSuccess();
      } else {
        onFailure();
      }
      setSelectedOption(null);
      setShowResult(false);
    }, 1000);
  };

  const getSentenceWithBlank = (sentence: string, word: string): string => {
    // First remove <em> tags if they exist
    const cleanSentence = sentence.replace(/<\/?em>/g, '');
    // Then replace the word with underscores
    return cleanSentence.replace(new RegExp(`\\b${word}\\b`, 'gi'), '_____');
  };

  if (!cardHelpers.getAllExamples(card) || cardHelpers.getAllExamples(card).length === 0) {
    return (
      <View style={learningStyles.container}>
        <View style={learningStyles.cardContent}>
          <Text style={learningStyles.contextText}>No context available</Text>
        </View>
      </View>
    );
  }

  return (
    <ExerciseContainer>       
      <Text style={learningStyles.contextText}>
        {getSentenceWithBlank(cardHelpers.getFirstExample(card)?.sentence ?? '', card.word)}
      </Text>
      <View style={learningStyles.translationContainer}>
        <Text style={learningStyles.contextText}>
          {cardHelpers.getFirstMeaning(card).replace(/<\/?em>/g, '')}
        </Text>
      </View>
      <View style={learningStyles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrect = showResult && option === card.word;
          const isWrong = showResult && isSelected && !isCorrect;

          return (
            <TouchableOpacity
              key={index}
              style={[
                learningStyles.option,
                isCorrect && learningStyles.correctOption,
                isWrong && learningStyles.wrongOption,
              ]}
              onPress={() => handleOptionPress(option)}
              disabled={showResult}
            >
              <Text style={learningStyles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ExerciseContainer>
  );
};

export default ContextExercise;