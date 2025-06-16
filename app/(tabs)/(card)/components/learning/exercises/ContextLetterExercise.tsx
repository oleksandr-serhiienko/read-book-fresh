import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Keyboard } from 'react-native';
import { LearningExerciseProps } from '../LearningFactory';
import { learningStyles } from '../../shared/styles';
import ExerciseContainer from '../../shared/exerciseContainer';
import { cardHelpers } from '@/components/db/database';

const ContextInputExercise: React.FC<LearningExerciseProps> = ({
  card,
  onSuccess,
  onFailure
}) => {
  const [showLetterHelp, setShowLetterHelp] = useState(false);
  const [inputWord, setInputWord] = useState('');
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [letterSources, setLetterSources] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);

  useEffect(() => {
    resetExercise();
  }, [card.word]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const resetExercise = () => {
    setShowLetterHelp(false);
    setInputWord('');
    setSelectedLetters([]);
    setLetterSources([]);
    setShowResult(false);
    setShowCorrectAnswer(false);
    setIsCorrect(null);
    setAvailableLetters(card.word.split('').sort(() => Math.random() - 0.5));
  };

  const handleSuccess = () => {
    setShowResult(true);
    setIsCorrect(true);
    // Don't show the overlay for correct answers
    setTimeout(() => {
      onSuccess();
      resetExercise();
    }, 1000);
  };

  const handleFailure = () => {
    setShowResult(true);
    setIsCorrect(false);
    setShowCorrectAnswer(true); // Only show overlay for wrong answers
    setTimeout(() => {
      onFailure();
      resetExercise();
    }, 1000);
  };

  const handleSubmit = () => {
    if (!inputWord.trim()) return;
    
    const isWordCorrect = inputWord.trim().toLowerCase() === card.word.toLowerCase();
    setIsCorrect(isWordCorrect);
    
    if (isWordCorrect) {
      handleSuccess();
    } else {
      handleFailure();
    }
  };

  const handleLetterPress = (letter: string, index: number) => {
    if (showResult) return;

    const newSelected = [...selectedLetters, letter];
    setSelectedLetters(newSelected);
    setLetterSources(prev => [...prev, index]);
    setAvailableLetters(prev => prev.filter((_, i) => i !== index));

    if (newSelected.length === card.word.length) {
      const isWordCorrect = newSelected.join('') === card.word;
      setIsCorrect(isWordCorrect);
      if (isWordCorrect) {
        handleSuccess();
      } else {
        handleFailure();
      }
    }
  };

  const handleDeleteLetter = () => {
    if (selectedLetters.length === 0 || showResult) return;
    
    const lastLetterIndex = letterSources[letterSources.length - 1];
    const lastLetter = selectedLetters[selectedLetters.length - 1];
    
    setSelectedLetters(prev => prev.slice(0, -1));
    setLetterSources(prev => prev.slice(0, -1));
    
    setAvailableLetters(prev => {
      const newLetters = [...prev];
      newLetters.splice(lastLetterIndex, 0, lastLetter);
      return newLetters;
    });
  };

  const getContextSentence = () => {
    if (!cardHelpers.getAllExamples(card) || cardHelpers.getAllExamples(card).length === 0) return '';
    
    const sentence = cardHelpers.getFirstExample(card)?.sentence ?? "";
    const matchWord = sentence.match(/<em>(.*?)<\/em>/);
    if (!matchWord) return sentence.replace(/<\/?em>/g, '');
    
    const cleanSentence = sentence.replace(/<\/?em>/g, '');
    return cleanSentence.replace(
      new RegExp(`\\b${matchWord[1]}\\b`, 'gi'), 
      '_'.repeat(card.word.length)
    );
  };

  const getContextTranslation = () => {
    if (!cardHelpers.getAllExamples(card) || cardHelpers.getAllExamples(card).length === 0) return '';
    return cardHelpers.getFirstMeaning(card).replace(/<\/?em>/g, '');
  };

  return (
    <ExerciseContainer
      correctAnswer={card.word}
      showCorrect={showCorrectAnswer}>
     
        {(!keyboardVisible || showLetterHelp) && (
          <ScrollView style={styles.contextScrollView}>
            <Text style={[learningStyles.contextText, styles.centeredText]}>
              {getContextSentence()}
            </Text>
          </ScrollView>
        )}

        {!showLetterHelp ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.textInput,
                showResult && isCorrect !== null && (
                  isCorrect ? styles.correctInput : styles.wrongInput
                )
              ]}
              value={inputWord}
              onChangeText={setInputWord}
              placeholder="Type the word..."
              autoCapitalize="none"
              autoCorrect={false}
              editable={!showResult}
              onSubmitEditing={handleSubmit}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!inputWord.trim() || showResult) && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={!inputWord.trim() || showResult}
              >
                <Text style={styles.buttonText}>Check</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.helpButton}
                onPress={() => setShowLetterHelp(true)}
              >
                <Text style={styles.buttonText}>Need Help?</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.letterSelectContainer}>
            <View style={styles.selectedLettersContainer}>
              {Array.from({ length: card.word.length }).map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.letterSlot,
                    showResult && (selectedLetters.join('') === card.word ? styles.correctWord : styles.wrongWord)
                  ]}
                >
                  <Text style={styles.letterText}>
                    {selectedLetters[index] || ''}
                  </Text>
                </View>
              ))}
            </View>

            {selectedLetters.length > 0 && !showResult && (
              <View style={styles.controlButtons}>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={handleDeleteLetter}
                >
                  <Text style={styles.controlButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.controlButton}
                  onPress={resetExercise}
                >
                  <Text style={styles.controlButtonText}>Reset</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.availableLettersContainer}>
              {availableLetters.map((letter, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.letterButton}
                  onPress={() => handleLetterPress(letter, index)}
                  disabled={showResult}
                >
                  <Text style={styles.letterButtonText}>{letter}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {(!keyboardVisible || showLetterHelp) && (
          <ScrollView style={styles.translationScrollView}>
            <Text style={[learningStyles.contextText, styles.centeredText]}>
              {getContextTranslation()}
            </Text>
          </ScrollView>
        )}

    </ExerciseContainer>
  );
};

const styles = StyleSheet.create({
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  controlButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
  },
  controlButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  correctInput: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderColor: '#2ecc71',
  },
  wrongInput: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: '#e74c3c',
  },
  disabledButton: {
    opacity: 0.5,
  },
  textInput: {
    width: '80%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    backgroundColor: '#fff',
  },
  contextScrollView: {
    maxHeight: 100,
    marginBottom: 20,
  },
  translationScrollView: {
    maxHeight: 80,
    marginTop: 20,
  },
  centeredText: {
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  submitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  helpButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  letterSelectContainer: {
    width: '100%',
    alignItems: 'center',
  },
  selectedLettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  letterSlot: {
    width: 36,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  letterText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  availableLettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  letterButton: {
    width: 36,
    height: 40,
    backgroundColor: '#e8e8e8',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  correctWord: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderColor: '#2ecc71',
  },
  wrongWord: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderColor: '#e74c3c',
  },
});

export default ContextInputExercise;