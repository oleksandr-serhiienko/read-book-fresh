// Updated panel.tsx - Navigation with EmittedWord format
import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useLanguage } from '@/app/languageSelector';
import voices from '@/components/reverso/languages/voicesTranslate';
import { ArrowLeftRight, Volume1, Volume2 } from 'lucide-react-native';
import languages from '@/components/reverso/languages/entities/languages';
import * as Speech from 'expo-speech';
import { EmittedWord } from './components/events/slidePanelEvents';

// Base Panel Component remains the same...
const BasePanel = ({ 
  isVisible, 
  children 
}: { 
  isVisible: boolean;
  children: React.ReactNode;
}) => {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  return (
    <Animated.View
      style={[
        styles.panel,
        !isVisible && styles.hidden,
        {
          transform: [{
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0]
            })
          }]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

// Updated WordTranslationPanel with EmittedWord navigation
const WordTranslationPanel = ({
  content,
  isVisible,
  onClose,
  onAddToDictionary,
  isAdded
}: {
  content: EmittedWord;
  isVisible: boolean;
  onClose: () => void;
  onAddToDictionary: () => void;
  isAdded: boolean;
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { sourceLanguage } = useLanguage();
  const languageKey = sourceLanguage.toLowerCase() as keyof typeof languages;
  
  const handleSpeak = async () => {
    setIsSpeaking(true);
    try {
      const options = {
        language: voices[languageKey as keyof typeof voices] || 'en-US',
        pitch: 1.0,
        rate: 0.75
      };    
      await Speech.speak(content.word, options);
    } catch (error) {
      console.error('Error speaking:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Stop event propagation when clicking buttons
  const handleButtonPress = (callback: () => void) => (event: any) => {
    event.stopPropagation();
    callback();
  };

  return (
    <BasePanel isVisible={isVisible}>
      <Link
        href={{
          pathname: "/wordInfo",
          params: { 
            content: JSON.stringify(content),
            added: isAdded.toString()
          }
        }}
        asChild
      >
        <Pressable style={styles.mainContent}>
          <View style={styles.topSection}>
            <Text style={styles.translationText}>{content.translation}</Text>
            <TouchableOpacity 
              onPress={handleButtonPress(onClose)} 
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSection}>
            <Text style={styles.originalText}>{content.word}</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                onPress={handleButtonPress(onAddToDictionary)} 
                style={[styles.actionButton, isAdded && styles.disabledButton]}
                disabled={isAdded}
              >
                <Text style={styles.actionButtonText}>{isAdded ? '✓' : '+'}</Text>
              </TouchableOpacity>
              
              <Link
                href={{
                  pathname: "/sentenceInfo",
                  params: { content: JSON.stringify(content) }
                }}
                asChild
              >
                <TouchableOpacity 
                  onPress={handleButtonPress(() => {})} // Empty function since navigation is handled by Link
                  style={styles.actionButton}
                >
                  <ArrowLeftRight size={20} color="white" strokeWidth={2} />
                </TouchableOpacity>
              </Link>
              
              <TouchableOpacity 
                onPress={handleButtonPress(handleSpeak)}
                style={[styles.actionButton, isSpeaking && styles.speakButtonActive]}
                disabled={isSpeaking}
              >
                {isSpeaking ? (
                  <Volume1 size={20} color="white" strokeWidth={2} />
                ) : (
                  <Volume2 size={20} color="white" strokeWidth={2} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Link>
    </BasePanel>
  );
};
const styles = StyleSheet.create({
    actionButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 20,
        minWidth: 36,
        alignItems: 'center',
        justifyContent: 'center',
      },
      disabledButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
      },
      speakButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.1)',
      },
    sentenceContent: {
        padding: 15,
        flexDirection: 'row',
        alignItems: 'flex-start',
      },
      sentenceTranslation: {
        flex: 1,
        fontSize: 18,
        color: 'white',
        marginRight: 10,
        lineHeight: 24,
      },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#3498db',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  hidden: {
    display: 'none',
  },
  mainContent: {
    padding: 15,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  bottomSection: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  translationText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
  },
  originalText: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  }, 
  actionButtonText: {
    color: 'white',
    fontSize: 16,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
    lineHeight: 20,
  }
});

export { WordTranslationPanel };