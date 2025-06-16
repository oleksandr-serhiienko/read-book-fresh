import { FC } from 'react';
import { CardProps } from './shared/types';
import WordOnlyCard from './cards/WordOnlyCard';
import TranslationOnlyCard from './cards/TranslationOnlyCard';
import ContextBlankOriginal from './cards/ContextWithBlankOriginal';
import ContextBlankTranslation from './cards/ContextWithBlankTranslation';
import ContextSelectableOriginal from './cards/ContextWithSelectableOriginal';
import ContextSelectableTranslation from './cards/ContextWithSelectableTranslation';

type CardComponentType = FC<CardProps>;
type CardComponentsMap = Record<number, CardComponentType>;

export const cardComponents: CardComponentsMap = {
  0: WordOnlyCard,
  1: TranslationOnlyCard,
  2: ContextBlankOriginal,
  3: ContextBlankTranslation,
  4: ContextSelectableOriginal,
  5: ContextSelectableTranslation,
};

export const getCardComponent = (level: number): CardComponentType => {
  return cardComponents[level] || WordOnlyCard;
};

export const needContext = (level: number): boolean => {
  const comp = getCardComponent(level);
  if (comp == WordOnlyCard || comp == TranslationOnlyCard)
    return false;
  else 
    return true;
};