import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Card, cardHelpers, Database, Example, HistoryEntry } from '../../../components/db/database';
import { getNextLevel } from '../../../components/db/nextWordToLearn';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Transform } from '@/components/transform';
import { CardEvents } from './components/CardEvents';
import AudioControl from './components/AudioControl';

// Import these to get the type information
import { cardComponents } from './components/CardFactory';
import { EmittedWord } from '../(book)/components/events/slidePanelEvents';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = {
  horizontal: 0.25 * SCREEN_WIDTH,
  vertical: 0.25 * SCREEN_HEIGHT
};

// Map for detailed exercise type descriptions based on card level
const CARD_TYPE_DESCRIPTIONS = {
  0: 'Word Recognition',
  1: 'Translation Recognition',
  2: 'Context with Blank (Original)',
  3: 'Context with Blank (Translation)',
  4: 'Context with Selection (Original)',
  5: 'Context with Selection (Translation)'
};

const renderHighlightedText = (text: string) => {
  const parts = text.split(/(<em>.*?<\/em>)/);
  return parts.map((part, index) => {
    if (part.startsWith('<em>') && part.endsWith('</em>')) {
      return (
        <Text key={index} style={styles.boldText}>
          {part.slice(4, -5)}
        </Text>
      );
    }
    return <Text key={index}>{part}</Text>;
  });
};

export default function CardPanel() {
  const [database] = useState(() => new Database());
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [card, setCard] = useState<Card>();
  const position = useRef(new Animated.ValueXY()).current;
  const rightOpacity = useRef(new Animated.Value(0)).current;
  const wrongOpacity = useRef(new Animated.Value(0)).current;
  const downOpacity = useRef(new Animated.Value(0)).current;
  const { cardId, returnToApproval, contextId } = useLocalSearchParams<{ 
    cardId: string,
    returnToApproval: string,
    contextId: string,
  }>();
  const router = useRouter();

  const useNumberParam = (param: string | undefined, defaultValue: number = 0): number => {
    if (!param) return defaultValue;
    const parsed = parseInt(param);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  useEffect(() => {
    const initialize = async () => {
      await database.initialize();
      await getCard();
    };
    if (contextId) {
      setSelectedContextId(contextId);
    }
    initialize();
  }, [cardId]);

  const getCard = async () => {
    const newCard = await database.getCardById(useNumberParam(cardId));
    if (newCard !== null) {
      setCard(newCard);
    }
  };

  const onSwipeComplete = async (direction: 'left' | 'right' | 'down') => {
    if (!card) return;
      let success = false;
      let type: 'card' | 'review' = 'card';

      switch(direction) {
        case 'right':
          success = true;
          type = 'card';
          break;
        case 'left':
          success = false;
          type = 'card';
          break;
        case 'down':
          success = true;
          type = 'review';
          break;
      }

      // Calculate new level using the updated spaced repetition system
      card.level = await getNextLevel(card.level, success, type);
      card.lastRepeat = new Date(Date.now());

      console.log("saved card context hash: " + selectedContextId);
      console.log("history to save was " + success);

      // Get the detailed card type description based on the card's level
      const cardTypeDescription = CARD_TYPE_DESCRIPTIONS[card.level as keyof typeof CARD_TYPE_DESCRIPTIONS] || 'Unknown Type';

      // Find the selected example to get source and target
      let selectedExample: Example | null = null;
      const allExamples = cardHelpers.getAllExamples(card);
      for (const example of allExamples) {
        const hash = await database.createExampleHash(example.sentence || '', example.translation || '');
        if (hash === selectedContextId) {
          selectedExample = example;
          break;
        }
      }

      // Create a history entry with the hash and example details
      let history: HistoryEntry = {
        date: new Date(),
        success: success,
        cardId: card.id ?? 0,
        exampleHash: selectedContextId ?? "", // Using hash instead of contextId
        type: `${cardTypeDescription} (${type})`
      };

      // Save the history
      await database.updateHistory(history);
    await database.updateCard(card);
    
    // Fetch fresh card data to ensure we have all contexts
    const updatedCard = await database.getCardById(card.id ?? 0);
    if (updatedCard) {
      CardEvents.emit(updatedCard, success);
    }
  
    if (returnToApproval === 'true') {
      router.back();
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
      
      // Handle horizontal swipe indicators
      if (Math.abs(gesture.dy) < Math.abs(gesture.dx)) {
        // Horizontal movement is dominant
        if (gesture.dx > 0) {
          Animated.timing(rightOpacity, {
            toValue: gesture.dx / SCREEN_WIDTH,
            duration: 0,
            useNativeDriver: false,
          }).start();
        } else {
          Animated.timing(wrongOpacity, {
            toValue: -gesture.dx / SCREEN_WIDTH,
            duration: 0,
            useNativeDriver: false,
          }).start();
        }
        // Reset down opacity
        Animated.timing(downOpacity, {
          toValue: 0,
          duration: 0,
          useNativeDriver: false,
        }).start();
      } else {
        // Vertical movement is dominant
        if (gesture.dy > 0) {
          Animated.timing(downOpacity, {
            toValue: gesture.dy / SCREEN_HEIGHT,
            duration: 0,
            useNativeDriver: false,
          }).start();
          // Reset horizontal opacities
          Animated.timing(rightOpacity, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }).start();
          Animated.timing(wrongOpacity, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }).start();
        }
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dy) < Math.abs(gesture.dx)) {
        // Horizontal movement is dominant
        if (gesture.dx > SWIPE_THRESHOLD.horizontal) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD.horizontal) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      } else {
        // Vertical movement is dominant
        if (gesture.dy > SWIPE_THRESHOLD.vertical) {
          forceSwipe('down');
        } else {
          resetPosition();
        }
      }
    },
  });

  const forceSwipe = (direction: 'right' | 'left' | 'down') => {
    const x = direction === 'right' ? SCREEN_WIDTH : direction === 'left' ? -SCREEN_WIDTH : 0;
    const y = direction === 'down' ? SCREEN_HEIGHT : 0;
    
    Animated.timing(position, {
      toValue: { x, y },
      duration: 250,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }),
      Animated.timing(rightOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(wrongOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
      Animated.timing(downOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-120deg', '0deg', '120deg'],
    });

    return {
      ...position.getLayout(),
      transform: [
        { rotate },
        {
          scale: position.y.interpolate({
            inputRange: [0, SCREEN_HEIGHT],
            outputRange: [1, 0.5],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  };

  const renderCard = () => {
    if (!card) {
      return (
        <View style={styles.container}>
          <Text>No card available</Text>
        </View>
      );
    }
  
    // Early check for card structure
    if (!card.wordInfo) {
      return (
        <View style={styles.container}>
          <Text>Loading card data...</Text>
        </View>
      );
    }
  
    const examples = cardHelpers.getAllExamples(card);
    const firstExample = cardHelpers.getFirstExample(card);
    const firstMeaning = cardHelpers.getFirstMeaning(card);
    const emittedWord: EmittedWord = {bookTitle: card.source, word: card.word, translation: "", sentenceId: 0 }
  
    return (
      <Animated.View style={[styles.cardContainer, getCardStyle()]} {...panResponder.panHandlers}>
        <View style={styles.cardContent}>
          {/* Audio control positioned absolutely in top-right corner */}
          <View style={styles.audioControlContainer}>
            <AudioControl 
              text={card.word} 
              cardId={card.id || 0} 
              autoPlay={true}
            />
          </View>
  
          <View style={styles.indicatorsContainer}>
            <Animated.View style={[styles.indicator, styles.rightIndicator, { opacity: rightOpacity }]}>
              <Text style={styles.indicatorText}>Right</Text>
            </Animated.View>
            <Animated.View style={[styles.indicator, styles.wrongIndicator, { opacity: wrongOpacity }]}>
              <Text style={styles.indicatorText}>Wrong</Text>
            </Animated.View>
            <Animated.View style={[styles.indicator, styles.downIndicator, { opacity: downOpacity }]}>
              <Text style={styles.indicatorText}>Review</Text>
            </Animated.View>
          </View>
  
          <Text style={styles.word}>{card.word}</Text>
          <Text style={styles.translation}>{firstMeaning}</Text>
          
          {examples.length > 0 && firstExample && (
            <View style={styles.contextContainer}>
              <Text style={styles.contextText}>
                {renderHighlightedText(firstExample.sentence || "")}
              </Text>
              <Text style={styles.contextText}>
                {renderHighlightedText(firstExample.translation || "")}
              </Text>
            </View>
          )}
          
          <Link 
            href={{
              pathname: "/wordInfo",
              params: { 
                content: JSON.stringify(card.id),
                added: 'true'
              }
            }}
            style={styles.moreInfoButton}
            asChild
          >
            <TouchableOpacity>
              <Text style={styles.moreInfoButtonText}>More Info</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {renderCard()}
    </View>
  );
}
const styles = StyleSheet.create({
  audioControlContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  downIndicator: {
    backgroundColor: 'rgba(241, 196, 15, 0.9)',
    position: 'absolute',
    bottom: -30,
    left: '50%',
    transform: [
      { translateX: -30 },
      { rotate: '0deg' }
    ],
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cardContainer: {
    width: SCREEN_WIDTH * 0.9,
    position: 'relative',
  },
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  indicatorsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    zIndex: 2,
  },
  indicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    transform: [{ rotate: '15deg' }],
  },
  rightIndicator: {
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
  },
  wrongIndicator: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
  },
  indicatorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  word: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    marginTop: 20,
  },
  translation: {
    fontSize: 18,
    fontStyle: 'italic',
    marginBottom: 10,
    color: '#555',
  },
  contextContainer: {
    width: '100%',
    marginTop: 10,
  },
  contextText: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'left',
    color: '#555',
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  moreInfoButton: {
    marginTop: 15,
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  moreInfoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
