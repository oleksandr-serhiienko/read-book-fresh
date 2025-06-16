// ReaderSettings.tsx
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Settings, ChevronLeft, ChevronRight, MinusCircle, PlusCircle } from "lucide-react-native";

interface ReaderSettingsProps {
  currentChapter: number;
  totalChapters: number;
  onNext: () => void;
  onPrevious: () => void;
  currentFontSize: number;
  onIncreaseFontSize: () => void;
  onDecreaseFontSize: () => void;
}

const ReaderSettings: React.FC<ReaderSettingsProps> = ({
  currentChapter,
  totalChapters,
  onNext,
  onPrevious,
  currentFontSize,
  onIncreaseFontSize,
  onDecreaseFontSize
}) => {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => setIsSettingsVisible(!isSettingsVisible)}
      >
        <Settings size={24} color="#666" />
      </TouchableOpacity>

      {isSettingsVisible && (
        <View style={styles.settingsPanel}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chapter Navigation</Text>
            <View style={styles.controlsRow}>
              <TouchableOpacity 
                onPress={onPrevious}
                disabled={currentChapter === 0}
                style={[styles.button, currentChapter === 0 && styles.disabledButton]}
              >
                <ChevronLeft size={24} color="#666" />
              </TouchableOpacity>
              
              <Text style={styles.info}>
                Chapter {currentChapter} of {totalChapters}
              </Text>
              
              <TouchableOpacity 
                onPress={onNext}
                disabled={currentChapter === totalChapters}
                style={[styles.button, currentChapter === totalChapters && styles.disabledButton]}
              >
                <ChevronRight size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Font Size</Text>
            <View style={styles.controlsRow}>
              <TouchableOpacity 
                onPress={onDecreaseFontSize}
                style={styles.button}
              >
                <MinusCircle size={24} color="#666" />
              </TouchableOpacity>
              
              <Text style={styles.info}>
                Size: {currentFontSize}
              </Text>
              
              <TouchableOpacity 
                onPress={onIncreaseFontSize}
                style={styles.button}
              >
                <PlusCircle size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1000,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingsPanel: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 280,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  info: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
});

export default ReaderSettings;