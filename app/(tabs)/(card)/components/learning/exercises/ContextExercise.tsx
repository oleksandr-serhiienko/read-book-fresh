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
  const [options, setOptions] = useState<string[]>([]);

  // Add this useEffect
  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
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

    }, 1000);
  };

  const getSentenceWithBlank = (sentence: string, word: string): string => {
    // Replace words that are between <em> tags with underscores
    return sentence.replace(/<em>(.*?)<\/em>/g, '_____');
  };

  const formatSentence = (sentence: string) => {
    if (!sentence) return "";
    
    if (sentence.includes('<em>')) {
      return sentence.split(/(<em>.*?<\/em>)/).map((part, index) => {
        if (part.startsWith('<em>') && part.endsWith('</em>')) {
          const word = part.replace(/<\/?em>/g, '');
          return (
            <Text key={index} style={{ fontWeight: 'bold', color: '#333' }}>
              {word}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      });
    }

    return sentence;
  };

  if (!cardHelpers.getAllExamples(card) || cardHelpers.getAllExamples(card).length === 0) {
    return (
      <ExerciseContainer>
        <View style={learningStyles.cardContent}>
          <Text style={learningStyles.contextText}>No context available for:</Text>
          <Text style={[learningStyles.contextText, { fontWeight: 'bold', fontSize: 20, marginVertical: 10 }]}>
            {card.word}
          </Text>
          <View style={[learningStyles.optionsContainer, { marginTop: 20 }]}>
            <TouchableOpacity
              style={[learningStyles.option, { backgroundColor: '#3498db' }]}
              onPress={() => onSuccess()}
            >
              <Text style={[learningStyles.optionText, { color: '#fff' }]}>
                Skip this word
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ExerciseContainer>
    );
  }

  return (
    <ExerciseContainer>
      <Text style={learningStyles.contextText}>
        {showResult ? 
          formatSentence(cardHelpers.getFirstExample(card)?.sentence ?? '') :
          getSentenceWithBlank(cardHelpers.getFirstExample(card)?.sentence ?? '', card.word)
        }
      </Text>
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