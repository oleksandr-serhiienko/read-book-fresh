// learning.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { Card, cardHelpers, database } from '@/components/db/database';
import { useLanguage } from '@/app/languageSelector';
import { LearningType, getLearningComponent } from './components/learning/LearningFactory';
import languages from '@/components/reverso/languages/entities/languages';
import voices from '@/components/reverso/languages/voicesTranslate';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger, LogCategories } from '@/utils/logger';

type ExerciseSession = {
  type: LearningType;
  cards: Card[];
  currentIndex: number;
};

export default function LearningScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [currentSession, setCurrentSession] = useState<ExerciseSession | null>(null);
  const { sourceLanguage, targetLanguage } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [showCard, setShowCard] = useState(true);
  const [slideResult, setSlideResult] = useState<boolean | null>(null);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const languageKey = sourceLanguage.toLowerCase() as keyof typeof languages;

  const CARDS_PER_SESSION = 5; // Number of cards to show per exercise type

  useEffect(() => {
    const loadCards = async () => {
      await database.initialize();
      const cards = await database.getAllCards(
        sourceLanguage.toLowerCase(),
        targetLanguage.toLowerCase()
      );
      const learningCards = cards.filter(card => 
        card.info?.status === 'learning'
      );
      
      // Shuffle the cards initially
      const shuffledCards = [...learningCards].sort(() => Math.random() - 0.5);
      setAllCards(shuffledCards);
      
      // Initialize first session
      if (shuffledCards.length > 0) {
        setCurrentSession({
          type: 'wordToMeaning',
          cards: shuffledCards.slice(0, CARDS_PER_SESSION),
          currentIndex: 0
        });
      }
    };

    loadCards();
  }, [sourceLanguage, targetLanguage]);

  useEffect(() => {
    const loadSpeakerState = async () => {
      try {
        const state = await AsyncStorage.getItem('speaker_state');
        setIsSpeakerOn(state === null ? true : state === 'true');
      } catch (error) {
        logger.error(LogCategories.ERROR, 'Error loading speaker state', { error: error instanceof Error ? error.message : String(error) });
      }
    };
    
    loadSpeakerState();
  }, []);
  
  // Add this function to save speaker state
  const saveSpeakerState = async (state: boolean) => {
    try {
      await AsyncStorage.setItem('speaker_state', state.toString());
    } catch (error) {
      logger.error(LogCategories.ERROR, 'Error saving speaker state', { error: error instanceof Error ? error.message : String(error) });
    }
  };
  
  // Modify the handleSpeak function to check speaker state
  const handleSpeak = (word: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!isSpeakerOn) {
        resolve();
        return;
      }
      
      setIsSpeaking(true);
      try {
        const options = {
          language: voices[languageKey as keyof typeof voices] || 'en-US',
          pitch: 1.0,
          rate: 0.75,
          onDone: () => {
            setIsSpeaking(false);
            resolve();
          }
        };    
        Speech.speak(word, options);
      } catch (error) {
        logger.error(LogCategories.ERROR, 'Error speaking text', { error: error instanceof Error ? error.message : String(error), word });
        setIsSpeaking(false);
        resolve();
      }
    });
  };
  
  // Add this function to toggle speaker
  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    saveSpeakerState(newState);
  };

 
  
  // Modify handleSuccess to properly await the speech
  const handleSuccess = async () => {
    if (!currentSession) return;
    
    const currentCard = currentSession.cards[currentSession.currentIndex];
    
    // Initialize card.info if it doesn't exist
    if (!currentCard.info) {
      currentCard.info = {
        status: 'learning',
        learningProgress: {
          wordToMeaning: 0,
          meaningToWord: 0,
          context: 0,
          contextLetters: 0
        },
        sentence: cardHelpers.getFirstExample(currentCard)?.sentence ?? ""
      };
    }
  
    // Update learning progress
    if (currentCard.info.learningProgress) {
      currentCard.info.learningProgress[currentSession.type]++;
      await database.updateCard(currentCard);
    }
  
    // Check if card should move to reviewing status
    if (currentSession.type === "contextLetters" && 
        currentCard.info.learningProgress.context > 0 && 
        currentCard.info.learningProgress.contextLetters > 0 &&
        currentCard.info.learningProgress.meaningToWord > 0 &&
        currentCard.info.learningProgress.wordToMeaning > 0) {
      currentCard.info.status = 'reviewing';
      await database.updateCard(currentCard);
      
      setAllCards(prevCards => {
        const updatedCards = prevCards.filter(card => card.id !== currentCard.id);
        const learningCards = updatedCards.filter(card => card.info?.status === 'learning');
        return learningCards;
      });
    }
  
    // Wait for speech to complete before moving to next
    await handleSpeak(currentCard.word);
    
    moveToNext(true); // Pass true for correct answer
  };

  const handleFailure = async () => {
    if (!currentSession) return;
    
    const currentCard = currentSession.cards[currentSession.currentIndex];
    
    // Initialize card.info if it doesn't exist
    currentCard.info = {
      status: 'learning',
      learningProgress: {
        wordToMeaning: 0,
        meaningToWord: 0,
        context: 0,
        contextLetters: 0
      }, 
      sentence : currentCard.info?.sentence ?? ""
    }
    // Now we can safely update learningProgress
    if (currentCard.info.learningProgress) {
      currentCard.info.learningProgress[currentSession.type]++;
      await database.updateCard(currentCard);
    }
    await handleSpeak(currentCard.word);
    moveToNext(false); // Pass false for incorrect answer
  };


  const moveToNext = (isCorrect: boolean) => {
    if (!currentSession) return;
    
    // Hide the card and start slide animation
    setShowCard(false);
    setSlideResult(isCorrect);
    
    // Slide right for correct (positive), left for incorrect (negative)
    const slideDirection = isCorrect ? 1 : -1;
    
    // Start slide animation
    Animated.timing(slideAnimation, {
      toValue: slideDirection,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // After slide completes, update session
      const nextIndex = currentSession.currentIndex + 1;
      
      if (nextIndex >= currentSession.cards.length) {
        const exerciseTypes: LearningType[] = [
          'wordToMeaning',
          'meaningToWord',
          'context',
          'contextLetters'
        ];
        const currentTypeIndex = exerciseTypes.indexOf(currentSession.type);
        
        if (currentTypeIndex >= exerciseTypes.length - 1) {
          // Get remaining learning cards
          const remainingCards = allCards.filter(card => card.info?.status === 'learning');
          if (remainingCards.length > 0) {
            // Shuffle remaining cards
            const shuffledRemaining = [...remainingCards].sort(() => Math.random() - 0.5);
            setAllCards(shuffledRemaining);
            setCurrentSession({
              type: 'wordToMeaning',
              cards: shuffledRemaining.slice(0, CARDS_PER_SESSION),
              currentIndex: 0
            });
          } else {
            setCurrentSession(null);
            return;
          }
        } else {
          // Move to next exercise type with same cards but shuffled
          const shuffledCards = [...currentSession.cards].sort(() => Math.random() - 0.5);
          setCurrentSession({
            type: exerciseTypes[currentTypeIndex + 1],
            cards: shuffledCards,
            currentIndex: 0
          });
        }
      } else {
        // Move to next card in current session
        setCurrentSession({
          ...currentSession,
          currentIndex: nextIndex
        });
      }
      
      // Show the new card and reset slide animation
      setShowCard(true);
      setSlideResult(null);
      slideAnimation.setValue(0);
    });
  };

  const getOtherCards = (currentCard: Card) => {
    return allCards.filter(c => c.id !== currentCard.id);
  };

  if (!currentSession || allCards.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No words to learn right now</Text>
      </View>
    );
  }

  const CurrentExercise = getLearningComponent(currentSession.type);
  const currentCard = currentSession.cards[currentSession.currentIndex];

  const getExerciseTitle = (type: LearningType) => {
    switch (type) {
      case 'wordToMeaning':
        return 'Word to Translation';
      case 'meaningToWord':
        return 'Translation to Word';
      case 'context':
        return 'Context Learning';
      default:
        return 'Learning Words';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{getExerciseTitle(currentSession.type)}</Text>
        <Text style={styles.progressText}>
          {currentSession.currentIndex + 1} of {currentSession.cards.length}
        </Text>
      </View>
      <Text style={styles.progressText}>
        {currentSession.currentIndex + 1} of {currentSession.cards.length}
      </Text>
  
      <View style={styles.cardContainer}>
        {showCard && currentSession && (
          <CurrentExercise
            key={`${currentSession.type}-${currentCard.id}-${currentSession.currentIndex}`}
            card={currentCard}
            onSuccess={handleSuccess}
            onFailure={handleFailure}
            otherCards={getOtherCards(currentCard)}
            isSpeakerOn={isSpeakerOn}
            onToggleSpeaker={toggleSpeaker}
            isSpeaking={isSpeaking}
          />
        )}
        
        {/* Slide animation overlay */}
        {slideResult !== null && (
          <Animated.View
            style={[
              styles.slideOverlay,
              {
                opacity: slideAnimation.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [1, 0, 1]
                }),
                transform: [{
                  translateX: slideAnimation.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: [-300, 0, 300]
                  })
                }]
              }
            ]}
            pointerEvents="none"
          >
            <View style={[
              styles.slideCard,
              { backgroundColor: slideResult ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.slideIcon}>
                {slideResult ? '✓' : '✗'}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 40,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  speaking: {
    backgroundColor: '#e0e0e0',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  progressText: {
    fontSize: 16,
    color: '#666',
  },
  text: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  slideCard: {
    borderRadius: 10,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  slideIcon: {
    fontSize: 80,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});