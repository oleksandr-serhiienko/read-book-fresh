// WordPopup.tsx
import React, { useEffect } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

interface WordPopupProps {
  translation: string;
  visible: boolean;
  onHide: () => void;
}

const WordPopup = ({ translation, visible, onHide }: WordPopupProps) => {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Wait a bit
        Animated.delay(1000),
        // Fade out
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.popup, { opacity }]}>
      <Text style={styles.text}>{translation}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    top: -30,  // Position above the word
    left: 0,   // Align with the left edge of the word
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 8,
    elevation: 5,
    // Make sure the popup is above other content
    zIndex: 1000,
    // Add min width to ensure readability
    minWidth: 60,
    // Center the text
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 14,
  },
});
export default WordPopup;