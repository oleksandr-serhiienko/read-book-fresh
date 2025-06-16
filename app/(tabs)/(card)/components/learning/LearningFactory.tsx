// LearningFactory.tsx
import { Card } from "@/components/db/database";
import WordToMeaningExercise from "./exercises/WordToMeaningExercise";
import MeaningToWordExercise from "./exercises/MeaningToWordExercise";
import ContextExercise from "./exercises/ContextExercise";
import ContextLettersExercise from "./exercises/ContextLetterExercise";

export type LearningType = 'wordToMeaning' | 'meaningToWord' | 'context' | 'contextLetters';

export interface LearningExerciseProps {
  card: Card;
  onSuccess: () => void;
  onFailure: () => void;
  otherCards: Card[];
  isSpeakerOn: boolean;
  onToggleSpeaker: () => void;
  isSpeaking: boolean;
}

type LearningComponentType = React.FC<LearningExerciseProps>;
type LearningComponentsMap = Record<LearningType, LearningComponentType>;

export const learningComponents: LearningComponentsMap = {
  wordToMeaning: WordToMeaningExercise,
  meaningToWord: MeaningToWordExercise,
  context: ContextExercise,
  contextLetters: ContextLettersExercise,
};

export const getLearningComponent = (type: LearningType): LearningComponentType => {
  return learningComponents[type] || WordToMeaningExercise;
};