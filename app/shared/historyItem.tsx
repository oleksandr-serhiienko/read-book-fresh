// File path: app/shared/components/HistoryItem.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { HistoryEntry, Card, cardHelpers, Example } from '@/components/db/database';
import { createExampleHashSync } from '../(tabs)/(card)/components/shared/helpers';

interface HistoryItemProps {
  entry: HistoryEntry;
  index: number;
  card: Card | null;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, index, card }) => {
  const [exampleData, setExampleData] = useState<Example | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState(false);

  useEffect(() => {
    loadExampleData();
  }, [entry.exampleHash]);

  // Format date in a readable way
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load the example data from the card by hash
  const loadExampleData = () => {
    if (!entry.exampleHash || !card) {
      return;
    }

    setIsLoadingExample(true);
    
    try {
      // Find the example with matching hash
      const allExamples = cardHelpers.getAllExamples(card);
      for (const example of allExamples) {
        const hash = createExampleHashSync(example.sentence || '', example.translation || '');
        console.log("Trying to get hash for: " + example.sentence + " " + example.translation);
        console.log("The hash compare is : " + hash + " " + entry.exampleHash);
        if (hash === entry.exampleHash) {
          setExampleData(example);
          break;
        }
      }
    } catch (error) {
      console.error('Error loading example data:', error);
    } finally {
      setIsLoadingExample(false);
    }
  };

  // Format the sentence with highlighting
  const formatSentence = (sentence: string) => {
    // Replace <em> tags with guillemets for visual emphasis
    return sentence.replace(/<\/?em>/g, (match) => {
      return match === '<em>' ? '«' : '»';
    });
  };

  // Get a shorter version of the type if it's too long
  const getShortTypeDisplay = (type: string | null) => {
    if (!type) return 'Standard Review';
    
    // If type contains parentheses, extract just the main type
    if (type.includes('(')) {
      const mainType = type.split('(')[0].trim();
      return mainType;
    }
    
    return type;
  };

  return (
    <View style={[
      styles.historyItem, 
      index % 2 === 0 ? styles.evenHistoryItem : styles.oddHistoryItem
    ]}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
        <View style={[
          styles.historyStatus, 
          entry.success ? styles.successStatus : styles.failureStatus
        ]}>
          <Text style={styles.historyStatusText}>
            {entry.success ? 'Success' : 'Failure'}
          </Text>
        </View>
      </View>

      <View style={styles.historyDetails}>
        <Text style={styles.historyType}>
          <Text style={styles.historyLabel}>Type:</Text> {getShortTypeDisplay(entry.type)}
        </Text>
        
        {entry.exampleHash && (
          <View style={styles.contextContainer}>
            <View style={styles.contextHeader}>
              <Text style={styles.historyLabel}>Example:</Text>
              <Text style={styles.contextId}>Hash: {entry.exampleHash.substring(0, 8)}...</Text>
            </View>
            
            {isLoadingExample ? (
              <ActivityIndicator size="small" color="#666" style={styles.contextLoader} />
            ) : exampleData ? (
              <>
                <Text style={styles.contextSentence}>
                  {formatSentence(exampleData.sentence || '')}
                </Text>
                <Text style={styles.translationText}>
                  → {exampleData.translation || ''}
                </Text>
              </>
            ) : (
              <Text style={styles.noContextText}>No example available</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  historyItem: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  evenHistoryItem: {
    backgroundColor: '#f8f9fa',
  },
  oddHistoryItem: {
    backgroundColor: '#f0f4f8',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 14,
    color: '#555',
  },
  historyStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  successStatus: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  failureStatus: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyDetails: {
    marginTop: 8,
  },
  historyType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  historyLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  contextContainer: {
    marginTop: 4,
  },
  contextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextId: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  contextSentence: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  translationText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    lineHeight: 20,
  },
  noContextText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  contextLoader: {
    marginTop: 4,
  }
});

export default HistoryItem;