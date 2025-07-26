import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';
import ExerciseContainer from '../../shared/exerciseContainer';
import { cardHelpers } from '@/components/db/database';
import { Link } from 'expo-router';
import { HelpCircle, Volume2, VolumeX } from 'lucide-react-native';

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
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  controlButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  speaking: {
    backgroundColor: '#e0e0e0',
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
  otherCards,
  isSpeakerOn = false,
  onToggleSpeaker = () => {},
  isSpeaking = false
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
       
    if (option === card.word) {
      onSuccess();
    } else {
      onFailure();
    }        
  };

  return (
    <ExerciseContainer>
      <View style={styles.controlsRow}>
        <Link
          href={{
            pathname: "/wordInfo",
            params: {
              content: JSON.stringify(card.id),
              added: 'true'
            }
          }}
          asChild
        >
          <TouchableOpacity style={styles.controlButton}>
            <HelpCircle size={24} color="#666" />
          </TouchableOpacity>
        </Link>
        <TouchableOpacity 
          style={[styles.controlButton, isSpeaking && styles.speaking]}
          onPress={onToggleSpeaker}
          disabled={isSpeaking}
        >
          {isSpeakerOn ? (
            <Volume2 size={24} color="#666" />
          ) : (
            <VolumeX size={24} color="#666" />
          )}
        </TouchableOpacity>
      </View>
    
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