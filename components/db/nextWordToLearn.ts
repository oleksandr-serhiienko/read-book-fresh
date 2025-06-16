import { Card } from "../db/database";

// Define type for intervals
type IntervalMap = {
  [key: number]: number;
};

// Review intervals in days for each level
const INTERVALS: IntervalMap = {
  0: 0,    // Same day review for new/failed cards
  1: 1,    // Next day
  2: 3,    // 3 days later
  3: 7,    // 1 week
  4: 14,   // 2 weeks
  5: 30,   // 1 month
  6: 90,   // 3 months
  7: 180   // 6 months
};

const MAX_LEVEL = 7;
const FAILURE_SETBACK = 2;

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Get randomly shuffled letters from a word as hints
export function getWordHints(word: string): string[] {
  return shuffleArray(word.toLowerCase().split(''));
}

// Get the card type for a given level
export function getCardTypeForLevel(level: number): number {
  if (level <= 5) {
    return level;
  }
  // For higher levels, randomly choose between types 2, 3, and 5
  return [2, 3, 5][Math.floor(Math.random() * 3)];
}

// Helper function to compare dates (ignoring time)
function isSameOrAfterDate(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() > date2.getFullYear() ||
    (date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() > date2.getMonth()) ||
    (date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() >= date2.getDate())
  );
}

// Calculate next review date based on level and type
function getNextReviewDate(lastReviewDate: Date, level: number, type: string = 'card'): Date {
  const nextDate = new Date(lastReviewDate);
  
  // Set time to start of day (midnight)
  nextDate.setHours(0, 0, 0, 0);
  
  if (type === 'review') {
    // For review type, always next day
    nextDate.setDate(nextDate.getDate() + 1);
    return nextDate;
  }

  // Normal interval progression
  const interval = INTERVALS[level] ?? INTERVALS[MAX_LEVEL];
  nextDate.setDate(nextDate.getDate() + interval);
  return nextDate;
}

// Get next level based on current level, success, and type
export function getNextLevel(currentLevel: number, success: boolean, type: string = 'card'): number {
  if (type === 'review') {
    // For review type, keep the same level
    return currentLevel;
  }

  if (!success) {
    return Math.max(0, currentLevel - FAILURE_SETBACK);
  }

  return Math.min(MAX_LEVEL, currentLevel + 1);
}

// Main function to get cards that need review
export default function wordGenerator(cards: Card[]): Card[] {
  if (!cards || !Array.isArray(cards)) {
    console.warn('Invalid cards array provided to wordGenerator');
    return [];
  }

  // Get current date and set to start of day
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return cards.filter(card => {
    // If card has never been reviewed, include it
    if (!card.lastRepeat) {
      return true;
    }

    try {
      const lastReviewDate = new Date(card.lastRepeat);
      // Set to start of day for comparison
      lastReviewDate.setHours(0, 0, 0, 0);
      
      const lastHistory = card.history?.[0];
      const type = lastHistory?.type || 'card';
      const nextReviewDate = getNextReviewDate(lastReviewDate, card.level ?? 0, type);

      // For debugging
      console.log(
        `Card: ${card.word}, ` +
        `Level: ${card.level}, ` +
        //`Last review: ${lastReviewDate.toLocaleDateString()}, ` +
        //`Next review: ${nextReviewDate.toLocaleDateString()}, ` +
        `Now: ${now.toLocaleDateString()}, ` +
        `Type: ${type}, ` +
        `Status: ${card.info?.status}, ` +
        `Info: ${card.info?.learningProgress.meaningToWord}, ` +
        //`Sentence: ${card.info?.sentence}` + 
        `LastHIstory: ${lastHistory?.date}` +
        `LastHIstory: ${lastHistory?.success}`
      );

      // NEW LOGIC: Include cards where the last answer was wrong
      const wasLastAttemptWrong = lastHistory && lastHistory.success === false;
      
      // Include if due for review OR if the last attempt was wrong
      return isSameOrAfterDate(now, nextReviewDate) || wasLastAttemptWrong;
    } catch (error) {
      console.error(`Error processing card ${card.word}:`, error);
      return false;
    }
  });
}