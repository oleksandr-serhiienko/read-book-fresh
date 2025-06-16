import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Volume2, VolumeX } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '@/app/languageSelector';
import voices from '@/components/reverso/languages/voicesTranslate';
import languages from '@/components/reverso/languages/entities/languages';

interface AudioControlProps {
  text: string;
  cardId: number;
  autoPlay?: boolean;
}

export const AudioControl: React.FC<AudioControlProps> = ({ text, cardId, autoPlay = false }) => {
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { sourceLanguage } = useLanguage();
  const languageKey = sourceLanguage.toLowerCase() as keyof typeof languages;

  // First effect just for loading the state
  useEffect(() => {
    setIsLoaded(false); // Reset loaded state when cardId changes
    loadSpeakerState();
  }, [cardId]);

  // Second effect for handling auto-play after state is loaded
  useEffect(() => {
    if (isLoaded && autoPlay && isSpeakerOn && text) {
      handleSpeak();
    }
  }, [isLoaded]);

  const loadSpeakerState = async () => {
    try {
      const state = await AsyncStorage.getItem(`speaker_state`);
      const newState = state === null ? true : state === 'true';
      setIsSpeakerOn(newState);
      setIsLoaded(true); // Mark as loaded only after state is set
    } catch (error) {
      console.error('Error loading speaker state:', error);
      setIsLoaded(true); // Still mark as loaded in case of error
    }
  };

  const saveSpeakerState = async (state: boolean) => {
    try {
      await AsyncStorage.setItem(`speaker_state`, state.toString());
    } catch (error) {
      console.error('Error saving speaker state:', error);
    }
  };

  const handleSpeak = async () => {
    //if (!isSpeakerOn || isSpeaking) return;
    setIsSpeaking(true);
    try {
      const options = {
        language: voices[languageKey as keyof typeof voices] || 'en-US',
        pitch: 1.0,
        rate: 0.75
      };
      await Speech.speak(text, options);
    } catch (error) {
      console.error('Error speaking:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    saveSpeakerState(newState);
    if(newState){
        handleSpeak();
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.button, isSpeaking && styles.speaking]}
      onPress={toggleSpeaker}
      disabled={isSpeaking}
    >
      {isSpeakerOn ? (
        <Volume2 size={24} color="#666" strokeWidth={2} />
      ) : (
        <VolumeX size={24} color="#666" strokeWidth={2} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  speaking: {
    backgroundColor: '#e0e0e0',
  },
});

export default AudioControl;