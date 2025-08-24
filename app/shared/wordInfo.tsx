// Enhanced wordInfo.tsx - Merging features from both versions
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { ResponseTranslation } from '@/components/reverso/reverso';
import { EmittedWord } from '@/app/(tabs)/(book)/components/events/slidePanelEvents';
import { Database, Card, HistoryEntry, Word, Translation, Example } from '@/components/db/database';
import { useLanguage } from '@/app/languageSelector';
import * as Speech from 'expo-speech';
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Check, 
  Volume2, 
  Volume1, 
  Pencil, 
  ArrowRight, 
  BarChart2,
  Info,
  BookOpen,
  MessageSquare,
  ChevronRight,
  Trash2
} from 'lucide-react-native';
import languages from '@/components/reverso/languages/entities/languages';
import voices from '@/components/reverso/languages/voicesTranslate';
import { BookDatabase } from '@/components/db/bookDatabase';
import { router } from 'expo-router';
import HistoryItem from './historyItem';

interface WordInfoContentProps {
  content: string;
  initialIsAdded: boolean;
}

interface WordInfo {
  word: string;
  translation: string;
}

export function WordInfoContent({ content, initialIsAdded }: WordInfoContentProps) {
  const parsedContent = JSON.parse(content);
  const [isAdded, setIsAdded] = useState(initialIsAdded);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [comment, setComment] = useState('');
  const [individualWords, setIndividualWords] = useState<WordInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wordData, setWordData] = useState<Word | null>(null);
  const [fullTranslation, setFullTranslation] = useState<ResponseTranslation | null>(null);
  
  // Expanded states for collapsible sections
  const [expandedTranslations, setExpandedTranslations] = useState<Set<number>>(new Set());
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set());
  const [showWordDetails, setShowWordDetails] = useState(false);
  
  // ✅ Add ref to store translation data immediately
  const translationRef = useRef<ResponseTranslation | null>(null);
  
  const { sourceLanguage, targetLanguage } = useLanguage();
  const languageKey = sourceLanguage.toLowerCase() as keyof typeof languages;
  const database = new Database();   
  const [db, setDb] = useState<BookDatabase | null>(null);
  
  // State for card history
  const [cardHistory, setCardHistory] = useState<HistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyExists, setHistoryExists] = useState(false);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);

  const isEmittedWord = (obj: any): obj is EmittedWord => {
    return obj && 
           typeof obj === 'object' && 
           typeof obj.word === 'string' && 
           typeof obj.translation === 'string' && 
           (obj.bookTitle === undefined || typeof obj.bookTitle === 'string');
  };

  useEffect(() => {
    initializeData();
  }, []);

  useEffect(() => {
    const setupAndLoadData = async () => {
      try {
        // Only proceed if we have fullTranslation data and a database is set
        if (!db) {
          return;
        }
        // Load individual words using the database
        await loadIndividualWords(db);
      } catch (error) {
        console.error('Error loading individual words:', error);
        setIndividualWords([]);
      }
    }
    setupAndLoadData();
  }, [db]); 

  const initializeData = async () => {
    try {
      setIsLoading(true);
      
      if (isEmittedWord(parsedContent)) {
        await handleEmittedWord(parsedContent);
      } else {
        await handleCard(parsedContent);
      }
      
      // ✅ Use ref data instead of state
      if (initialIsAdded && translationRef.current) {
        console.log("Loading existing comment for:", translationRef.current.Original);
        await loadExistingComment(translationRef.current.Original);
        await checkForHistory(translationRef.current.Original);
      } else if (translationRef.current) {
        await checkWordExists(translationRef.current.Original);
      }
    } catch (error) {
      console.error('Error initializing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCard = async (cardId: number) => {
    let card = await database.getCardById(cardId);
    console.log("Got card " + card?.word + " for id " + card?.id + " in book "  + card?.source);
    
    if (card?.wordInfo) {
      setWordData(card?.wordInfo);
      console.log("📱 Word View Opened - Complete JSON Format:", JSON.stringify(card?.wordInfo, null, 2));
      let word = card?.wordInfo;
      
      // Extract all meanings from translations
      const allMeanings = word.translations?.map(t => t.meaning).filter(Boolean) || [];
      
      // Extract all examples from all translations
      const allExamples = word.translations?.flatMap(t => t.examples || []) || [];
      
      // Convert to ResponseTranslation format for compatibility
      const responseTranslation: ResponseTranslation = {
        Original: card.word,
        Translations: allMeanings.map(meaning => ({ word: meaning || '', pos: '' })),
        Contexts: allExamples.map(example => ({
          original: example.source || '',
          translation: example.target || ''
        })),
        Book: card.source || 'Unknown',
        TextView: "" 
      };
      
      // ✅ Store in ref immediately
      translationRef.current = responseTranslation;
      setFullTranslation(responseTranslation);
    }
  }

  const handleEmittedWord = async (emittedWord: EmittedWord) => {
    try {
      let bookDb: BookDatabase | null = null;
      let wordTranslation: Word | null = null;

      try {
        const tempDb = new BookDatabase(emittedWord.bookTitle);
        const initialized = await tempDb.initialize();
        if (initialized) {
          const translation = await tempDb.getWordTranslation(emittedWord.word.toLowerCase());
          bookDb = tempDb;
          wordTranslation = translation;
          setDb(tempDb);            
        }
      } catch (error) {
        console.error(`Error checking book ${emittedWord.bookTitle}:`, error);
      }

      let responseTranslation: ResponseTranslation;

      if (wordTranslation) {
        setWordData(wordTranslation);
        console.log("📱 Word View Opened - Complete JSON Format:", JSON.stringify(wordTranslation, null, 2));
        
        // Extract all meanings from translations
        const allMeanings = wordTranslation.translations?.map(t => t.meaning).filter(Boolean) || [];
        
        // Extract all examples from all translations
        const allExamples = wordTranslation.translations?.flatMap(t => t.examples || []) || [];
        
        // Convert to ResponseTranslation format for compatibility
        responseTranslation = {
          Original: emittedWord.word,
          Translations: allMeanings.map(meaning => ({ word: meaning || '', pos: '' })),
          Contexts: allExamples.map(example => ({
            original: example.source || '',
            translation: example.target || ''
          })),
          Book: bookDb?.getDbName() || 'Unknown',
          TextView: emittedWord.translation
        };
      } else {
        // If not found in database, create a minimal response
        responseTranslation = {
          Original: emittedWord.word,
          Translations: [{ word: emittedWord.translation, pos: '' }],
          Contexts: [],
          Book: emittedWord.bookTitle,
          TextView: emittedWord.translation
        };
      }
      
      // ✅ Store in ref immediately
      translationRef.current = responseTranslation;
      setFullTranslation(responseTranslation);
    } catch (error) {
      console.error('Error handling emitted word:', error);
    }
  };

  const loadIndividualWords = async (bookDatabase: BookDatabase) => {
    if (!parsedContent?.word || typeof parsedContent.word !== 'string') {
      setIndividualWords([]);
      return;
    }
    
    // Check if this is a phrase (contains spaces)
    if (parsedContent.word.includes(' ')) {
      const words = parsedContent.word.split(' ')
        .filter((word: string) => word.trim().length > 0);
      const wordsWithTranslations = await Promise.all(
        words.map(async (word: string) => {
          const translation = await bookDatabase.getWordTranslation(word.trim().toLowerCase());
          // Get first meaning from first translation
          const firstMeaning = translation?.translations?.[0]?.meaning || '';
          return {
            word: word.trim(),
            translation: firstMeaning,
          };
        })
      );
      
      setIndividualWords(wordsWithTranslations);
    } else {
      setIndividualWords([]);
    }
  };

  // ✅ Updated to accept word parameter
  const checkWordExists = async (wordOriginal: string) => {
    if (!wordOriginal) return;
    
    try {
      const wordExists = !(await database.WordDoesNotExist(wordOriginal));
      setHistoryExists(wordExists);
      if (wordExists) {
        const card = await database.getCardByWord(wordOriginal);
        if (card) {
          setCurrentCard(card);
        }
      }
    } catch (error) {
      console.error('Error checking if word exists:', error);
    }
  };

  // ✅ Updated to accept word parameter
  const checkForHistory = async (wordOriginal: string) => {
    if (!wordOriginal) return;
    
    try {
      const card = await database.getCardByWord(wordOriginal);
      if (card) {
        setCurrentCard(card);
        setHistoryExists(true);
      }
    } catch (error) {
      console.error('Error checking for history:', error);
    }
  };

  // Load history for the current word
  const loadHistory = async () => {
    if (!currentCard || !currentCard.id) return;
    
    setIsLoadingHistory(true);
    
    try {
      const history = await database.getCardHistory(currentCard.id);
      setCardHistory(history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const toggleHistoryView = async () => {
    if (showHistory) {
      setShowHistory(false);
    } else {
      if (cardHistory.length === 0) {
        await loadHistory();
      } else {
        setShowHistory(true);
      }
    }
  };

  // ✅ Updated to accept word parameter
  const loadExistingComment = async (wordOriginal: string) => {
    console.log("Loading comment for word:", wordOriginal);
    if (!wordOriginal) return;
    
    try {
      const card = await database.getCardByWord(wordOriginal);
      console.log("Found card:", card?.word, "Comment:", card?.comment);
      if (card?.comment) {
        setComment(card.comment);
      }
    } catch (error) {
      console.error('Error loading comment:', error);
    }
  };

  const handleAddComment = async () => {
    // ✅ Use ref data or fallback to state
    const originalWord = translationRef.current?.Original || fullTranslation?.Original;
    if (!originalWord) return;
    
    setIsSaving(true);
    try {
      const card = await database.getCardByWord(originalWord);
      if (card?.id) {
        card.comment = comment;
        await database.updateCardComment(card);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFromLearning = async () => {
    const originalWord = translationRef.current?.Original || fullTranslation?.Original;
    if (!originalWord) return;
    
    setIsSaving(true);
    try {
      const card = await database.getCardByWord(originalWord);
      if (card?.id) {
        // Actually delete the card from the database
        await database.deleteCard(card.id);
        
        // Navigate back with deleted card ID parameter to update learning deck
        router.navigate({
          pathname: '/(tabs)/(card)/learning',
          params: { deletedCardId: card.id.toString() }
        });
      }
    } catch (error) {
      console.error('Error deleting word from learning:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWordPress = async (word: string) => {
    if (!db) return;
    
    try {
      const wordTranslation = await db.getWordTranslation(word.toLowerCase());
      
      if (wordTranslation && wordTranslation.translations && wordTranslation.translations.length > 0) {
        // Get first meaning from first translation
        const firstMeaning = wordTranslation.translations[0]?.meaning || '';
        
        // Navigate with the EmittedWord format
        const emittedWord: EmittedWord = {bookTitle: db.getDbName(), word: word, translation: "", sentenceId: 0 }
  
        router.push({
          pathname: "/wordInfo",
          params: {
            content: JSON.stringify(emittedWord),
            added: "false"
          }
        });
      }
    } catch (error) {
      console.error('Error fetching word translation:', error);
    }
  };

  const handleSpeak = async () => {
    // ✅ Use ref data or fallback to state
    const originalWord = translationRef.current?.Original || fullTranslation?.Original;
    if (!originalWord) return;
    
    setIsSpeaking(true);
    try {
      const options = {
        language: voices[languageKey as keyof typeof voices] || 'en-US',
        pitch: 1.0,
        rate: 0.75
      };    
      await Speech.speak(originalWord, options);
    } catch (error) {
      console.error('Error speaking:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  const renderTextWithBoldEmphasis = (text: string) => {
    const parts = text.split(/(<em>.*?<\/em>)/);
    return parts.map((part, index) => {
      if (part.startsWith('<em>') && part.endsWith('</em>')) {
        return <Text key={index} style={styles.boldText}>{part.slice(4, -5)}</Text>;
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  const formatAdditionalInfo = (info: any): string => {
    if (typeof info === 'string') {
      // Replace semicolon + space with new line, then any remaining semicolons
      return info.replace(/;\s+/g, '\n').replace(/;/g, '\n');
    }
    if (typeof info === 'object' && info !== null) {
      let jsonString = JSON.stringify(info);
      
      // Remove all { } and " characters
      jsonString = jsonString.replace(/[{}\"]/g, '');
      
      // Add whitespace after colons
      jsonString = jsonString.replace(/:/g, ': ');
      
      // Replace commas and semicolons with spaces, then with new lines
      jsonString = jsonString.replace(/,\s+/g, '\n').replace(/[,;]/g, '\n');
      
      return jsonString;
    }
    return String(info);
  };

  const handleAddToDictionary = async () => {
    // ✅ Use ref data or fallback to state
    const originalWord = translationRef.current?.Original || fullTranslation?.Original;
    if (!originalWord) return;
    
    let noWord = await database.WordDoesNotExist(originalWord)
    if (!noWord){
         console.log("Word already exists");
         return;
      }
    if (!isAdded) {     
      await database.insertCard(parsedContent, sourceLanguage.toLowerCase(), targetLanguage.toLowerCase());
      setIsAdded(true);
      setHistoryExists(true);
      
      // After adding to dictionary, check for history again
      await checkForHistory(originalWord);
    }
  };

  const toggleTranslationExpansion = (index: number) => {
    const newExpanded = new Set(expandedTranslations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTranslations(newExpanded);
  };

  const toggleExampleExpansion = (key: string) => {
    const newExpanded = new Set(expandedExamples);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedExamples(newExpanded);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading word information...</Text>
      </View>
    );
  }

  // If no translation data available
  if (!fullTranslation) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to load word information</Text>
      </View>
    );
  }

  const renderWordDetails = () => {
    if (!wordData) return null;

    return (
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.sectionHeader}
          onPress={() => setShowWordDetails(!showWordDetails)}
        >
          <View style={styles.wordDetailsHeaderContent}>
            <Text style={styles.sectionTitle}>Word Details</Text>
            {wordData.word_info?.base_form && !showWordDetails && (
              <Text style={styles.baseFormPreview}>{formatAdditionalInfo(wordData.word_info.base_form)}</Text>
            )}
          </View>
          {showWordDetails ? 
            <ChevronUp size={20} color="#666" /> : 
            <ChevronDown size={20} color="#666" />
          }
        </TouchableOpacity>
        
        {showWordDetails && (
          <View style={styles.sectionContent}>
            {wordData.word_info?.base_form && (
              <View style={styles.wordDetailItem}>
                <Text style={styles.wordDetailLabel}>Base Form</Text>
                <Text style={styles.wordDetailValue}>
                  {formatAdditionalInfo(wordData.word_info.base_form)}
                </Text>
              </View>
            )}

            {wordData.word_info?.additional_info && (
              <View style={styles.wordDetailItem}>
                <Text style={styles.wordDetailLabel}>Additional Info</Text>
                <Text style={styles.wordDetailValue}>
                  {formatAdditionalInfo(wordData.word_info.additional_info)}
                </Text>
              </View>
            )}

            {isAdded && (
              <View style={styles.wordDetailItem}>
                <Text style={styles.wordDetailLabel}>Comment</Text>
                {isEditing ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.commentInput}
                      value={comment}
                      onChangeText={setComment}
                      multiline
                      placeholder="Add a comment..."
                    />
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={handleAddComment}
                      disabled={isSaving}
                    >
                      <Check size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.commentView}>
                    <Text style={styles.wordDetailValue}>
                      {comment || 'No comment'}
                    </Text>
                    <View style={styles.commentActions}>
                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => setIsEditing(true)}
                      >
                        <Pencil size={16} color="#007AFF" />
                      </TouchableOpacity>
                      {currentCard?.info?.status === 'learning' && (
                        <TouchableOpacity 
                          style={[styles.iconButton, styles.deleteButton]}
                          onPress={handleDeleteFromLearning}
                          disabled={isSaving}
                        >
                          <Trash2 size={16} color="#d32f2f" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderStructuredTranslations = () => {
    if (!wordData?.translations) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Translations</Text>
        
        {wordData.translations.map((translation: Translation, index: number) => (
          <View key={index} style={styles.translationItem}>
            <TouchableOpacity 
              style={styles.translationHeader}
              onPress={() => toggleTranslationExpansion(index)}
            >
              <View style={styles.translationMainInfo}>
                <Text style={styles.originalText}>
                  {translation.meaning || 'No meaning provided'}
                  {translation.type && <Text style={styles.translationType}> • {translation.type}</Text>}
                </Text>
              </View>
              {expandedTranslations.has(index) ? 
                <ChevronUp size={18} color="#666" /> : 
                <ChevronDown size={18} color="#666" />
              }
            </TouchableOpacity>
            
            {expandedTranslations.has(index) && (
              <View style={styles.translationDetails}>
                {translation.additionalInfo && (
                  <View style={styles.additionalInfoContainer}>
                    <Text style={styles.additionalInfoLabel}>Additional Information:</Text>
                    <Text style={styles.translatedText}>
                      {formatAdditionalInfo(translation.additionalInfo)}
                    </Text>
                  </View>
                )}

                {translation.usage && (
                  <View style={styles.additionalInfoContainer}>
                    <Text style={styles.additionalInfoLabel}>Usage:</Text>
                    <Text style={styles.translatedText}>
                      {translation.usage}
                    </Text>
                  </View>
                )}
                
                {translation.examples && translation.examples.length > 0 && (
                  <View style={styles.examplesContainer}>
                    <Text style={styles.examplesTitle}>
                      Examples
                    </Text>
                    {translation.examples.map((example: Example, exampleIndex: number) => {
                      return (
                        <View key={exampleIndex} style={styles.contextItem}>
                          <Text style={styles.originalText}>
                            {renderTextWithBoldEmphasis(example.source || 'No sentence provided')}
                          </Text>
                          {example.target && (
                            <Text style={styles.translatedText}>
                              {renderTextWithBoldEmphasis(example.target)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderLegacyTranslations = () => {
    if (!fullTranslation || wordData?.translations) return null;

    const formattedTranslations = fullTranslation.Translations.slice(0, 5);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Translations</Text>
        {formattedTranslations.map((translation, index) => (
          <View key={index} style={styles.translationItem}>
            <TouchableOpacity 
              style={styles.translationHeader}
              onPress={() => toggleTranslationExpansion(index)}
            >
              <Text style={styles.originalText}>
                {`${translation.word}${translation.pos ? ` • ${translation.pos}` : ''}`}
              </Text>
              {expandedTranslations.has(index) ? 
                <ChevronUp size={18} color="#666" /> : 
                <ChevronDown size={18} color="#666" />
              }
            </TouchableOpacity>
            
            {expandedTranslations.has(index) && (
              <Text style={styles.translatedText}>
                Translation details would go here
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderLegacyContext = () => {
    if (!fullTranslation) return null;

    const context = fullTranslation.Contexts.slice(0, 5);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Context</Text>
        {context.map((item, index) => (
          <View key={index} style={styles.contextItem}>
            <Text style={styles.originalText}>
              {renderTextWithBoldEmphasis(item.original)}
            </Text>
            <Text style={styles.translatedText}>
              {renderTextWithBoldEmphasis(item.translation)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderComment = () => {
    return null; // Comment is now moved to Word Details section
  };

  const renderHistoryButton = () => {
    if (!historyExists) return null;

    return (
      <TouchableOpacity
        style={styles.historyButton}
        onPress={toggleHistoryView}
        disabled={isLoadingHistory}
      >
        {isLoadingHistory ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <BarChart2 size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.historyButtonText}>
              {showHistory ? 'Hide History' : 'Show History'}
            </Text>
            {showHistory ? 
              <ChevronUp size={20} color="#fff" /> : 
              <ChevronDown size={20} color="#fff" />
            }
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderHistoryList = () => {
    if (!showHistory) return null;

    return (
      <View style={styles.historyContainer}>
        <Text style={styles.historySectionTitle}>Learning History</Text>
        {cardHistory.length === 0 ? (
          <Text style={styles.noHistoryText}>No learning history available</Text>
        ) : (
          cardHistory.map((entry, index) => (
            <HistoryItem 
              key={index} 
              entry={entry} 
              index={index} 
              card={currentCard}
            />
          ))
        )}
      </View>
    );
  };

  const renderWordButtons = () => {
    if (!fullTranslation?.Original || !fullTranslation.Original.includes(' ')) {
      return null;
    }

    return (
      <View style={styles.wordButtonsContainer}>
        {individualWords.map((wordInfo, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.wordButton}
            onPress={() => handleWordPress(wordInfo.word)}
          >
            <View style={styles.wordContent}>
              <Text style={styles.wordButtonText}>{wordInfo.word}</Text>
              <Text style={styles.translationText}> • {wordInfo.translation}</Text>
            </View>
            <ArrowRight size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerSection}>
        <View style={styles.headerContent}>
          <Text style={styles.originalWord}>{fullTranslation.Original}</Text>
          {wordData?.word_info?.definition && (
            <Text style={styles.definitionText}>{wordData.word_info.definition}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.speakButton, isSpeaking && styles.speakButtonActive]} 
          onPress={handleSpeak}
          disabled={isSpeaking}
        >
          {isSpeaking ? (
            <Volume1 size={20} color="#666" strokeWidth={2} />
          ) : (
            <Volume2 size={20} color="#666" strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>
      
      {renderWordButtons()}

      {!isAdded && (
        <TouchableOpacity       
          style={[styles.addButton, isAdded && styles.addButtonDisabled]} 
          onPress={handleAddToDictionary}        
          disabled={isAdded}
        >
          <Text style={styles.addButtonText}>
            {isAdded ? 'Added to Dictionary' : 'Add to Dictionary'}
          </Text>
        </TouchableOpacity>
      )}
      
      
      {renderWordDetails()}
      {renderStructuredTranslations()}
      {renderLegacyTranslations()}
      {renderLegacyContext()}
      {renderHistoryButton()}
      {renderHistoryList()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    padding: 20,
  },
  wordButtonsContainer: {
    marginVertical: 16,
  },
  wordButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wordContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  translationText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  commentContainer: {
    marginVertical: 5,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
    minHeight: 40,
  },
  commentView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#ffebee',
    borderRadius: 4,
    padding: 8,
  },
  commentText: {
    flex: 1,
    color: '#666',
    fontSize: 14,
  },
  iconButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
    marginRight: 10,
  },
  definitionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
  originalWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  speakButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakButtonActive: {
    backgroundColor: '#e8e8e8',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  sectionContent: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 100,
    marginRight: 10,
  },
  prominentDetailValue: {
    fontSize: 16,
    color: '#000',
    flex: 1,
    lineHeight: 24,
    fontWeight: '500',
  },
  translationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  translationMainInfo: {
    flex: 1,
  },
  translationType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  translationDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  additionalInfoContainer: {
    marginBottom: 12,
  },
  additionalInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  examplesContainer: {
    marginTop: 8,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  wordDetailItem: {
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e9ecef',
  },
  wordDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wordDetailValue: {
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
  },
  wordDetailsHeaderContent: {
    flex: 1,
    flexDirection: 'column',
  },
  baseFormPreview: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  previewContainer: {
    marginTop: 4,
  },
  definitionPreview: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
    lineHeight: 18,
  },
  exampleItem: {
    marginBottom: 8,
  },
  exampleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  contextItem: {
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 10,
  },
  translationItem: {
    marginBottom: 10,
    paddingLeft: 0,
  },
  originalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    flex: 1,
  },
  translatedText: {
    fontSize: 14,
    color: '#666',
  },
  boldText: {
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#007AFF',    
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  historyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  historyContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noHistoryText: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  }
});

export default WordInfoContent;