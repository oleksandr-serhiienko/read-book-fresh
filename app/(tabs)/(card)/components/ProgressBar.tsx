import React from 'react';
import { View, Text } from 'react-native';
import { cardStyles } from './shared/styles';

interface ProgressBarProps {
  cardsLearned: number;
  cardsToLearn: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ cardsLearned, cardsToLearn }) => (
  <View style={cardStyles.progressContainer}>
    <View style={cardStyles.progressInfo}>
      <Text style={cardStyles.progressText}>
        {cardsLearned} of {cardsToLearn} cards learned
      </Text>
      <Text style={cardStyles.progressPercentage}>
        {Math.round((cardsLearned / cardsToLearn) * 100)}%
      </Text>
    </View>
    <View style={cardStyles.progressBarContainer}>
      <View 
        style={[
            cardStyles.progressBar,
          { width: `${(cardsLearned / cardsToLearn) * 100}%` }
        ]} 
      />
    </View>
  </View>
);