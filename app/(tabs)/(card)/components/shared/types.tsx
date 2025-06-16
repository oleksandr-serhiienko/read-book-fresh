import { Card } from '@/components/db/database';

export interface CardProps {
  card: Card;
  onCardUpdate: (card: Card) => void;
  onShowAnswer?: () => void;
  contextId: string;
  isFlipping?: boolean;
  cardsToLearn: number;
  cardsLearned: number;
}

export type CardComponentType = React.FC<CardProps>;
export type CardComponentsMap = Record<number, CardComponentType>;

const CardTypesModule = {
  CardProps: {} as CardProps,
  CardComponentType: {} as CardComponentType,
  CardComponentsMap: {} as CardComponentsMap,
};

export default CardTypesModule;