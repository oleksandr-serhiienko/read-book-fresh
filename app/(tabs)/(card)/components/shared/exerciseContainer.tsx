import React from 'react';
import { View, ScrollView, StyleSheet, Dimensions, Text } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_CONTAINER_HEIGHT = SCREEN_HEIGHT * 0.75;

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
    width: '100%',
    height: MAX_CONTAINER_HEIGHT,
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
    marginHorizontal: 16,
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