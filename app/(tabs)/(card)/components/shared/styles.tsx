import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.9;
const optionWidth = (cardWidth - 40 - 10) / 2; // 40 for padding, 10 for ga

export const cardStyles = StyleSheet.create({
  additionalInfoContainer: {
    marginTop: 10,
    width: '100%',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  originalTextLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  alternateTranslationsContainer: {
    marginTop: 8,
  },
  alternateTranslationsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  alternateTranslation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  progressContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 16,
    color: '#4b5563',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
    shadowColor: "#2563eb",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardWrapper: {
    backfaceVisibility: 'hidden',
    width: '100%',
  },
  contextText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#333',
  },
  translationContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  showAnswerButton: {
    marginTop: 20,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 3,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  selectableTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  wordButton: {
    padding: 6,
    borderRadius: 6,
    position: 'relative',
    minHeight: 40,
  },
  correctWord: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  wrongWord: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
});
export const learningStyles = StyleSheet.create({
  additionalInfoContainer: {
    marginTop: 10,
    width: '100%',
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  originalTextLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  originalText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  alternateTranslationsContainer: {
    marginTop: 8,
  },
  alternateTranslationsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  alternateTranslation: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  optionsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
    justifyContent: 'center',
  },
  option: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    width: '48%',    // Keep width at 48%
    minHeight: 60,   // Set minimum height
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionText: {
    fontSize: 16,     // Slightly smaller font size
    color: '#4b5563',
    fontWeight: '500',
    textAlign: 'center',
    flexWrap: 'nowrap',  // Prevent text wrapping
  }, 
  optionSelected: {
    backgroundColor: '#e8f0fe',
    borderColor: '#3498db',
  },
  optionDisabled: {
    opacity: 0.7,
  },  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  cardContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '100%',
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Add these from your cardStyles
  contextText: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
  },
  translationContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  // Learning-specific styles
  word: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  correctOption: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  wrongOption: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});