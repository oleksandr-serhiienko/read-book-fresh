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
  const [emphasizedWords, setEmphasizedWords] = useState<string[]>([]);
  const [targetSequence, setTargetSequence] = useState<string>('');

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

  const getEmphasizedWords = () => {
    const words = [];
    
    if (cardHelpers.getAllExamples(card) && cardHelpers.getAllExamples(card).length > 0) {
      const sentence = cardHelpers.getFirstExample(card)?.sentence ?? "";
      const emphasisMatches = sentence.match(/<em>(.*?)<\/em>/g);
      
      if (emphasisMatches) {
        emphasisMatches.forEach(match => {
          const word = match.replace(/<\/?em>/g, '');
          words.push(word);
        });
      }
    }
    
    // If no emphasized words found, use card.word
    if (words.length === 0) {
      words.push(card.word);
    }
    
    return words;
  };

  const getTargetSequence = (words: string[]) => {
    return words.join(' ... ');
  };

  const getTargetLettersSequence = (words: string[]) => {
    // Combine all letters from all words for the letter selection
    return words.join('');
  };

  const resetExercise = () => {
    const words = getEmphasizedWords();
    const sequence = getTargetSequence(words);
    const lettersSequence = getTargetLettersSequence(words);
    
    setEmphasizedWords(words);
    setTargetSequence(sequence);
    setShowLetterHelp(false);
    setInputWord('');
    setSelectedLetters([]);
    setLetterSources([]);
    setShowResult(false);
    setIsCorrect(null);
    setAvailableLetters(lettersSequence.split('').sort(() => Math.random() - 0.5));
  };

  const normalizeAnswer = (answer: string) => {
    return answer.trim().toLowerCase().replace(/\s+/g, ' ');
  };

  const isAnswerCorrect = (answer: string) => {
    const normalizedInput = normalizeAnswer(answer);
    const normalizedTarget = normalizeAnswer(targetSequence);
    
    // Also accept individual words or card.word
    const individualWordsCorrect = emphasizedWords.some(word => 
      normalizeAnswer(word) === normalizedInput
    );
    const cardWordCorrect = normalizeAnswer(card.word) === normalizedInput;
    
    return normalizedInput === normalizedTarget || individualWordsCorrect || cardWordCorrect;
  };

  const handleSuccess = () => {
    setShowResult(true);
    setIsCorrect(true);
    setTimeout(() => {
      onSuccess();
      // Don't reset here - let useEffect handle it when card changes
    }, 1000);
  };

  const handleFailure = () => {
    setShowResult(true);
    setIsCorrect(false);
    setTimeout(() => {
      onFailure();
      // Don't reset here - let useEffect handle it when card changes
    }, 1000);
  };

  const handleSubmit = () => {
    if (!inputWord.trim()) return;
    
    const isWordCorrect = isAnswerCorrect(inputWord);
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

    // Check if we've formed the complete sequence
    const targetLettersOnly = getTargetLettersSequence(emphasizedWords);
    if (newSelected.length === targetLettersOnly.length) {
      // Reconstruct the sequence with dots
      let reconstructed = '';
      let letterIndex = 0;
      
      for (let i = 0; i < emphasizedWords.length; i++) {
        const word = emphasizedWords[i];
        for (let j = 0; j < word.length; j++) {
          reconstructed += newSelected[letterIndex];
          letterIndex++;
        }
        if (i < emphasizedWords.length - 1) {
          reconstructed += ' ... ';
        }
      }
      
      // Add a small delay to let user see the completed word before auto-submission
      setTimeout(() => {
        const isWordCorrect = isAnswerCorrect(reconstructed);
        setIsCorrect(isWordCorrect);
        if (isWordCorrect) {
          handleSuccess();
        } else {
          handleFailure();
        }
      }, 500); // 500ms delay to let user see the completed word
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
    
    if (showResult) {
      // Show complete sentence with highlighted words
      return formatSentence(sentence);
    }
    
    // Show sentence with blanks
    let processedSentence = sentence;
    const emphasisMatches = sentence.match(/<em>(.*?)<\/em>/g);
    if (emphasisMatches) {
      emphasisMatches.forEach(match => {
        const word = match.replace(/<\/?em>/g, '');
        const underscores = '_'.repeat(word.length);
        processedSentence = processedSentence.replace(match, underscores);
      });
    }
    
    return processedSentence.replace(/<\/?em>/g, '');
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

  const renderLetterSlots = () => {
    const slots = [];
    let slotIndex = 0;
    
    for (let wordIndex = 0; wordIndex < emphasizedWords.length; wordIndex++) {
      const word = emphasizedWords[wordIndex];
      
      // Add letters for this word
      for (let letterIndex = 0; letterIndex < word.length; letterIndex++) {
        slots.push(
          <View 
            key={`letter-${slotIndex}`}
            style={[
              styles.letterSlot,
              showResult && (isAnswerCorrect(getReconstructedAnswer()) ? styles.correctWord : styles.wrongWord)
            ]}
          >
            <Text style={styles.letterText}>
              {selectedLetters[slotIndex] || ''}
            </Text>
          </View>
        );
        slotIndex++;
      }
      
      // Add dots between words (but not after the last word)
      if (wordIndex < emphasizedWords.length - 1) {
        slots.push(
          <View key={`dots-${wordIndex}`} style={styles.dotsContainer}>
            <Text style={styles.dotsText}>...</Text>
          </View>
        );
      }
    }
    
    return slots;
  };

  const getReconstructedAnswer = () => {
    let reconstructed = '';
    let letterIndex = 0;
    
    for (let i = 0; i < emphasizedWords.length; i++) {
      const word = emphasizedWords[i];
      for (let j = 0; j < word.length; j++) {
        if (selectedLetters[letterIndex]) {
          reconstructed += selectedLetters[letterIndex];
        }
        letterIndex++;
      }
      if (i < emphasizedWords.length - 1) {
        reconstructed += ' ... ';
      }
    }
    
    return reconstructed;
  };

  return (
    <ExerciseContainer>
     
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
              placeholder={`Type word here:`}
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
              {renderLetterSlots()}
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

            <View style={styles.backButtonContainer}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setShowLetterHelp(false)}
              >
                <Text style={styles.buttonText}>Back to Typing</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  translationText: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
    color: '#666',
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
    alignItems: 'center',
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
  dotsContainer: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  availableLettersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
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
  backButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  backButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 140,
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