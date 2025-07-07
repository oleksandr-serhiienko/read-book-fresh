import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';
import ExerciseContainer from '../../shared/exerciseContainer';
import { cardHelpers } from '@/components/db/database';

const localStyles = StyleSheet.create({
  alternateTranslations: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  contextSentence: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 20,
    lineHeight: 24,
  }
});

const styles = {
  ...learningStyles,
  ...localStyles,
};

const MeaningToWordExercise: React.FC<LearningExerciseProps> = ({
  card,
  onSuccess,
  onFailure,
  otherCards
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const alternateTranslations = cardHelpers.getAllMeanings(card).slice(1);

  useEffect(() => {
    setSelectedOption(null);
    setShowResult(false);
    const otherOptions = otherCards
      .filter(c => c.id !== card.id)
      .map(c => c.word)
      .slice(0, 3);

    const shuffledOptions = [card.word, ...otherOptions]
      .sort(() => Math.random() - 0.5);
      
    setOptions(shuffledOptions);
  }, [card.id]);

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

  const hasExampleSentence = cardHelpers.getAllExamples(card) && cardHelpers.getAllExamples(card).length > 0;

  return (
    <ExerciseContainer>    
      <Text style={styles.word}>{cardHelpers.getFirstMeaning(card)}</Text>
      {alternateTranslations.length > 0 && (
        <Text style={styles.alternateTranslations}>
          {alternateTranslations.join(', ')}
        </Text>
      )}

      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = selectedOption === option;
          const isCorrect = showResult && option === card.word;
          const isWrong = showResult && isSelected && !isCorrect;

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                isCorrect && styles.correctOption,
                isWrong && styles.wrongOption,
              ]}
              onPress={() => handleOptionPress(option)}
              disabled={showResult}
            >
              <Text style={styles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ExerciseContainer>
);
};

export default MeaningToWordExercise;