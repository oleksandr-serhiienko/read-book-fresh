import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CardProps } from '../shared/types';
import { cardStyles } from '../shared/styles';
import { cardHelpers } from '@/components/db/database';

const localStyles = StyleSheet.create({
  labelText: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#666',
    marginVertical: 10,
  },
  mainText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginVertical: 5,
  },
  alternateTranslations: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  }
});

const styles = {
  ...cardStyles,
  ...localStyles,
};

const TranslationOnlyCard: FC<CardProps> = ({ card, onShowAnswer, isFlipping }) => {
  const alternateTranslations = cardHelpers.getAllMeanings(card).slice(1);
  
  return (
    <View style={styles.cardContent}>
      <View>
        <Text style={styles.labelText}>Original</Text>
        <Text style={styles.mainText}>
          {'_'.repeat(Math.max(8, card.word.length))}
        </Text>
      </View>
      
      <View>
        <Text style={styles.labelText}>Translation</Text>
        <Text style={styles.mainText}>{cardHelpers.getFirstMeaning(card)}</Text>
        {alternateTranslations.length > 0 && (
          <Text style={styles.alternateTranslations}>
            {alternateTranslations.join(', ')}
          </Text>
        )}
      </View>

      {!isFlipping && onShowAnswer && (
        <TouchableOpacity 
          style={styles.showAnswerButton}
          onPress={onShowAnswer}
        >
          <Text style={styles.buttonText}>Show Answer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default TranslationOnlyCard;