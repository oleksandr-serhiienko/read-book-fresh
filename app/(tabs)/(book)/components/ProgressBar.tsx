// ProgressBar.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  // Make sure progress is between 0-100 and properly formatted
  const width = Math.max(0, Math.min(100, progress));
  
  return (
    <View style={styles.container}>      
      <View         
        style={[
          styles.progressBar,
          { width: `${width}%` }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#e5e5e5',
    zIndex: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3498db',
  }
});

export default ProgressBar;