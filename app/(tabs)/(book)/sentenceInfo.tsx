import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Switch, ToastAndroid } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookDatabase, DBSentence } from '@/components/db/bookDatabase';
import { ParsedSentence, ParsedWord } from '../(book)/components/types/types';
import { Plus, Link, X } from 'lucide-react-native';
import { EmittedWord } from './components/events/slidePanelEvents';

export default function SentenceInfo() {
  const { content } = useLocalSearchParams();
  const parsedContent: EmittedWord = JSON.parse(content as string);
  const router = useRouter();
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [originalText, setOriginalText] = useState("");
  const [translationText, setTranslationText] = useState("");
  const [db] = useState(() => new BookDatabase(parsedContent.bookTitle as string));
  const [showRawFormat, setShowRawFormat] = useState(false);
  const [parsedSentence, setParsedSentence] = useState<ParsedSentence | null>(null);
  const [dbSentence, setDbSentence] = useState<DBSentence | null>(null);
  const [selectedWordGroup, setSelectedWordGroup] = useState<number | null>(null);
  const [selectedWordIndexes, setSelectedWordIndexes] = useState<number[]>([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number>();
  const [isLongPressed, setIsLongPressed] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [maxGroupNumber, setMaxGroupNumber] = useState(0);
  
  useEffect(() => {
    const initialize = async () => {
      await db.initialize();
      
      
        try {
          // Get the sentence from the database
          const sentences = await db.getChapterSentencesByID(parsedContent.sentenceId);
          if (sentences && sentences.length > 0) {
            setDbSentence(sentences[0]);
            setOriginalText(sentences[0].original_parsed_text ?? "");
            setTranslationText(sentences[0].translation_parsed_text ?? "");
          }
        } catch (error) {
          console.error("Error loading sentence:", error);
        }
      
      
      parseSentence();
    };
    initialize();

    // Cleanup longpress timer
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);
  
  // Re-parse when text changes in edit mode
  useEffect(() => {
    // Parse sentence whenever text changes, regardless of edit mode
    parseSentence();
  }, [originalText, translationText]);
  
  const parseSentence = () => {
    const parsed = parseSentenceText();
    setParsedSentence(parsed);
  };
  
  const parseSentenceText = (): ParsedSentence => {
    const parseText = (text: string, sentenceNumber: number, isTranslation: boolean): ParsedWord[] => {
      const words: ParsedWord[] = [];
      // Split text by spaces to handle spaces correctly
      const textParts = text.split(/(\s+)/);
      
      // Process each text part
      textParts.forEach((part, index) => {
        const isSpace = /^\s+$/.test(part);
        if (isSpace) {
          words.push({
            word: part,
            sentenceNumber,
            wordIndex: index,
            groupNumber: -1,
            linkeNumber: [],
            wordLinkedNumber: [],
            linkedWordMirror: [],
            wordLinkedWordMirror: [],
            isSpace: true,
            isTranslation
          });
          return;
        }
        
        // Parse number and word
        const numberMatch = part.match(/\/(\d+)\//);
        const groupNumber = numberMatch ? parseInt(numberMatch[1]) : -1;
        const cleanWord = part.replace(/\/\d+\//g, '').trim();
        
        if (cleanWord) {
          words.push({
            word: cleanWord,
            sentenceNumber,
            wordIndex: index,
            groupNumber,
            linkeNumber: [],
            wordLinkedNumber: [],
            linkedWordMirror: [],
            wordLinkedWordMirror: [],
            isSpace: false,
            isTranslation
          });
        }
      });
      
      return words;
    };
    
    const original = parseText(originalText, parsedContent.sentenceId, false);
    const translation = parseText(translationText, parsedContent.sentenceId, true);
    
    // Process word groups using a simpler approach
    const groupToWords: Map<number, { original: ParsedWord[], translation: ParsedWord[] }> = new Map();
    
    // Collect words by group number
    original.forEach(word => {
      if (word.groupNumber !== -1) {
        if (!groupToWords.has(word.groupNumber)) {
          groupToWords.set(word.groupNumber, { original: [], translation: [] });
        }
        groupToWords.get(word.groupNumber)!.original.push(word);
      }
    });
    
    translation.forEach(word => {
      if (word.groupNumber !== -1) {
        if (!groupToWords.has(word.groupNumber)) {
          groupToWords.set(word.groupNumber, { original: [], translation: [] });
        }
        groupToWords.get(word.groupNumber)!.translation.push(word);
      }
    });
    
    // Set up links between words in the same group
    groupToWords.forEach(({ original: origWords, translation: transWords }, groupNumber) => {
      // Link original words to each other
      origWords.forEach(word => {
        word.linkeNumber = origWords
          .filter(w => w !== word)
          .map(w => w.wordIndex);
          
        word.wordLinkedNumber = origWords
          .filter(w => w !== word)
          .map(w => w.word);
          
        // Link to translation words
        word.linkedWordMirror = transWords.map(w => w.wordIndex);
        word.wordLinkedWordMirror = transWords.map(w => w.word);
      });
      
      // Link translation words to each other
      transWords.forEach(word => {
        word.linkeNumber = transWords
          .filter(w => w !== word)
          .map(w => w.wordIndex);
          
        word.wordLinkedNumber = transWords
          .filter(w => w !== word)
          .map(w => w.word);
          
        // Link to original words
        word.linkedWordMirror = origWords.map(w => w.wordIndex);
        word.wordLinkedWordMirror = origWords.map(w => w.word);
      });
    });
    
    return { original, translation };
  };

  
  const applyGroupToWord = useCallback((word: ParsedWord, newGroupNumber: number) => {
    const isTranslation = word.isTranslation;
    const wordIndex = word.wordIndex;
    
    if (isTranslation) {
      // For translation text
      setTranslationText(prevText => {
        const textParts = prevText.split(/(\s+)/);
        let newText = '';
        
        for (let i = 0; i < textParts.length; i++) {
          const part = textParts[i];
          if (/^\s+$/.test(part)) {
            newText += part;
          } else if (i === wordIndex) {
            const cleanWord = part.replace(/\/\d+\//g, '');
            newText += `${cleanWord}/${newGroupNumber}/`;
          } else {
            newText += part;
          }
        }
        
        return newText;
      });
    } else {
      // For original text
      setOriginalText(prevText => {
        const textParts = prevText.split(/(\s+)/);
        let newText = '';
        
        for (let i = 0; i < textParts.length; i++) {
          const part = textParts[i];
          if (/^\s+$/.test(part)) {
            newText += part;
          } else if (i === wordIndex) {
            const cleanWord = part.replace(/\/\d+\//g, '');
            newText += `${cleanWord}/${newGroupNumber}/`;
          } else {
            newText += part;
          }
        }
        
        return newText;
      });
    }
  }, []);

  const handleLongPress = useCallback((word: ParsedWord) => {
    if (!isEditing) return;
    
    // Set this word's group as the selected group
    setSelectedWordGroup(word.groupNumber);
    setIsLongPressed(true);
    
    ToastAndroid.show(`Group ${word.groupNumber} selected. Tap other words to link them.`, ToastAndroid.LONG);
  }, [isEditing]);
  
  const createNewGroup = useCallback(() => {
    if (!isEditing) return;
    if (selectedWordGroup === null) {
      ToastAndroid.show("Select a word first to create a group", ToastAndroid.SHORT);
      return;
    }
    
    // Find the selected word
    const foundWord = [...(parsedSentence?.original || []), ...(parsedSentence?.translation || [])]
      .find(word => word.groupNumber === selectedWordGroup);

    
    if (foundWord) {
      // Create a new group with the next available number
      const newGroupNumber = maxGroupNumber + 1;
      applyGroupToWord(foundWord, newGroupNumber);
      
      // Update selection to the new group
      setSelectedWordGroup(newGroupNumber);
      setMaxGroupNumber(newGroupNumber);
      
      ToastAndroid.show(`Created new group ${newGroupNumber}`, ToastAndroid.SHORT);
    }
  }, [isEditing, selectedWordGroup, maxGroupNumber, parsedSentence, applyGroupToWord]);
  
  // Find the max group number whenever parsing is done
  useEffect(() => {
    if (parsedSentence) {
      // Find highest group number
      let maxNumber = 0;
      [...parsedSentence.original, ...parsedSentence.translation].forEach(word => {
        if (word.groupNumber > maxNumber) {
          maxNumber = word.groupNumber;
        }
      });
      setMaxGroupNumber(maxNumber);
    }
  }, [parsedSentence]);

  const handleWordPress = useCallback((word: ParsedWord) => {
    // If we're in edit mode and have a long-pressed word
    if (isEditing && isLongPressed && selectedWordGroup !== null) {
      // Apply the selected group number to this word
      applyGroupToWord(word, selectedWordGroup);
      ToastAndroid.show(`Word linked to group ${selectedWordGroup}`, ToastAndroid.SHORT);
      setTimeout(() => {
        parseSentence();
      }, 0);
      return;
    }
    
    if (word.groupNumber === -1) return;
    
    // Clear previous selection
    if (selectedWordGroup === word.groupNumber) {
      setSelectedWordGroup(null);
      setSelectedWordIndexes([]);
      setTimeout(() => {
        parseSentence();
      }, 0);
      return;
    }
    
    // Set new selection
    setSelectedWordGroup(word.groupNumber);
    
    // Collect all related words' indices
    const relatedIndices = [];
    
    // Self
    relatedIndices.push(word.wordIndex);
    setSelectedWordIndex(word.wordIndex);
    
    // Words in same sentence with same group
    relatedIndices.push(...word.linkeNumber);
    
    // Remember the selected indices
    setSelectedWordIndexes(relatedIndices);

    setTimeout(() => {
      parseSentence();
    }, 0);
    
  }, [selectedWordGroup, isEditing, isLongPressed, applyGroupToWord, parseSentence]);
  
  const isWordHighlighted = useCallback((word: ParsedWord): boolean => {
    if (selectedWordGroup === null) return false;
    
    return (
      word.groupNumber === selectedWordGroup || 
      word.linkedWordMirror.some(index => 
        parsedSentence?.[word.isTranslation ? 'original' : 'translation'][index]?.groupNumber === selectedWordGroup
      )
    );
  }, [selectedWordGroup, parsedSentence]);
  
  const handleSave = async () => {
    if (parsedContent.sentenceId === null || parsedContent.sentenceId === undefined) {
      Alert.alert("Error", "Cannot save - no sentence ID");
      return;
    }
    
    try {
      // Find the sentence in the database and update it
      await db.rewriteSentence(parsedContent.sentenceId, originalText, translationText);
      
      Alert.alert("Success", "Sentence updated successfully", [
        { 
          text: "OK", 
          onPress: () => {
            // Navigate back to the reader or refresh the current page
            router.back();
          }
        }
      ]);
      
      setIsEditing(false);
      setIsLongPressed(false);
      setSelectedWordGroup(null);
    } catch (error) {
      console.error("Error saving sentence:", error);
      Alert.alert("Error", "Failed to save changes");
    }
  };
  
  const clearSelection = useCallback(() => {
    setSelectedWordGroup(null);
    setSelectedWordIndexes([]);
    setIsLongPressed(false);
    ToastAndroid.show("Selection cleared", ToastAndroid.SHORT);
  }, []);
  
  const renderWord = (word: ParsedWord, index: number) => {
    if (word.isSpace) {
      return <Text key={`space-${index}`}>{word.word}</Text>;
    }
    
    const isHighlighted = isWordHighlighted(word);
    
    return (
      <TouchableOpacity
        key={`word-${index}`}
        onPress={() => handleWordPress(word)}
        onLongPress={() => handleLongPress(word)}
        delayLongPress={500}
        disabled={!isEditing && word.groupNumber === -1}
        style={styles.wordTouchable}
      >
        <Text
          style={[
            styles.wordText,
            word.groupNumber !== -1 && styles.groupedWord,
            isHighlighted && styles.highlightedWord,
            isEditing && styles.editingWord
          ]}
        >
          {isEditing && word.groupNumber !== -1 && (
            <Text style={styles.groupNumber}>{word.groupNumber}</Text>
          )}
          {word.word}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const renderParsedText = (isTranslation: boolean) => {
    if (!parsedSentence) return <Text>No parsed data available</Text>;
    
    const words = isTranslation ? parsedSentence.translation : parsedSentence.original;
    
    return (
      <View style={styles.parsedTextContainer}>
        {words.map((word, index) => renderWord(word, index))}
      </View>
    );
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      // Turning off edit mode
      setIsLongPressed(false);
      setSelectedWordGroup(null);
    } else {
      // Turning on edit mode, show instructions
      ToastAndroid.show("Long press a word to select its group, then tap other words to link them", ToastAndroid.LONG);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.toolbarContainer}>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Show Raw Format</Text>
          <Switch 
            value={showRawFormat} 
            onValueChange={(value) => setShowRawFormat(value)}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={showRawFormat ? '#2563eb' : '#9ca3af'}
          />
        </View>
        
        {isEditing && selectedWordGroup !== null && !showRawFormat && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.newGroupButton}
              onPress={createNewGroup}
            >
              <Plus size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.deselectButton}
              onPress={clearSelection}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {isEditing && !showRawFormat && (
        <View style={styles.editInstructions}>
          <Link size={18} color="#666" />
          <Text style={styles.instructionText}>
            Long press a word to select its group, then tap other words to link them
          </Text>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Original</Text>
        {showRawFormat && isEditing ? (
          <TextInput
            style={styles.textInput}
            multiline
            value={originalText}
            onChangeText={setOriginalText}
          />
        ) : showRawFormat ? (
          <Text style={styles.content}>
            {originalText}
          </Text>
        ) : (
          renderParsedText(false)
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Translation</Text>
        {showRawFormat && isEditing ? (
          <TextInput
            style={styles.textInput}
            multiline
            value={translationText}
            onChangeText={setTranslationText}
          />
        ) : showRawFormat ? (
          <Text style={styles.content}>
            {translationText}
          </Text>
        ) : (
          renderParsedText(true)
        )}
      </View>
      
      {parsedContent.sentenceId !== null && (
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]} 
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]} 
                onPress={() => {
                  setIsEditing(false);
                  setIsLongPressed(false);
                  setSelectedWordGroup(null);
                  // Reset text to original values
                  setOriginalText(dbSentence?.original_parsed_text ?? "");
                  setTranslationText(dbSentence?.translation_parsed_text ?? "");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.editButton]} 
              onPress={toggleEditMode}
            >
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  editInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffde7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  instructionText: {
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  toolbarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  newGroupButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  deselectButton: {
    backgroundColor: '#FF9800',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  content: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
  textInput: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    minHeight: 100,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 2,
    margin: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#4A90E2',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#555',
  },
  parsedTextContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    paddingVertical: 5,
  },
  wordTouchable: {
    marginRight: 5,
    marginBottom: 8,
  },
  wordText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 22,
  },
  groupedWord: {
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#3498db',
  },
  highlightedWord: {
    backgroundColor: '#3498db',
    color: '#fff',
    borderRadius: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0,
  },
  editingWord: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  groupNumber: {
    fontSize: 10,
    color: '#999',
    marginRight: 2,
    fontWeight: 'bold',
  }
});