// Migrated BookDatabase.ts for Expo SQLite 15.x
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Translation, Word } from './database';
import { logger, LogCategories } from '@/utils/logger';

export interface DBSentence {
  id: number;
  sentence_number: number;
  chapter_id: number;
  original_text: string;
  original_parsed_text: string | null;
  translation_parsed_text: string | null;
  created_at: string;
}

export interface WordTranslationWithContext {
  translations: string[];
  contexts: TranslationContext[];
  info?: string;
}

export interface TranslationContext {
  original_text: string;
  translated_text: string;
}

export class BookDatabase {
  private dbName: string;
  private bookTitle: string;
  private dbPath: string;
  private isConnecting: boolean = false;
  
  constructor(bookTitle: string) {
    this.bookTitle = bookTitle;
    this.dbName = `${bookTitle}.db`;
    // Store directly in the SQLite directory
    this.dbPath = `${FileSystem.documentDirectory}SQLite/${this.dbName}`;
  }

  private async ensureColumnExistsWithConnection(db: SQLite.SQLiteDatabase, table: string, column: string, type: string): Promise<void> {
    try {
      const tableInfo = await db.getAllAsync(`PRAGMA table_info(${table})`);
      const hasColumn = tableInfo.some((col: any) => col.name === column);
      
      if (!hasColumn) {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        logger.debug(LogCategories.DATABASE, 'Added column to table', { column, table, bookTitle: this.bookTitle });
      }
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error checking/adding column', { 
        error: error instanceof Error ? error.message : String(error),
        column,
        table,
        bookTitle: this.bookTitle
      });
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    // If we're already connecting, wait for that to finish
    if (this.isConnecting) {
      let attempts = 0;
      while (this.isConnecting && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return true;
    }

    this.isConnecting = true;

    try {
      // Ensure SQLite directory exists
      const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
      const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
      }

      // Check if database exists
      const dbInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (!dbInfo.exists) {
        logger.info(LogCategories.DATABASE, 'Database file does not exist yet', { dbPath: this.dbPath, bookTitle: this.bookTitle });
        this.isConnecting = false;
        return false;
      }

      // Test database accessibility
      logger.debug(LogCategories.DATABASE, 'Testing database accessibility', { bookTitle: this.bookTitle });
      await this.withDatabaseConnection(async (db) => {
        await db.getFirstAsync('SELECT 1');
      });
      
      logger.debug(LogCategories.DATABASE, 'Database is accessible', { bookTitle: this.bookTitle });
      this.isConnecting = false;
      return true;
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error initializing book database', { 
        error: error instanceof Error ? error.message : String(error),
        bookTitle: this.bookTitle,
        dbPath: this.dbPath
      });
      this.isConnecting = false;
      throw error;
    }
  }

  public getDbName(): string {
    return this.bookTitle;
  }

  async downloadDatabase(bookUrl: string): Promise<void> {
    const dbUrl = bookUrl.replace('/books/', '/download-db/');
    try {
      
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (fileInfo.exists) {
        logger.info(LogCategories.DATABASE, 'Database already exists locally', { bookTitle: this.bookTitle });
        return;
      }

      // Validate URL
      if (!dbUrl.startsWith('http')) {
        throw new Error(`Invalid database URL: ${dbUrl}`);
      }

      logger.info(LogCategories.DATABASE, 'Starting database download', { bookTitle: this.bookTitle, dbUrl, dbPath: this.dbPath });

      // Download directly to the SQLite directory
      const downloadResumable = FileSystem.createDownloadResumable(
        dbUrl,
        this.dbPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          if (progress % 0.1 < 0.05) { // Log every 10%
            logger.debug(LogCategories.DATABASE, 'Database download progress', { bookTitle: this.bookTitle, progress: Math.round(progress * 100) });
          }
        }
      );

      await downloadResumable.downloadAsync();
      logger.info(LogCategories.DATABASE, 'Database downloaded successfully', { bookTitle: this.bookTitle });
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Database download error', { 
        error: error instanceof Error ? error.message : String(error),
        bookTitle: this.bookTitle,
        dbUrl
      });
      throw new Error(`Failed to download database: ${error}`);
    }
  }

  // CRITICAL: New connection management pattern for Expo SQLite 15.x
  private async withDatabaseConnection<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    let db: SQLite.SQLiteDatabase | null = null;
    try {
      // CRITICAL: Use useNewConnection to prevent NullPointerException on Android
      db = await SQLite.openDatabaseAsync(this.dbName, { 
        useNewConnection: true 
      });
      
      return await operation(db);
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Database operation failed', { 
        error: error instanceof Error ? error.message : String(error),
        bookTitle: this.bookTitle
      });
      throw error;
    } finally {
      // CRITICAL: Always close connection to prevent resource leaks
      if (db) {
        try {
          await db.closeAsync();
        } catch (closeError) {
          logger.warn(LogCategories.DATABASE, 'Error closing database connection', { 
            error: closeError instanceof Error ? closeError.message : String(closeError),
            bookTitle: this.bookTitle
          });
        }
      }
    }
  }

  // Enhanced retry mechanism with proper connection management
  private async withRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.warn(LogCategories.DATABASE, 'Database operation failed, retrying', { 
        error: error instanceof Error ? error.message : String(error),
        bookTitle: this.bookTitle,
        retriesLeft: retries
      });
      
      if (retries > 0) {
        logger.debug(LogCategories.DATABASE, 'Attempting to retry operation', { bookTitle: this.bookTitle, retries });
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.withRetry(operation, retries - 1);
      }
      
      throw error;
    }
  }

  async rewriteSentence(id: number, originalNew: string, translationNew: string): Promise<boolean> {
    return this.withRetry(async () => {
      return await this.withDatabaseConnection(async (db) => {
        // Ensure updated_at column exists
        await this.ensureColumnExistsWithConnection(db, 'book_sentences', 'updated_at', 'DATETIME NULL');
        
        const now = new Date().toISOString();
        const chapterQuery = `
          UPDATE book_sentences 
          SET original_parsed_text = ?, 
              translation_parsed_text = ?,
              updated_at = ?
          WHERE id = ? 
        `;
        
        await db.runAsync(chapterQuery, [originalNew, translationNew, now, id]);
        return true;
      });
    });
  }

  async getSentences(): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      return await this.withDatabaseConnection(async (db) => {
        // Skip routine query logging

        const query = `SELECT id as id, sentence_number, chapter_id, original_text, original_parsed_text, translation_parsed_text 
        FROM book_sentences 
        ORDER BY sentence_number`;
        
        return await db.getAllAsync<DBSentence>(query);
      });
    });
  }

  async getChapterSentences(chapterNumber: number): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      return await this.withDatabaseConnection(async (db) => {
        // Skip routine query logging

        const query = `SELECT 
                    id as id,
                    sentence_number,
                    chapter_id,
                    original_text,
                    original_parsed_text,
                    translation_parsed_text
                    FROM book_sentences 
                    WHERE chapter_id = ? 
                    ORDER BY sentence_number`;
        
        return await db.getAllAsync<DBSentence>(query, [chapterNumber]);
      });
    });
  }

  async getChapterSentencesBySnd(sentenceNumber: number): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      return await this.withDatabaseConnection(async (db) => {
        const query = `SELECT 
                    id as id,
                    sentence_number,
                    chapter_id,
                    original_text,
                    original_parsed_text,
                    translation_parsed_text
                    FROM book_sentences 
                    WHERE sentence_number = ? 
                    ORDER BY sentence_number`;
        
        return await db.getAllAsync<DBSentence>(query, [sentenceNumber]);
      });
    });
  }

  async getChapterSentencesByID(sentenceNumber: number): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      return await this.withDatabaseConnection(async (db) => {
        const query = `SELECT 
                    id as id,
                    sentence_number,
                    chapter_id,
                    original_text,
                    original_parsed_text,
                    translation_parsed_text
                    FROM book_sentences 
                    WHERE id = ? 
                    ORDER BY sentence_number`;
        
        return await db.getAllAsync<DBSentence>(query, [sentenceNumber]);
      });
    });
  }

  async getTotalChapters(): Promise<number> {
    return this.withRetry(async () => {
      return await this.withDatabaseConnection(async (db) => {
        const result = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(DISTINCT chapter_id) as count FROM book_sentences'
        );
        
        return result?.count ?? 0;
      });
    });
  }

  async getChapterSentenceCount(chapterNumber: number): Promise<number> {
    return this.withRetry(async () => {
      return await this.withDatabaseConnection(async (db) => {
        // Skip routine query logging
        
        const result = await db.getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM book_sentences WHERE chapter_id = ?',
          [chapterNumber]
        );
        
        return result?.count ?? 0;
      });
    });
  }

  async getWordTranslation(word: string): Promise<Word | null> {
    return this.withRetry(async () => {
      return await this.getWordTranslationFromDb(word);
    });
  }


  private async getWordTranslationFromDb(word: string): Promise<Word | null> {
    try {
      return await this.withDatabaseConnection(async (db) => {
        // Try exact word match first
        let wordRecord = await db.getFirstAsync<{ 
          word: string,
          base_form: string,
          wordInfo: string
        }>(
          'SELECT word, base_form, wordInfo FROM words WHERE word = ?',
          [word.toLowerCase()]
        );
        
        // If not found, try base_form match
        if (!wordRecord) {
          wordRecord = await db.getFirstAsync<{ 
            word: string,
            base_form: string,
            wordInfo: string
          }>(
            'SELECT word, base_form, wordInfo FROM words WHERE base_form = ?',
            [word.toLowerCase()]
          );
        }
        
        if (!wordRecord) {
          return null;
        }
        
        // Parse the JSON wordInfo
        const parsedWordInfo = this.safeParseJson(wordRecord.wordInfo);
        
        return {
          name: wordRecord.word,
          word_info: {
            base_form: parsedWordInfo.word_info?.base_form || {},
            definition: parsedWordInfo.word_info?.definition || '',
            additional_info: parsedWordInfo.word_info?.additional_info || ''
          },
          translations: parsedWordInfo.translations || []
        };
      });
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error getting word translation from DB', { 
        error: error instanceof Error ? error.message : String(error),
        word,
        bookTitle: this.bookTitle
      });
      return null;
    }
  }


  private safeParseJson(jsonStr: string | null | undefined): any {
    if (!jsonStr) return {};
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error parsing JSON', { 
        error: error instanceof Error ? error.message : String(error),
        jsonStr,
        bookTitle: this.bookTitle
      });
      return {};
    }
  }

  async close(): Promise<void> {
    // In the new pattern, connections are managed per operation
    // No persistent connection to close
    logger.debug(LogCategories.DATABASE, 'Database connections are managed per operation', { bookTitle: this.bookTitle });
  }
}