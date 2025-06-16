import { Card, Database } from '../../../components/db/database';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import wordGenerator from '../../../components/db/nextWordToLearn';
import { useLanguage } from '@/app/languageSelector';
import DeckCard from './components/Deck';

interface CardDecks {
  [key: string]: Card[];
}

interface DeckStats {
  total: number;
  learning: number;
  reviewed: number;
}

type StatsMap = {
  [key: string]: DeckStats;
}

interface DeckImageMap {
  [key: string]: string | undefined;
}

export default function CardDeckScreen() {
  const { sourceLanguage, targetLanguage } = useLanguage();
  const [database] = useState(() => new Database());
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<CardDecks>({});
  const [deckImages, setDeckImages] = useState<DeckImageMap>({});
  const [stats, setStats] = useState<StatsMap>({
    'All Cards': { total: 0, learning: 0, reviewed: 0 }
  });

  const loadCards = React.useCallback(async () => {
    await database.initialize();
    await getAllCards();
  }, [sourceLanguage, targetLanguage]);

  const loadDeckImages = async (deckTitles: string[]) => {
    const imageMap: DeckImageMap = {};
    for (const title of deckTitles) {
      console.log(title);
      const book = await database.getBookByName(title, sourceLanguage);
      if (book?.imageUrl) {
        console.log(book.imageUrl);
        imageMap[title] = book.imageUrl;
      }
    }
    setDeckImages(imageMap);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadCards();
    }, [loadCards])
  );

  const calculateStats = (cards: Card[]): DeckStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const cardsToLearn = wordGenerator(cards);
    return {
      total: cards.length,
      learning: cardsToLearn.filter(card => card.info?.status === 'reviewing').length,
      reviewed: cards.filter(card => {
        const lastRepeat = new Date(card.lastRepeat);
        return lastRepeat >= today;
      }).length
    };
  };

  const getAllCards = async () => {
    const cards = await database.getAllCards(sourceLanguage.toLowerCase(), targetLanguage.toLowerCase());
    setAllCards(cards);
    
    const allStats = calculateStats(cards);
    const newStats: StatsMap = { 'All Cards': allStats };
    
    const grouped = cards.reduce<CardDecks>((acc, card) => {
      if (!acc[card.source]) {
        acc[card.source] = [];
      }
      acc[card.source].push(card);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([source, deckCards]) => {
      newStats[source] = calculateStats(deckCards);
    });

    setDecks(grouped);
    setStats(newStats);
    await loadDeckImages(Object.keys(grouped));
  };

  const renderBookDeck = (title: string, cards: Card[], index: number) => {
    const deckStats = stats[title] || { total: 0, learning: 0, reviewed: 0 };
    console.log("holaa " + deckImages[title]);
    const bookTheme = {
      background: '#4A69BD',
      accent: '#FED330',    
      title: title,
      count: `${deckStats.learning} words`,
      imageUrl: deckImages[title]
    };

    return (
      <Link 
        key={title}
        href={{
          pathname: '/approvalCard',  
          params: { source: title }
        }}
        asChild
      >
        <DeckCard
          theme={bookTheme}
          onPress={() => {}}
          reviewCount={deckStats.reviewed}
        />
      </Link>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>Card Decks</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ready to Learn</Text>
        <Link 
          href={{
            pathname: '/learning',
            params: { mode: 'learning' }
          }}
          asChild
        >
          <DeckCard
            theme={{
              background: '#8B5CF6',
              accent: '#C4B5FD',
              title: 'Start Learning',
              count: `${allCards.filter(card => card.info?.status === 'learning').length} new words`
            }}
            onPress={() => {}}
            reviewCount={0}
          />
        </Link>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Decks</Text>
        <View style={styles.decksContainer}>
          {stats['All Cards'].learning > 0 && renderBookDeck('All Cards', allCards, 0)}
          {Object.entries(decks)
            .filter(([source, cards]) => {
              const deckStats = stats[source];
              return deckStats && deckStats.learning > 0;
            })
            .map(([source, cards], index) => 
              renderBookDeck(source, cards, index + 1)
            )}
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  progressCount: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  decksContainer: {
    width: '100%',
    alignItems: 'center', // Center cards
  },
  progressContainer: {
    gap: 8, // Increased gap between bars
    marginTop: 'auto',
    paddingTop: 16,
  },
  themedDecksSection: {
    marginBottom: 24,
  },
  themedDecksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  bookDecksSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginLeft: 16,
  },
  progressBar: {
    height: 6, // Slightly taller
    backgroundColor: 'rgba(0, 0, 0, 0.05)', // More subtle background
    borderRadius: 4, // More rounded corners
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(52, 152, 219, 0.8)', // Slightly transparent blue
    borderRadius: 4,
    // Optional: add transition shadow
    shadowColor: "#3498db",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewedProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(46, 204, 113, 0.8)', // Slightly transparent green
    borderRadius: 4,
    // Optional: add transition shadow
    shadowColor: "#2ecc71",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  legendContainer: {
    marginTop: 8, // Slightly more space
    alignItems: 'flex-end',
  },
  legendText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.5)', // More subtle text
    fontStyle: 'italic',
  },
  backgroundImage: {
    opacity: 0.3, // Increased opacity
    borderRadius: 10,
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Reduced overlay opacity
  },
  deck: {
    marginBottom: 24,
    marginHorizontal: 8,
    height: 160,
 },
 cardContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    height: '100%',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
 }, 
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center', // Center content horizontally
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
 
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deckTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1, // This will take available space but allow cardCount to have its space
    marginRight: 8,
  },
  cardCount: {
    fontSize: 14,
    color: '#666',
  },

});