import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text } from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = 16;
const HEADER_HEIGHT = 100; // Approximate header height
const TAB_BAR_HEIGHT = 80; // Approximate tab bar height
const AVAILABLE_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - TAB_BAR_HEIGHT;
const MAX_CONTAINER_HEIGHT = AVAILABLE_HEIGHT * 0.9;
const CONTAINER_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2);

interface ExerciseContainerProps {
  children: React.ReactNode;
  correctAnswer?: string;
  showCorrect?: boolean;
}

const ExerciseContainer: React.FC<ExerciseContainerProps> = ({ 
  children, 
  correctAnswer,
  showCorrect 
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.outerContainer}>
        <View style={styles.innerContainer}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.container}>
              {children}
              {showCorrect && correctAnswer && (
                <View style={styles.correctOverlay}>
                  <Text style={styles.correctText}>{correctAnswer}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  outerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    width: CONTAINER_WIDTH,
    maxHeight: MAX_CONTAINER_HEIGHT,
    justifyContent: 'center',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    minHeight: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  correctOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  correctText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  }
});

export default ExerciseContainer;