import React from 'react';
import { View, StyleSheet } from 'react-native';

interface VerticalProgressBarProps {
  progress: number;
}

const VerticalProgressBar: React.FC<VerticalProgressBarProps> = ({ progress }) => {
  // Ensure progress is between 0 and 100
  const height = Math.max(0, Math.min(100, progress));
  
  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.progressBar,
          { height: `${height}%` }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#e5e5e5',
    zIndex: 5,
  },
  progressBar: {
    width: '100%',
    backgroundColor: '#3498db',
    position: 'absolute',
    top: 0, 
  }
});

export default VerticalProgressBar;