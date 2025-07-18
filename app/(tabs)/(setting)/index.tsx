// Enhanced app/(tabs)/(setting)/index.tsx with database save functionality
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, FlatList, Alert, ActivityIndicator, Modal } from 'react-native';
import { useLanguage } from '@/app/languageSelector';
import { Book, Database } from '@/components/db/database';
import { AlertTriangle, Book as BookIcon, Globe, Bell, Moon, Save, Trash2, Upload, FileText, X, Download, Eye, EyeOff } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { BookDatabase } from '@/components/db/bookDatabase';
import { logger, LogEntry } from '../../../utils/logger';
import * as Sharing from 'expo-sharing';

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
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  
  const database = new Database();
  
  useEffect(() => {
    loadBooks();
    loadLogs();
  }, [sourceLanguage]);
  
  const loadLogs = async () => {
    try {
      const allLogs = await logger.getAllLogs();
      setLogs(allLogs);
    } catch (error) {
      logger.error('SETTINGS', 'Error loading logs', { error: error instanceof Error ? error.message : String(error) });
    }
  };
  
  const clearLogs = async () => {
    try {
      await logger.clearLogs();
      setLogs([]);
      Alert.alert('Success', 'All logs have been cleared.');
    } catch (error) {
      logger.error('SETTINGS', 'Error clearing logs', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'Failed to clear logs.');
    }
  };
  
  const exportLogs = async () => {
    try {
      const logsText = logs.map(log => 
        `[${new Date(log.timestamp).toLocaleString()}] ${log.category}: ${log.message}${log.data ? ' - ' + JSON.stringify(log.data) : ''}`
      ).join('\n');
      
      const fileName = `app_logs_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, logsText);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', `Logs exported to: ${fileUri}`);
      }
    } catch (error) {
      logger.error('SETTINGS', 'Error exporting logs', { error: error instanceof Error ? error.message : String(error) });
      Alert.alert('Error', 'Failed to export logs.');
    }
  };
  
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'CARD_SWIPE':
        return { color: '#10b981' };
      case 'LEVEL_CHANGE':
        return { color: '#3b82f6' };
      case 'CONTEXT_SELECTION':
        return { color: '#8b5cf6' };
      case 'CARD_GENERATION':
        return { color: '#f59e0b' };
      case 'ERROR':
        return { color: '#ef4444' };
      default:
        return { color: '#6b7280' };
    }
  };
  
  const loadBooks = async () => {
    setIsLoading(true);
    try {
      await database.initialize();
      const allBooks = await database.getAllBooks(sourceLanguage.toLowerCase());
      setBooks(allBooks);
    } catch (error) {
      logger.error('SETTINGS', 'Error loading books', { error: error instanceof Error ? error.message : String(error) });
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
        logger.info('SETTINGS', 'Deleting database file', { dbPath });
        
        try {
          if ((await FileSystem.getInfoAsync(dbPath)).exists) {
            await FileSystem.deleteAsync(dbPath, { idempotent: true });
            logger.info('SETTINGS', 'Successfully deleted database file', { dbPath });
          }
        } catch (fileError) {
          logger.error('SETTINGS', 'Error deleting database file', { error: fileError instanceof Error ? fileError.message : String(fileError), dbPath });
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
        logger.error('SETTINGS', 'Error deleting book file', { error: fileError instanceof Error ? fileError.message : String(fileError) });
      }
      
      try {
        if (selectedBook.imageUrl && typeof selectedBook.imageUrl === 'string' && 
            FileSystem.documentDirectory && 
            selectedBook.imageUrl.startsWith(FileSystem.documentDirectory)) {
          await FileSystem.deleteAsync(selectedBook.imageUrl, { idempotent: true });
        }
      } catch (imageError) {
        logger.error('SETTINGS', 'Error deleting cover image', { error: imageError instanceof Error ? imageError.message : String(imageError) });
      }
      
      // 5. Refresh book list
      await loadBooks();
      
      Alert.alert('Success', `"${selectedBook.name}" has been deleted.`);
    } catch (error) {
      logger.error('SETTINGS', 'Error deleting book', { error: error instanceof Error ? error.message : String(error), bookName: selectedBook.name });
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
      const serverUrl = 'http://192.168.1.41:3000'

      
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
      logger.error('SETTINGS', 'Error saving book to server', { error: error instanceof Error ? error.message : String(error), bookName: book.name });
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

        {/* Application Logs */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={24} color="#4b5563" />
            <Text style={styles.cardTitle}>Application Logs</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.logsSummary}>
              <Text style={styles.logsCount}>Total Logs: {logs.length}</Text>
              <Text style={styles.logsLastUpdate}>
                Last Updated: {logs.length > 0 ? new Date(logs[0].timestamp).toLocaleString() : 'Never'}
              </Text>
            </View>
            
            <View style={styles.logsActions}>
              <TouchableOpacity 
                style={styles.logsButton}
                onPress={() => setShowLogModal(true)}
              >
                <Eye size={16} color="#2563eb" />
                <Text style={styles.logsButtonText}>View Logs</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logsButton}
                onPress={exportLogs}
              >
                <Download size={16} color="#2563eb" />
                <Text style={styles.logsButtonText}>Export</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.logsButton, styles.logsButtonDanger]}
                onPress={clearLogs}
              >
                <Trash2 size={16} color="#ef4444" />
                <Text style={[styles.logsButtonText, styles.logsButtonTextDanger]}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            {showLogs && (
              <View style={styles.logsContainer}>
                <ScrollView style={styles.logsScrollView} nestedScrollEnabled>
                  {logs.slice(0, 50).map((log, index) => (
                    <View key={index} style={styles.logEntry}>
                      <Text style={styles.logTimestamp}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Text>
                      <Text style={[styles.logCategory, getCategoryStyle(log.category)]}>
                        {log.category}
                      </Text>
                      <Text style={styles.logMessage}>{log.message}</Text>
                      {log.data && (
                        <Text style={styles.logData}>{JSON.stringify(log.data)}</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity 
                  style={styles.toggleLogsButton}
                  onPress={() => setShowLogs(false)}
                >
                  <EyeOff size={16} color="#6b7280" />
                  <Text style={styles.toggleLogsText}>Hide Logs</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {!showLogs && (
              <TouchableOpacity 
                style={styles.toggleLogsButton}
                onPress={() => setShowLogs(true)}
              >
                <Eye size={16} color="#6b7280" />
                <Text style={styles.toggleLogsText}>Show Recent Logs</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      
      {/* Full Screen Log Modal */}
      <Modal
        visible={showLogModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Application Logs</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowLogModal(false)}
            >
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {logs.map((log, index) => (
              <View key={index} style={styles.modalLogEntry}>
                <View style={styles.modalLogHeader}>
                  <Text style={styles.modalLogTimestamp}>
                    {new Date(log.timestamp).toLocaleString()}
                  </Text>
                  <Text style={[styles.modalLogCategory, getCategoryStyle(log.category)]}>
                    {log.category}
                  </Text>
                </View>
                <Text style={styles.modalLogMessage}>{log.message}</Text>
                {log.data && (
                  <Text style={styles.modalLogData}>{JSON.stringify(log.data, null, 2)}</Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  },
  logsSummary: {
    marginBottom: 16,
  },
  logsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  logsLastUpdate: {
    fontSize: 14,
    color: '#6b7280',
  },
  logsActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  logsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    gap: 4,
  },
  logsButtonDanger: {
    backgroundColor: '#fef2f2',
  },
  logsButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  logsButtonTextDanger: {
    color: '#ef4444',
  },
  logsContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  logsScrollView: {
    maxHeight: 250,
  },
  logEntry: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  logCategory: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  logData: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  toggleLogsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 8,
    gap: 4,
  },
  toggleLogsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalLogEntry: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalLogTimestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  modalLogCategory: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  modalLogMessage: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  modalLogData: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 4,
  }
});