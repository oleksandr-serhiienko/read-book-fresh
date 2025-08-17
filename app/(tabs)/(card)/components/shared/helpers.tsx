import { Text } from 'react-native';
import React from 'react';
import { Card, cardHelpers } from '@/components/db/database';
import { logger, LogCategories } from '@/utils/logger';

interface TextStyles {
  boldText: {
    fontWeight: 'bold';
    color: string;
    [key: string]: any;
  };
}

export const renderHighlightedText = (text: string, styles: TextStyles) => {
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

export const selectBestContext = (card: Card): string => {
  const allExamples = cardHelpers.getAllExamples(card);
  
  if (allExamples.length === 0) {
    logger.warning(LogCategories.CONTEXT_SELECTION, `No examples available for card`, {
      cardId: card.id,
      word: card.word
    });
    return "";
  }
  
  // If there's no history, return hash of the first example
  if (!card.history || card.history.length === 0) {
    const hash = createExampleHashSync(allExamples[0].source || '', allExamples[0].target || '');
    logger.info(LogCategories.CONTEXT_SELECTION, `No history, using first example`, {
      cardId: card.id,
      word: card.word,
      selectedHash: hash
    });
    return hash;
  }
  
  // Check if the last action was a review
  const sortedHistory = [...card.history].sort((a, b) => 
    b.date.getTime() - a.date.getTime()
  );
  
  const lastEntry = sortedHistory[0];
  
  // If the last action was a review (type starts with 'Review'), return the SAME example hash
  if (lastEntry && lastEntry.type && lastEntry.type.startsWith('Review')) {
    // Make sure the example still exists
    const example = allExamples.find(ex => 
      createExampleHashSync(ex.source || '', ex.target || '') === lastEntry.exampleHash
    );
    if (example) {
      logger.info(LogCategories.REVIEW_SYSTEM, `Repeating same context for review`, {
        cardId: card.id,
        word: card.word,
        lastActionType: lastEntry.type,
        repeatedHash: lastEntry.exampleHash
      });
      return lastEntry.exampleHash ?? "";
    }
  }
  
  // Create a set of example hashes that were used in history
  const usedExampleHashes = new Set<string>();
  
  card.history.forEach(entry => {
    if (entry.exampleHash) {
      usedExampleHashes.add(entry.exampleHash);
    }
  });
  
  // Find an example that wasn't used in history
  for (const example of allExamples) {
    // Calculate hash for this example
    const hash = createExampleHashSync(example.source || '', example.target || '');
    
    if (!usedExampleHashes.has(hash)) {
      return hash; // Return the hash directly
    }
  }
  
  // If all examples have been used, return the one used longest ago
  if (card.history.length > 0) {
    // Find the oldest used example that still exists
    const oldestHistory = [...card.history].sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );
    
    for (const historyEntry of oldestHistory) {
      if (historyEntry.exampleHash) {
        // Find the example matching this hash
        const example = allExamples.find(ex => 
          createExampleHashSync(ex.source || '', ex.target || '') === historyEntry.exampleHash
        );
        if (example) return historyEntry.exampleHash; // Return the hash
      }
    }
  }
  
  // Last resort: return hash of the first example
  return createExampleHashSync(allExamples[0].source || '', allExamples[0].target || '');
};

// Synchronous version of hash creation for use in selection
export function createExampleHashSync(source: string, target: string): string {
  // Simple hash function for synchronous use
  const content = `${source}||${target}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

const Helpers = {
  renderHighlightedText,
  selectBestContext,
  createExampleHashSync,
};

export default Helpers;