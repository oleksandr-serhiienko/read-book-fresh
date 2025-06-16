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
      setSelectedOption(null);
      setShowResult(false);
    }, 1000);
  };

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