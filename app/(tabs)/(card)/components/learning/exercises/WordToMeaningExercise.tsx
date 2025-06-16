import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';
import ExerciseContainer from '../../shared/exerciseContainer';
import { Link } from 'expo-router';
import { HelpCircle, Volume2, VolumeX } from 'lucide-react-native';
import { Transform } from '@/components/transform';
import { cardHelpers } from '@/components/db/database';

const localStyles = StyleSheet.create({
  originalContext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  highlightedWord: {
    fontWeight: 'bold',
    color: '#333',
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
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  word: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  }

});

const styles = {
  ...learningStyles,
  ...localStyles,
};

const WordToMeaningExercise: React.FC<LearningExerciseProps> = ({
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

  useEffect(() => {
    const otherOptions = otherCards
      .filter(c => c.id !== card.id)
      .map(c => cardHelpers.getFirstMeaning(c))
      .slice(0, 3);

    const shuffledOptions = [cardHelpers.getFirstMeaning(card), ...otherOptions]
      .sort(() => Math.random() - 0.5);
      
    setOptions(shuffledOptions);
  }, [card.id]);

  const handleOptionPress = (option: string) => {
    if (showResult) return;
    setSelectedOption(option);
    setShowResult(true);
    
    setTimeout(() => {
      if (option === cardHelpers.getFirstMeaning(card)) {
        onSuccess();
      } else {
        onFailure();
      }
      setSelectedOption(null);
      setShowResult(false);
    }, 1000);
  };

  const formatSentence = (sentence: string) => {
    if (!sentence) return "";
    
    if (sentence.includes('<em>')) {
      return sentence.split(/(<em>.*?<\/em>)/).map((part, index) => {
        if (part.startsWith('<em>') && part.endsWith('</em>')) {
          const word = part.replace(/<\/?em>/g, '');
          return (
            <Text key={index} style={styles.highlightedWord}>
              {word}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      });
    }

    return sentence;
  };

  const getContextToShow = () => {
    if (!card.info?.sentence) {
      if (cardHelpers.getAllExamples(card)) {
        return formatSentence(cardHelpers.getFirstExample(card)?.sentence ?? "");
      }
      return "";
    }
    return formatSentence(card.info.sentence);
  };

    return (
      <ExerciseContainer>
        <View style={styles.controlsRow}>
          <Link
            href={{
              pathname: "/wordInfo",
              params: {
                content: JSON.stringify(Transform.fromCardToWord(card)),
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
    
        <View style={styles.wordContainer}>
          <Text style={styles.word}>{card.word}</Text>
        </View>
    
        <Text style={styles.originalContext}>
          {getContextToShow()}
        </Text>
    
        <View style={styles.optionsContainer}>
          {options.map((option, index) => {
            const isSelected = selectedOption === option;
            const isCorrect = showResult && option === cardHelpers.getFirstMeaning(card);
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

export default WordToMeaningExercise;