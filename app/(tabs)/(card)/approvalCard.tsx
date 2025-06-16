import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, database } from '@/components/db/database';
import { useLanguage } from '@/app/languageSelector';
import { CardEvents } from './components/CardEvents';
import wordGenerator from '@/components/db/nextWordToLearn';
import ApprovalCard from './components/ApprovalCard';
import { selectBestContext } from './components/shared/helpers';

export default function ApprovalScreen() {
  const { source } = useLocalSearchParams<{ source: string }>();
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsToLearn, setCardsToLearn] = useState<number>(0);
  const [cardsLearned, setCardsLearned] = useState<number>(0);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const { sourceLanguage, targetLanguage } = useLanguage();

  useEffect(() => {
    const loadCard = async () => {
      const cards = await database.getCardToLearnBySource(
        source, 
        sourceLanguage.toLowerCase(), 
        targetLanguage.toLowerCase()
      ) ?? []
      const cardsToLearn = wordGenerator(cards.filter(card => card.info?.status === 'reviewing'));
      setCards(cardsToLearn);
      setCardsToLearn(cardsToLearn.length);
    };
    console.log("CARDS HERE: " + cards.length)
    loadCard();
  }, [source]);

  useEffect(() => {
    const unsubscribe = CardEvents.subscribe(async (updatedCard, success) => {
      setCards(prevCards => {
        const newCards = prevCards.filter(card => card.id !== updatedCard.id);
        if (!success) {
          return [...newCards, updatedCard];
        }
        setCardsLearned(prev => prev + 1);
        return newCards;
      });
    });
    return () => unsubscribe();
  }, []);

  const handleCardUpdate = async (updatedCard: Card) => {
    setCards(prevCards => {
      const newCards = [...prevCards];
      newCards[currentCardIndex] = updatedCard;
      return newCards;
    });
    setCurrentCardIndex(prev => prev + 1);
  };

  if (cards.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>No cards to review</Text>
      </View>
    );
  }

  if (currentCardIndex >= cards.length) {
    router.back();
    return null;
  }

  return (
    <ApprovalCard 
      card={cards[currentCardIndex]}
      contextId={selectBestContext(cards[currentCardIndex])}
      onCardUpdate={handleCardUpdate}
      cardsToLearn={cardsToLearn}
      cardsLearned={cardsLearned}
    />
  );
}