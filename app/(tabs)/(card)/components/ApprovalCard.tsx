import React, { useState, useEffect } from 'react';
import { View, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Database } from '@/components/db/database';
import { CardProps } from './shared/types';
import { cardStyles } from './shared/styles';
import { ProgressBar } from './ProgressBar';
import { getCardComponent, needContext } from './CardFactory';

export const ApprovalCard: React.FC<CardProps> = ({ 
  card, 
  onCardUpdate, 
  contextId,
  cardsToLearn, 
  cardsLearned 
}) => {
  const router = useRouter();
  const [database] = useState(() => new Database());
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipAnim] = useState(new Animated.Value(0));
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    flipAnim.setValue(0);
    setIsFlipping(false);
    setIsAnswerVisible(false);
    setIsNavigating(false);
  }, [card]);

  const handleShowAnswer = async () => {
    if (!card?.id || isFlipping || isNavigating) return;
    
    setIsFlipping(true);
    setIsNavigating(true);

    console.log("Approval CARD: " + contextId);
    Animated.sequence([
      Animated.timing(flipAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(50)
    ]).start(async () => {
      console.log("Actual: " + needContext(card.level) ? contextId?.toString() || '' : null)
      router.push({
        pathname: '/cardPanel',
        params: { 
          cardId: card.id,
          returnToApproval: 'true',
          contextId: needContext(card.level) ? contextId?.toString() || '' : null,
          isFlipped: 'true'
        }
      });
    });
  };

  const CardComponent = getCardComponent(card.level);
  
  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '90deg']
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.5, 0]
  });

  return (
    <View style={cardStyles.container}>
      <ProgressBar cardsLearned={cardsLearned} cardsToLearn={cardsToLearn} />
      <Animated.View 
        style={[
            cardStyles.cardWrapper,
          {
            transform: [{ rotateY: frontRotate }],
            opacity: frontOpacity,
          }
        ]}
      >
        <CardComponent 
          card={card} 
          contextId={contextId}
          onCardUpdate={onCardUpdate}
          cardsLearned={cardsLearned}
          cardsToLearn={cardsToLearn}           
          onShowAnswer={handleShowAnswer}
          isFlipping={isFlipping}
        />
      </Animated.View>
    </View>
  );
};

export default ApprovalCard;