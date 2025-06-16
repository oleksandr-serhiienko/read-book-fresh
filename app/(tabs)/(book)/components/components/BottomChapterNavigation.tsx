// BottomChapterNavigation.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from "lucide-react-native";

interface BottomChapterNavigationProps {
  currentChapter: number;
  totalChapters: number;
  onNext: () => void;
  onPrevious: () => void;
}

const BottomChapterNavigation: React.FC<BottomChapterNavigationProps> = ({
  currentChapter,
  totalChapters,
  onNext,
  onPrevious
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={onPrevious}
        disabled={currentChapter === 0}
        style={[styles.navButton, currentChapter === 0 && styles.disabledButton]}
      >
        <ChevronLeft size={24} color="#666" />
        <Text style={styles.buttonText}>Previous Chapter</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        onPress={onNext}
        disabled={currentChapter === totalChapters - 1}
        style={[styles.navButton, currentChapter === totalChapters - 1 && styles.disabledButton]}
      >
        <Text style={styles.buttonText}>Next Chapter</Text>
        <ChevronRight size={24} color="#666" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    marginHorizontal: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  }
});

export default BottomChapterNavigation;