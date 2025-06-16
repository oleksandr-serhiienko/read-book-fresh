// components/ChapterNavigation.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface ChapterNavigationProps {
  currentChapter: number;
  totalChapters: number;
  onNext: () => void;
  onPrevious: () => void;
}

export const ChapterNavigation: React.FC<ChapterNavigationProps> = ({
  currentChapter,
  totalChapters,
  onNext,
  onPrevious
}) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={onPrevious}
        disabled={currentChapter === 0}
        style={[styles.navButton, currentChapter === 0 && styles.disabledButton]}
      >
        <Text style={styles.navButtonText}>←</Text>
      </TouchableOpacity>
      
      <Text style={styles.chapterTitle}>
        Chapter {currentChapter + 1} of {totalChapters}
      </Text>
      
      <TouchableOpacity 
        onPress={onNext}
        disabled={currentChapter === totalChapters - 1}
        style={[styles.navButton, currentChapter === totalChapters - 1 && styles.disabledButton]}
      >
        <Text style={styles.navButtonText}>→</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    chapterTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    navButton: {
      padding: 10,
      borderRadius: 5,
      backgroundColor: '#f0f0f0',
    },
    disabledButton: {
      opacity: 0.5,
    },
    navButtonText: {
      fontSize: 20,
    },
    content: {
      flex: 1,
      padding: 16,
    }
  });