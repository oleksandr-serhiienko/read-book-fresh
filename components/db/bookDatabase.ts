// Enhanced BookDatabase.ts with improved connection handling
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Translation, Word } from './database';

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
  private db: SQLite.SQLiteDatabase | null = null;
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

  async initialize(): Promise<boolean> {
    // If we're already connecting, wait for that to finish
    if (this.isConnecting) {
      let attempts = 0;
      while (this.isConnecting && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (this.db !== null) {
        return true;
      }
    }
    
    // If we already have a db instance, verify it's still valid by running a simple query
    if (this.db !== null) {
      try {
        // Test query to verify database is still valid
        await this.db.getFirstAsync('SELECT 1');
        console.log("Verified existing database connection is valid");
        return true;
      } catch (error) {
        console.warn("Database connection test failed, reopening:", error);
        this.db = null; // Clear the invalid connection
      }
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
        console.log("Database file does not exist yet " + this.dbPath);
        this.isConnecting = false;
        return false;
      }

      try {
        console.log("Attempting to open database...");
        
        // Close existing connection explicitly if it exists
        if (this.db) {
          try {
            //await this.db.closeAsync();
            this.db = null;
          } catch (closeError) {
            console.warn("Error closing previous connection:", closeError);
            // Continue with opening a new connection
          }
        }
        
        // Open fresh connection
        this.db = await SQLite.openDatabaseAsync(this.dbName);
        console.log("Database opened successfully");
        
        // Verify database is properly setup by running a simple query
        await this.db.getFirstAsync('SELECT 1');
        
        this.isConnecting = false;
        return true;
      } catch (dbError) {
        console.error("Database open error:", dbError);
        this.isConnecting = false;
        return false;
      }
    } catch (error) {
      console.error("Error initializing book database:", error);
      this.isConnecting = false;
      throw error;
    }
  }

  public getDbName(): string {
    return this.bookTitle;
  }

  async downloadDatabase(bookUrl: string): Promise<void> {
    try {
      const dbUrl = bookUrl.replace('/books/', '/download-db/');
      
      // Check if file already exists
      const fileInfo = await FileSystem.getInfoAsync(this.dbPath);
      if (fileInfo.exists) {
        console.log("Database already exists locally");
        return;
      }

      // Validate URL
      if (!dbUrl.startsWith('http')) {
        throw new Error(`Invalid database URL: ${dbUrl}`);
      }

      console.log(`Starting database download from: ${dbUrl}`);
      console.log(`Saving directly to SQLite directory: ${this.dbPath}`);

      // Download directly to the SQLite directory
      const downloadResumable = FileSystem.createDownloadResumable(
        dbUrl,
        this.dbPath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${(progress * 100).toFixed(2)}%`);
        }
      );

      await downloadResumable.downloadAsync();
      console.log(`Database downloaded successfully to SQLite directory.`);
    } catch (error) {
      console.error("Download error:", error);
      throw new Error(`Failed to download database: ${error}`);
    }
  }
  
  // Added retry mechanism for database operations
  private async withRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Database operation failed: ${error}`);
      
      if (retries > 0) {
        // Try to reinitialize the connection
        console.log(`Attempting to reconnect (${retries} retries left)...`);
        await this.initialize();
        
        // Retry the operation
        return this.withRetry(operation, retries - 1);
      }
      
      throw error;
    }
  }

  async rewriteSentence(id: number, originalNew: string, translationNew: string): Promise<boolean> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database is not initialized');
      }
      
      let chapterQuery = `
        UPDATE book_sentences 
        SET original_parsed_text = ?, 
            translation_parsed_text = ?
        WHERE id = ? 
      `;
      if (this.dbName.toLowerCase().includes("gemini"))
        {
          chapterQuery = `
            UPDATE book_sentences 
            SET original_parsed_text = ?, 
                translation_parsed_text = ?
            WHERE sentence_id = ? 
          `;

        }
      
      await this.db.runAsync(chapterQuery, [originalNew, translationNew, id]);
      return true;
    });
  }

  async getSentences(): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      console.log("Getting sentences");

      let query =  `SELECT id as id, sentence_number, chapter_id, original_text, original_parsed_text, translation_parsed_text 
      FROM book_sentences 
      ORDER BY sentence_number`
      if (this.dbName.toLowerCase().includes("gemini"))
        {
          query =  `SELECT sentence_id as id, sentence_number, chapter_id, original_text, original_parsed_text, translation_parsed_text 
          FROM book_sentences 
          ORDER BY sentence_number`;

        }
      
      return await this.db.getAllAsync<DBSentence>(query);
    });
  }

  async getChapterSentences(chapterNumber: number): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized');
        }
      }
      
      console.log("Getting chapter sentences for chapter:", chapterNumber);
      console.log("Book:", this.getDbName());

      let query = `SELECT 
                    id as id,
                    sentence_number,
                    chapter_id,
                    original_text,
                    original_parsed_text,
                    translation_parsed_text
                  FROM book_sentences 
                  WHERE chapter_id = ? 
                  ORDER BY sentence_number`;

        if (this.dbName.toLowerCase().includes("gemini"))
          {
            query =  `SELECT 
                      sentence_id as id,
                      sentence_number,
                      chapter_id,
                      original_text,
                      original_parsed_text,
                      translation_parsed_text
                      FROM book_sentences 
                      WHERE chapter_id = ? 
                      ORDER BY sentence_number`;
  
          }
      
      return await this.db.getAllAsync<DBSentence>(
        query,
        [chapterNumber]
      );
    });
  }

  async getChapterSentencesBySnd(sentenceNumber: number): Promise<DBSentence[]> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      

      let query = `SELECT 
                    id as id,
                    sentence_number,
                    chapter_id,
                    original_text,
                    original_parsed_text,
                    translation_parsed_text
                  FROM book_sentences 
                  WHERE sentence_number = ? 
                  ORDER BY sentence_number`
      if (this.dbName.toLowerCase().includes("gemini"))
        {
          query =  `SELECT 
                    sentence_id as id,
                    sentence_number,
                    chapter_id,
                    original_text,
                    original_parsed_text,
                    translation_parsed_text
                    FROM book_sentences 
                    WHERE chapter_id = ? 
                    ORDER BY sentence_number`;

        }
      return await this.db.getAllAsync<DBSentence>(
        query,
        [sentenceNumber]
      );
    });
  }

  async getTotalChapters(): Promise<number> {
    return this.withRetry(async () => {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized after retry');
        }
      }
      
      const result = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(DISTINCT chapter_id) as count FROM book_sentences'
      );
      
      return result?.count ?? 0;
    });
  }

  async getChapterSentenceCount(chapterNumber: number): Promise<number> {
    return this.withRetry(async () => {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized after retry');
        }
      }
      
      console.log("Getting sentence count for chapter:", chapterNumber);
      
      const result = await this.db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM book_sentences WHERE chapter_id = ?',
        [chapterNumber]
      );
      
      return result?.count ?? 0;
    });
  }


  async getWordTranslation(word: string): Promise<Word | null> {
    return this.withRetry(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      if (this.dbName.toLowerCase().includes('gemini')) {
        return await this.getWordTranslationFromGeminiDb(word);
      }
      return await this.getWordTranslationOriginal(word);
    });
  }

  // Original schema implementation
  private async getWordTranslationOriginal(word: string): Promise<Word | null> {
    try {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized after retry');
        }
      }
      // Get the word ID and translations
      const wordQuery = await this.db.getFirstAsync<{ id: number, translations: string }>(
        'SELECT id, translations FROM word_translations WHERE word = ?',
        [word]
      );
      
      if (!wordQuery) {
        return null;
      }
      
      // Split translations string into array
      const translationsArr = wordQuery.translations
        .split(',')
        .map(t => t.trim());
      
      // Get contexts for the word
      const contexts = await this.db.getAllAsync<TranslationContext>(
        `SELECT original_text, translated_text 
         FROM word_contexts 
         WHERE word_id = ?`,
        [wordQuery.id]
      );
      
      // Get additional word info if available
      const wordInfo = await this.db.getFirstAsync<{ info: string }>(
        'SELECT info FROM word_info WHERE word_id = ?',
        [wordQuery.id]
      );
      
      // Convert to Word model
      const result: Word = {
        id: wordQuery.id,
        name: word,
        translations: []
      };
      
      // Add each translation as a separate Translation object
      result.translations = translationsArr.map(meaning => {
        const translation: Translation = {
          meaning: meaning,
          examples: []
        };
        
        // Add examples if available
        if (contexts && contexts.length > 0) {
          translation.examples = contexts.map(ctx => ({
            sentence: ctx.original_text,
            translation: ctx.translated_text
          }));
        }
        
        return translation;
      });
      
      // Add additional info if available
      if (wordInfo && wordInfo.info) {
        result.additionalInfo = wordInfo.info;
      }
      
      return result;
    } catch (error) {
      console.error('Error getting word translation from original schema:', error);
      return null;
    }
  }

  private async getWordTranslationFromGeminiDb(word: string): Promise<Word | null> {
    try {
      if (!this.db) {
        await this.initialize();
        if (!this.db) {
          throw new Error('Database not initialized after retry');
        }
      }
      // Get the word record
      const wordRecord = await this.db.getFirstAsync<{ 
        word_id: number, 
        queried_word: string,
        base_form_json: string,
        primary_type: string,
        info_json: string
      }>(
        'SELECT word_id, queried_word, base_form_json, primary_type, info_json FROM words WHERE queried_word = ?',
        [word.toLowerCase()]
      );
      
      if (!wordRecord) {
        return null;
      }
      
      // Get all translations for this word
      const translations = await this.db.getAllAsync<{
        translation_id: number,
        meaning: string,
        additional_info: string,
        meta_type: string
      }>(
        'SELECT translation_id, meaning, additional_info, meta_type FROM word_translations WHERE word_id = ?',
        [wordRecord.word_id]
      );
      
      // Create base Word object
      const result: Word = {
        id: wordRecord.word_id,
        name: wordRecord.queried_word,
        baseForm: this.safeParseJson(wordRecord.base_form_json),
        additionalInfo: this.safeParseJson(wordRecord.info_json),
        translations: []
      };
      
      // If no translations found, return word with empty translations
      if (!translations || translations.length === 0) {
        return result;
      }
      
      // Process each translation
      result.translations = await Promise.all(translations.map(async (tr) => {
        // Create Translation object
        const translation: Translation = {
          type: tr.meta_type,
          meaning: tr.meaning,
          additionalInfo: tr.additional_info,
          examples: []
        };
        
        if (!this.db) {
          await this.initialize();
          if (!this.db) {
            throw new Error('Database not initialized after retry');
          }
        }

        // Get examples for this translation
        const examples = await this.db.getAllAsync<{
          source_text: string,
          target_text: string
        }>(
          'SELECT source_text, target_text FROM translation_examples WHERE translation_id = ?',
          [tr.translation_id]
        );
        
        // Add examples if available
        if (examples && examples.length > 0) {
          translation.examples = examples.map(ex => ({
            sentence: ex.source_text,
            translation: ex.target_text
          }));
        }
        
        return translation;
      }));
      
      return result;
    } catch (error) {
      console.error('Error getting word translation from Gemini DB:', error);
      return null;
    }
  }

  private safeParseJson(jsonStr: string | null | undefined): any {
    if (!jsonStr) return {};
    
    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return {};
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        console.log("Closing database connection");
        await this.db.closeAsync();
      } catch (error) {
        console.error("Error closing database:", error);
      } finally {
        this.db = null;
      }
    }
  }
}