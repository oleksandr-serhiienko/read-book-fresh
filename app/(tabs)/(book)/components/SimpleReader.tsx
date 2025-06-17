// SimpleReader.tsx - Fixed version
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, Text, FlatList, Button, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChapterData } from './hooks/useChapterData';
import { Sentence } from './components/Sentence';
import { useParsedSentences } from './hooks/useParsedSentences';
import { useWordHighlight } from './hooks/useWordHighlight';
import { PanelContent, SlidePanelEvents } from './events/slidePanelEvents';
import { FontSizeEvents } from './events/fontSizeEvents';
import SlidePanel from '../slidePanel';
import ReaderSettings from './components/ReaderSettings';
import BottomChapterNavigation from './components/BottomChapterNavigation';
import { ParsedWord } from './types/types';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';
import { Book, database } from "@/components/db/database";
import { useLanguage } from '@/app/languageSelector';
import FileManager from './FileManager';
import ProgressBar from './ProgressBar';

// Type definition for ViewToken
type ViewToken = {
  item: DBSentence;
  key: string;
  index: number | null;
  isViewable: boolean;
};

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const DEFAULT_FONT_SIZE = 16;


interface DBReaderProps {
  bookUrl: string;
  bookTitle: string;
  imageUrl: string;
}

const SimpleReader: React.FC<DBReaderProps> = ({ bookUrl, bookTitle, imageUrl }) => {
  // Basic reader state
  const [currentFontSize, setCurrentFontSize] = useState(DEFAULT_FONT_SIZE);
  const [isPanelVisible, setIsPanelVisible] = useState(false);
  const [panelContent, setPanelContent] = useState<PanelContent>(null);
  const [db, setDb] = useState<BookDatabase | null>(null);
  const { sourceLanguage, targetLanguage } = useLanguage();
  const dbRef = useRef<BookDatabase | null>(null);
  
  // Chapter and sentence tracking
  const [readerCurrentChapter, setReaderCurrentChapter] = useState(1);
  // Add a ref to track the current chapter that the callback can use
  const currentChapterRef = useRef(1);
  const [targetSentenceIndex, setTargetSentenceIndex] = useState(1);
  const [sentencesBeforeTarget, setSentencesBeforeTarget] = useState(15);
  const [currentVisibleSentence, setCurrentVisibleSentence] = useState<number | null>(null);
  let maxChapterCount = 0;
  let maxSentenceCount = 0;
  const [chapterProgress, setChapterProgress] = useState<number>(0);
  const [sentencProgress, setSentenceProgress] = useState<number>(0);
  
  // UI state
  const [shouldScrollToTarget, setShouldScrollToTarget] = useState(true);
  const [showAllSentences, setShowAllSentences] = useState(false);
  const [isAtBeginning, setIsAtBeginning] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  //const [scrollPosition, setScrollPosition] = useState(0);
  
  // Scrolling timer ref
  const scrollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // FlatList ref
  const flatListRef = useRef<FlatList<DBSentence>>(null);

  // Add these at the top of your SimpleReader component
  const updateQueueRef = useRef<Array<{chapter: number, sentence: number}>>([]);
  const isProcessingQueueRef = useRef(false);
  
  // Update the ref whenever readerCurrentChapter changes
  useEffect(() => {
    currentChapterRef.current = readerCurrentChapter;
  }, [readerCurrentChapter]);
  
  // Database initialization function
  const initializeDb = async () => {
    console.log("Initializing database for book:", bookTitle);
    
    // Clean up existing database if needed
    if (dbRef.current) {
      try {
        console.log("Closing previous database connection");
        await dbRef.current.close();
        dbRef.current = null;
      } catch (err) {
        console.error("Error closing previous database:", err);
        // Continue with new database creation regardless
      }
    }
    
    // Create fresh database instance
    const bookDatabase = new BookDatabase(bookTitle);
    let dbInitialized = false;
    
    try {
      dbInitialized = await bookDatabase.initialize();
      
      if (!dbInitialized) {
        console.log("Database not initialized, downloading...");
        await bookDatabase.downloadDatabase(bookUrl);
        dbInitialized = await bookDatabase.initialize();
        
        if (!dbInitialized) { 
          throw new Error("Failed to initialize database after download");
        }
      }
      
      // Update book record in main database
      const bookExist = await database.getBookByName(bookTitle, sourceLanguage.toLowerCase());
      let localImage = await FileManager.checkImage(imageUrl);    
      if (bookExist === null) {
        const book: Book = {
          bookUrl: bookUrl,
          name: bookTitle,
          sourceLanguage: sourceLanguage.toLowerCase(),
          updateDate: new Date(),
          lastreadDate: new Date(),
          imageUrl: localImage,
          progress: 0
        };
        await database.insertBook(book);
        maxChapterCount = await bookDatabase.getTotalChapters();
        maxSentenceCount = await bookDatabase.getChapterSentenceCount(1);   
      } else {
        let savedChapter = 1; // Default
        let savedSentence = 1; // Default
        if (bookExist.currentLocation) {
          try {
            const parts = bookExist.currentLocation.split('_');
            if (parts.length === 2) {
              const ch = parseInt(parts[0], 10);
              const sent = parseInt(parts[1], 10);
              
              if (!isNaN(ch) && ch > 0 && !isNaN(sent) && sent > 0) {
                console.log(`Found saved position: Chapter ${ch}, Sentence ${sent}`);
                savedChapter = ch;
                savedSentence = sent;
              }

            }
          } catch (e) {
            console.error("Error parsing saved position:", e);
          }
        }
        
        // Set the values directly regardless of whether we found a saved position
        console.log(`Setting reader position: Chapter ${savedChapter}, Sentence ${savedSentence}`);
        setReaderCurrentChapter(savedChapter);
        currentChapterRef.current = savedChapter; // Update the ref too
        setTargetSentenceIndex(savedSentence); 
        maxChapterCount = await bookDatabase.getTotalChapters();
        maxSentenceCount = await bookDatabase.getChapterSentenceCount(savedChapter);      
      }
      
      console.log("Database initialized successfully");
      dbRef.current = bookDatabase;
      setDb(bookDatabase);
      

      
      return true;
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  };

  // Initialize database on mount or book change
  useEffect(() => {
    console.log("Book changed, reinitializing database...");
    initializeDb().catch(console.error);
    loadFontSize();
    FontSizeEvents.reset();
    
    const unsubscribe = FontSizeEvents.subscribe((newSize) => {
      setCurrentFontSize(newSize);
    });
    
    // Clean up on unmount or book change
    return () => {
      unsubscribe();
      
      // Clean up auto-scrolling timer
      if (scrollingTimerRef.current) {
        clearTimeout(scrollingTimerRef.current);
      }
      
      // Close database connection when component unmounts
      const cleanup = async () => {
        if (dbRef.current) {
          console.log("Component unmounting, closing database");
          try {
            await dbRef.current.close();
            dbRef.current = null;
          } catch (err) {
            console.error("Error closing database on unmount:", err);
          }
        }
      };
      
      cleanup();
    };
  }, [bookTitle, bookUrl]);

  // Load chapter when database is ready or chapter changes
  useEffect(() => {
    if (db) {
      loadChapter(readerCurrentChapter);
      setShouldScrollToTarget(true);
      setShowAllSentences(false);
    }
  }, [db, readerCurrentChapter]);

  // Chapter data from hook
  const {
    currentChapter,
    chapterSentences,
    isLoading,
    error,
    totalChapters,
    loadChapter,
    nextChapter,
    previousChapter
  } = useChapterData({ db });

  // Sentence parsing
  const { parsedSentences, updateParsedSentences, parseSentence } = useParsedSentences(chapterSentences);
  
  // Filter sentences based on current mode
  const displayedSentences = showAllSentences 
    ? chapterSentences 
    : chapterSentences.filter(
        s => s.sentence_number >= targetSentenceIndex - sentencesBeforeTarget
      );

  // Determine if we should show the back button
  const shouldShowBackButton = !showAllSentences && 
                              targetSentenceIndex > 1 && 
                              isAtBeginning;

    // Queue processor function
  const processUpdateQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || updateQueueRef.current.length === 0) {
      return;
    }
    
    isProcessingQueueRef.current = true;
    
    try {
      // Get the latest update (ignore intermediate ones)
      const latestUpdate = updateQueueRef.current[updateQueueRef.current.length - 1];
      updateQueueRef.current = []; // Clear queue
      
      const progress = `${latestUpdate.chapter}_${latestUpdate.sentence}`;
      
      await database.updateBook(bookTitle, sourceLanguage.toLowerCase(), progress);
      await getReadingProgress(latestUpdate.chapter, latestUpdate.sentence);
      
      console.log(`Progress updated: ${progress}`);
      
      // Process remaining items if any were added during processing
      if (updateQueueRef.current.length > 0) {
        setTimeout(() => processUpdateQueue(), 100);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      isProcessingQueueRef.current = false;
    }
  }, [bookTitle, sourceLanguage]);

  // Queue-based onViewableItemsChanged
  const onViewableItemsChanged = useRef(({ 
    viewableItems 
  }: {
    viewableItems: ViewToken[];
    changed: ViewToken[];
  }) => {
    if (viewableItems && viewableItems.length > 0) {
      const middleIndex = Math.floor(viewableItems.length / 2);
      const middleItem = viewableItems[middleIndex];
      
      if (middleItem && middleItem.item) {
        const sentenceNumber = middleItem.item.sentence_number;
        if (sentenceNumber !== currentVisibleSentence) {
          setCurrentVisibleSentence(sentenceNumber);
          const currentChapter = currentChapterRef.current;
          console.log(`Currently reading sentence ${sentenceNumber} / ${maxSentenceCount} in chapter ${currentChapter}`);
          
          // Add to queue instead of immediate update
          updateQueueRef.current.push({
            chapter: currentChapter,
            sentence: sentenceNumber
          });
          
          // Process queue (will be ignored if already processing)
          processUpdateQueue();
        }
      }
    }
  }).current;

  const getReadingProgress = async (currentChapterNumber: number, currentSentenceNumber: number) => {
    
    try {
      
      // Now calculate with the fresh values
      const chapterProgress = (currentChapterNumber / maxChapterCount) * 100;
      const sentenceProgress = (currentSentenceNumber / maxSentenceCount) * 100;

      // Update state with the calculated values
      setChapterProgress(chapterProgress);
      setSentenceProgress(sentenceProgress);
      
      // You can also update the book progress in the database here
      // Use the overall progress (combination of chapter and sentence progress)
      const overallProgress = (chapterProgress + (sentenceProgress / totalChapters)) / 100;
      await database.updateBookProgress(bookTitle, sourceLanguage.toLowerCase(), overallProgress);
    } catch (error) {
      console.error("Error calculating reading progress:", error);
    }
  };

  // Handler for "Back to beginning" button
  const handleBackToTop = () => {
    console.log("Back to beginning button pressed");
    setShowAllSentences(true);
    
    // Indicate auto-scrolling is in progress
    setIsAutoScrolling(true);
    
    // Scroll to top after render
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        
        // Turn off auto-scrolling after animation completes
        setTimeout(() => {
          setIsAutoScrolling(false);
        }, 500);
      }
    }, 100);
  };

  // Custom chapter navigation handlers
  const handleNextChapter = () => {
    if (readerCurrentChapter < totalChapters) {
      setReaderCurrentChapter(readerCurrentChapter + 1);
      setTargetSentenceIndex(1); 
      // Reset states for new chapter
      setShouldScrollToTarget(true);
      setShowAllSentences(false);
    }
  };

  const handlePreviousChapter = () => {
    if (readerCurrentChapter > 1) {
      setReaderCurrentChapter(readerCurrentChapter - 1);
      setTargetSentenceIndex(1); 
      // Reset states for new chapter
      setShouldScrollToTarget(true);
      setShowAllSentences(false);
    }
  };

  // Auto-scroll to target sentence
  useEffect(() => {
    if (shouldScrollToTarget && !showAllSentences && displayedSentences.length > 0 && flatListRef.current) {
      console.log("Attempting to scroll to target sentence in filtered data");
      
      // Find the index of the targetSentenceIndex in the filtered array
      const targetIndex = displayedSentences.findIndex(
        item => item.sentence_number === targetSentenceIndex
      );
      
      console.log("Target sentence index in filtered array:", targetIndex);
      
      if (targetIndex !== -1) {
        // Show loading overlay for automatic scrolling
        setIsAutoScrolling(true);
        
        // Get estimate of items to render before target
        const itemsBeforeTarget = Math.min(5, targetIndex);
        const estimatedItemHeight = currentFontSize * 1.5; // rough estimate
        
        // Scroll to estimated position first
        console.log("Scrolling to offset...");
        flatListRef.current.scrollToOffset({
          offset: estimatedItemHeight * (targetIndex - itemsBeforeTarget),
          animated: false
        });
        
        // After a moment, try to adjust more precisely
        setTimeout(() => {
          console.log("Scrolling to index...");
          if (flatListRef?.current) {
            flatListRef.current.scrollToIndex({
              index: targetIndex,
              viewPosition: 0.3,
              animated: false
            });
          }
          
          // Hide loading overlay after adjustment
          setTimeout(() => {
            setIsAutoScrolling(false);
          }, 300);
        }, 100);
        
        // Reset scroll flag to avoid unnecessary scrolling
        setShouldScrollToTarget(false);
      }
    }
  }, [displayedSentences, shouldScrollToTarget, currentFontSize, showAllSentences, targetSentenceIndex]);

  // Font size management
  useEffect(() => {
    loadFontSize();
    FontSizeEvents.reset();
    
    const unsubscribe = FontSizeEvents.subscribe((newSize) => {
      console.log('Font size updated:', newSize);
      setCurrentFontSize(newSize);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadFontSize = async () => {
    try {
      const savedFontSize = await AsyncStorage.getItem('fontSize');
      if (savedFontSize) {
        const newSize = parseInt(savedFontSize);
        setCurrentFontSize(newSize);
        FontSizeEvents.emit(newSize);
      }
    } catch (error) {
      console.error('Error loading font size:', error);
    }
  };

  const increaseFontSize = async () => {
    if (currentFontSize < MAX_FONT_SIZE) {
      const newSize = currentFontSize + 1;
      setCurrentFontSize(newSize);
      await AsyncStorage.setItem('fontSize', newSize.toString());
      FontSizeEvents.emit(newSize);
    }
  };

  const decreaseFontSize = async () => {
    if (currentFontSize > MIN_FONT_SIZE) {
      const newSize = currentFontSize - 1;
      setCurrentFontSize(newSize);
      await AsyncStorage.setItem('fontSize', newSize.toString());
      FontSizeEvents.emit(newSize);
    }
  };

  // Panel events subscription
  useEffect(() => {
    console.log('[SimpleReader] Setting up panel event subscription');
    SlidePanelEvents.reset();
    
    const unsubscribe = SlidePanelEvents.subscribe((content, isVisible) => {
      console.log('[SimpleReader] Received panel event:', { contentExists: !!content, isVisible });
      requestAnimationFrame(() => {
        setPanelContent(content);
        setIsPanelVisible(isVisible);
      });
    });

    return () => {
      console.log('[SimpleReader] Cleaning up panel event subscription');
      unsubscribe();
    };
  }, []);

  // Word highlighting and selection
  const parsedSentencesState = {
    parsedSentences,
    updateParsedSentences
  };

  const { 
    selectedSentence, 
    handleWordPress, 
    handleLongPress, 
    isWordHighlighted 
  } = useWordHighlight(parseSentence, parsedSentencesState);

  // Handle scroll to index failure
  const handleScrollToIndexFailed = (info: {
    index: number;
    highestMeasuredFrameIndex: number;
    averageItemLength: number;
  }) => {
    console.log("Failed to scroll to index", info);
    
    // Try again with a larger timeout and scroll to the highest measured index first
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: Math.min(info.highestMeasuredFrameIndex, info.index),
          animated: false
        });
        
        // Then try to get to our actual target
        setTimeout(() => {
          if (flatListRef.current) {
            flatListRef.current.scrollToIndex({
              index: info.index,
              animated: false
            });
          }
        }, 100);
      }
    }, 300);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  // Database not ready state
  if (!db) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Main reader view
  return (
    <View style={styles.container}>
      <ReaderSettings
        currentChapter={readerCurrentChapter}
        totalChapters={totalChapters}
        onNext={handleNextChapter}
        onPrevious={handlePreviousChapter}
        currentFontSize={currentFontSize}
        onIncreaseFontSize={increaseFontSize}
        onDecreaseFontSize={decreaseFontSize}
      />
      
      <View style={styles.readerContainer}>
        <View style={styles.rightProgressBarContainer}>
          <View style={styles.rightProgressBarBg}>
            <View 
              style={[
                styles.rightProgressBarFill,
                { height: `${sentencProgress}%` }
              ]} 
            />
          </View>
      </View>
        {/* Back to beginning button - only shown when at start of filtered content */}
        {shouldShowBackButton && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackToTop}
          >
            <Text style={styles.backButtonText}>↑</Text>
          </TouchableOpacity>
        )}
        
        {/* Loading overlay during automatic scrolling */}
        {isAutoScrolling && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        )}
        
        <FlatList
          ref={flatListRef}
          data={displayedSentences}
          keyExtractor={(item) => item.sentence_number.toString()}
          onScroll={(event) => {
            // Check if we're at the beginning of the list (with a small threshold)
            const offset = event.nativeEvent.contentOffset.y;
            setIsAtBeginning(offset < 20);
            //setScrollPosition(offset);
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 300
          }}
          renderItem={({ item }) => (
            <Sentence
              sentence={item}
              parsedSentence={parsedSentences.get(item.sentence_number)}
              isSelected={selectedSentence === item.sentence_number}
              bookTitle={bookTitle}
              fontSize={currentFontSize}
              onWordPress={(word, sentence, index) => handleWordPress(word, sentence, index) as Promise<ParsedWord>}
              onLongPress={() => handleLongPress(item)}
              isWordHighlighted={isWordHighlighted}
              database={db}
            />
          )}
          windowSize={5}
          maxToRenderPerBatch={10}
          initialNumToRender={20}
          removeClippedSubviews={true}
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          ListFooterComponent={
            <BottomChapterNavigation
              currentChapter={readerCurrentChapter}
              totalChapters={totalChapters}
              onNext={handleNextChapter}
              onPrevious={handlePreviousChapter}
            />
          }
        />
      </View>
  
      <SlidePanel
        isVisible={isPanelVisible}
        content={panelContent}
        onClose={() => SlidePanelEvents.emit(null, false)}
      />
      <ProgressBar progress={chapterProgress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  readerContainer: {
    flex: 1,
    position: 'relative',
  },
  content: {
    padding: 16,
    paddingTop: 60, 
  },
  rightProgressBarContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 3,
    zIndex: 5,
  },
  rightProgressBarBg: {
    height: '100%',
    backgroundColor: '#e5e5e5',
    width: '100%',
  },
  rightProgressBarFill: {
    width: '100%',
    backgroundColor: '#3498db',
    position: 'absolute',
    top: 0,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: '#e5e5e5',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3498db',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10,
    elevation: 5,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 24,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0, 
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 15,
  },
  errorText: {
    color: 'red',
    padding: 16,
    textAlign: 'center',
  },
  retryText: {
    color: 'blue',
    padding: 8,
    textAlign: 'center',
    textDecorationLine: 'underline',
  }
});

export default SimpleReader;