import * as React from 'react';
import { SafeAreaView, StyleSheet, BackHandler } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import SlidePanel from './slidePanel';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLanguage } from '@/app/languageSelector';
import { database } from '@/components/db/database';
import SimpleReader from './components/SimpleReader';
import { EmittedWord } from './components/events/slidePanelEvents';

export default function PageScreen() {
  const { bookUrl, bookTitle, imageUrl } = useLocalSearchParams<{ 
    bookUrl: string, 
    bookTitle: string, 
    imageUrl: string 
  }>();
  
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<EmittedWord | null>(null);
  const [initialLocation, setInitialLocation] = useState<string | undefined>(undefined);
  const { sourceLanguage } = useLanguage();
  const [readingProgress, setReadingProgress] = useState(0);
  const annotateRef = useRef<(() => void) | undefined>(undefined);
  const router = useRouter();
  const isDBBookRef = useRef<boolean>(bookUrl.endsWith('.db'));

  const handleAnnotateSentence = () => {
    annotateRef.current?.();
  };

  // Initialize book data
  useEffect(() => {
    const initializeBook = async () => {
      await loadSavedLocation();
      const book = await database.getBookByName(bookTitle, sourceLanguage);
      if (book?.progress !== undefined) {
        setReadingProgress(book.progress);
      }
    };
    
    initializeBook();
    
    // Add back handler to properly clean up resources
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );
    
    return () => {
      backHandler.remove();
    };
  }, []);

  // Clean up resources when navigating away
  const handleBackPress = () => {
    // Let the default back navigation happen
    return false;
  };

  
  
  const loadSavedLocation = async () => {
    try {
      const book = await database.getBookByName(bookTitle, sourceLanguage.toLowerCase());
      if (book?.currentLocation !== null) {
        setInitialLocation(book?.currentLocation);
        console.log("Loaded saved location:", book?.currentLocation);
      }
    } catch (error) {
      console.error('Error loading saved location:', error);
    }
  };

  const handlePanelClose = () => {
    setIsPanelVisible(false);
  };

  // Prevent component from re-rendering with different book type
  const isDBBook = isDBBookRef.current;

  return (
    <SafeAreaView style={styles.container}>

        <SimpleReader
          bookUrl={bookUrl}
          bookTitle={bookTitle}
          imageUrl={imageUrl}
        />

      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={handlePanelClose}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  }
});
