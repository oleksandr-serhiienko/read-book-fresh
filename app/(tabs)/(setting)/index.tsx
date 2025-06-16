// Enhanced app/(tabs)/(setting)/index.tsx with database save functionality
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useLanguage } from '@/app/languageSelector';
import { Book, Database } from '@/components/db/database';
import { AlertTriangle, Book as BookIcon, Globe, Bell, Moon, Save, Trash2, Upload } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { BookDatabase } from '@/components/db/bookDatabase';

export default function SettingsScreen() {
  const { sourceLanguage, targetLanguage, setSourceLanguage, setTargetLanguage } = useLanguage();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoDownload, setAutoDownload] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  
  const database = new Database();
  
  useEffect(() => {
    loadBooks();
  }, [sourceLanguage]);
  
  const loadBooks = async () => {
    setIsLoading(true);
    try {
      await database.initialize();
      const allBooks = await database.getAllBooks(sourceLanguage.toLowerCase());
      setBooks(allBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    // Instead of using clearAllTables, we'll just keep it as a placeholder
    setShowConfirmation(false);
  };
  
  const confirmDeleteBook = (book: Book) => {
    setSelectedBook(book);
    Alert.alert(
      'Delete Book',
      `Are you sure you want to delete "${book.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedBook(null) },
        { text: 'Delete', style: 'destructive', onPress: deleteSelectedBook }
      ]
    );
  };
  
  const deleteSelectedBook = async () => {
    if (!selectedBook) return;
    
    setIsLoading(true);
    try {
      // 1. First close any existing connection to the book database
      const bookDb = new BookDatabase(selectedBook.name);
      await bookDb.close();
      
      // 2. Delete book from database (your existing code)
      await database.deleteBook(selectedBook.name, sourceLanguage.toLowerCase(), false);
      
      // 3. Remove the actual book database file
      if (selectedBook.bookUrl && selectedBook.bookUrl.endsWith('.db')) {
        // The main database file in SQLite directory
        const dbPath = `${FileSystem.documentDirectory}SQLite/${selectedBook.name}.db`;
        console.log(`Deleting database file: ${dbPath}`);
        
        try {
          if ((await FileSystem.getInfoAsync(dbPath)).exists) {
            await FileSystem.deleteAsync(dbPath, { idempotent: true });
            console.log(`Successfully deleted database file: ${dbPath}`);
          }
        } catch (fileError) {
          console.error('Error deleting database file:', fileError);
        }
      }
      
      // 4. Delete book file and image (your existing code for these)
      try {
        if (selectedBook.bookUrl && typeof selectedBook.bookUrl === 'string' && 
            FileSystem.documentDirectory && 
            selectedBook.bookUrl.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(selectedBook.bookUrl, { idempotent: true });
        }
      } catch (fileError) {
        console.error('Error deleting book file:', fileError);
      }
      
      try {
        if (selectedBook.imageUrl && typeof selectedBook.imageUrl === 'string' && 
            FileSystem.documentDirectory && 
            selectedBook.imageUrl.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(selectedBook.imageUrl, { idempotent: true });
        }
      } catch (imageError) {
        console.error('Error deleting cover image:', imageError);
      }
      
      // 5. Refresh book list
      await loadBooks();
      
      Alert.alert('Success', `"${selectedBook.name}" has been deleted.`);
    } catch (error) {
      console.error('Error deleting book:', error);
      Alert.alert('Error', 'Failed to delete the book. Please try again.');
    } finally {
      setSelectedBook(null);
      setIsLoading(false);
    }
  };

  const saveBookToServer = async (book: Book) => {
    if (!book.bookUrl || !book.bookUrl.endsWith('.db')) {
      Alert.alert('Error', 'Only database books can be saved back to the server.');
      return;
    }
    
    setIsSaving(book.name);
    try {
      // 1. Open the book database
      const bookDb = new BookDatabase(book.name);
      await bookDb.initialize();
      
      // 2. Get all sentences from the database
      const sentences = await bookDb.getSentences();
      
      // 3. Extract the bookname filename (without path)
      const dbFilename = book.bookUrl.split('/').pop();
      
      if (!dbFilename) {
        throw new Error('Could not extract filename from book URL');
      }
      
      // 4. Construct the server URL
      const serverUrl = book.bookUrl.includes('192.168.1.41:3000') 
        ? 'http://192.168.1.41:3000'  // Use the same server as the book URL
        : 'http://192.168.1.41:3000'; // Fallback server URL
      
      // 5. Send the sentences to the server
      const response = await fetch(`${serverUrl}/sync-book/${sourceLanguage.toLowerCase()}/${dbFilename}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sentences }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save the book to the server');
      }
      
      Alert.alert('Success', `Book "${book.name}" has been saved to the server.`);
    } catch (error) {
      console.error('Error saving book to server:', error);
      Alert.alert('Error', `Failed to save the book to the server: ${error}`);
    } finally {
      setIsSaving(null);
    }
  };

  const renderBookItem = ({ item }: { item: Book }) => (
    <View style={styles.bookItem}>
      <Text style={styles.bookTitle} numberOfLines={1} ellipsizeMode="tail">
        {item.name}
      </Text>
      <View style={styles.bookActions}>
        {/* Save button (only for .db books) */}
        {item.bookUrl && item.bookUrl.endsWith('.db') && (
          <TouchableOpacity 
            style={[styles.bookButton, styles.saveBookButton]}
            onPress={() => saveBookToServer(item)}
            disabled={isSaving === item.name}
          >
            {isSaving === item.name ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Upload size={18} color="#2563eb" />
            )}
          </TouchableOpacity>
        )}
        
        {/* Delete button */}
        <TouchableOpacity 
          style={[styles.bookButton, styles.deleteBookButton]}
          onPress={() => confirmDeleteBook(item)}
        >
          <Trash2 size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        {/* Language Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Globe size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Language Settings</Text>
          </View>
          
          <View style={styles.cardContent}>
            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>Source Language</Text>
              <Text style={styles.settingValue}>{sourceLanguage}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingRow}>
              <Text style={styles.settingLabel}>Target Language</Text>
              <Text style={styles.settingValue}>{targetLanguage}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reading Settings */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <BookIcon size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Reading Settings</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Auto-download Books</Text>
              <Switch
                value={autoDownload}
                onValueChange={setAutoDownload}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={autoDownload ? '#2563eb' : '#9ca3af'}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={darkMode ? '#2563eb' : '#9ca3af'}
              />
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Bell size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Notifications</Text>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Daily Reminders</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={notifications ? '#2563eb' : '#9ca3af'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Save size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Data Management</Text>
          </View>
          
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionSubtitle}>Book Management</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color="#2563eb" style={styles.loader} />
            ) : books.length > 0 ? (
              <FlatList
                data={books}
                renderItem={renderBookItem}
                keyExtractor={(item) => `${item.name}-${item.sourceLanguage}`}
                scrollEnabled={false}
                style={styles.bookList}
              />
            ) : (
              <Text style={styles.emptyMessage}>No books available</Text>
            )}
          </View>
          
          <View style={styles.divider} />
          
          {!showConfirmation ? (
            <TouchableOpacity 
              onPress={() => setShowConfirmation(true)}
              style={styles.deleteButton}
            >
              <View style={styles.deleteButtonContent}>
                <Trash2 size={20} color="#ef4444" />
                <Text style={styles.deleteButtonText}>Clear All Data</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHeader}>
                <AlertTriangle size={20} color="#ef4444" />
                <Text style={styles.confirmationTitle}>Confirm Deletion</Text>
              </View>
              <Text style={styles.confirmationText}>
                This will permanently delete all your books, cards, and progress. This action cannot be undone.
              </Text>
              <View style={styles.confirmationButtons}>
                <TouchableOpacity 
                  onPress={() => setShowConfirmation(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleClearData}
                  style={styles.confirmDeleteButton}
                >
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  cardContent: {
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#4b5563',
  },
  settingValue: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  deleteButton: {
    paddingVertical: 8,
  },
  deleteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#ef4444',
    marginLeft: 8,
    fontSize: 16,
  },
  confirmationCard: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmationTitle: {
    color: '#ef4444',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  confirmationText: {
    color: '#ef4444',
    marginBottom: 16,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#374151',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  confirmDeleteButtonText: {
    color: 'white',
  },
  bookList: {
    width: '100%',
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  bookTitle: {
    fontSize: 16,
    color: '#4b5563',
    flex: 1,
    marginRight: 8,
  },
  bookActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bookButton: {
    padding: 8,
    borderRadius: 8,
  },
  saveBookButton: {
    backgroundColor: '#EBF5FF',
  },
  deleteBookButton: {
    backgroundColor: '#fef2f2',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#6b7280',
    paddingVertical: 16,
  },
  loader: {
    marginVertical: 16,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  }
});