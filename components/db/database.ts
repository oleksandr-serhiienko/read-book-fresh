import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { EmittedWord } from '@/app/(tabs)/(book)/components/events/slidePanelEvents';
import { BookDatabase } from './bookDatabase';
import { logger, LogCategories } from '@/utils/logger';

export interface Word {
  id?: number;
  name?: string;
  baseForm?: string;
  additionalInfo?: string;
  translations?: Translation[];
}

export interface Translation {
  type?: string;
  meaning?: string;
  additionalInfo?: string;
  examples?: Example[];
}

export interface Example {
  sentence?: string;
  translation?: string;
}

export interface Card {
  id?: number;
  lastRepeat: Date;
  level: number;
  userId: string;
  source: string;
  sourceLanguage: string;
  targetLanguage: string;
  comment: string;
  history?: Array<HistoryEntry>;
  word: string;
  wordInfo?: Word;
  info?: CardInfo;
}

interface LearningProgress {
  wordToMeaning: number;
  meaningToWord: number;
  context: number;
  contextLetters: number;
}

interface CardInfo {
  status: 'learning' | 'reviewing';
  learningProgress: LearningProgress;
  sentence: string;
}

export interface Book {
  id?: number;
  name: string;
  sourceLanguage: string;
  updateDate: Date;
  lastreadDate: Date;
  bookUrl: string;
  imageUrl?: string | null;
  currentLocation?: string | null;
  progress: number;
}

export interface HistoryEntry {
  id?: number;
  date: Date;
  success: boolean;
  cardId: number;
  exampleHash?: string;
  type: string | null;
}

export const cardHelpers = {
  getAllExamples: (card: Card): Example[] => {
    return card.wordInfo?.translations?.flatMap(t => t.examples || []) || [];
  },
  
  getAllMeanings: (card: Card): string[] => {
    return card.wordInfo?.translations
      ?.map(t => t.meaning)
      .filter((meaning): meaning is string => meaning !== undefined) || [];
  },
  
  getFirstExample: (card: Card): Example | null => {
    const examples = cardHelpers.getAllExamples(card);
    return examples[0] || null;
  },
  
  getFirstMeaning: (card: Card): string => {
    return card.wordInfo?.translations?.[0]?.meaning || '';
  },
  
  getAlternateMeanings: (card: Card): string[] => {
    return card.wordInfo?.translations
      ?.slice(1)
      .map(t => t.meaning)
      .filter((meaning): meaning is string => meaning !== undefined) || [];
  }
};

export class Database {
  private isInitialized: boolean = false;

  // CRITICAL: New connection management pattern for Expo SQLite 15.x
  private async withDatabaseConnection<T>(operation: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    let db: SQLite.SQLiteDatabase | null = null;
    try {
      // CRITICAL: Use useNewConnection to prevent NullPointerException on Android
      db = await SQLite.openDatabaseAsync('myAppDatabase.db', { 
        useNewConnection: true 
      });
      
      return await operation(db);
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Database operation failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      // CRITICAL: Always close connection to prevent resource leaks
      if (db) {
        try {
          await db.closeAsync();
        } catch (closeError) {
          logger.warn(LogCategories.DATABASE, 'Error closing database connection', { 
            error: closeError instanceof Error ? closeError.message : String(closeError)
          });
        }
      }
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info(LogCategories.DATABASE, 'Initializing main database');
      
      // Test database connection and create tables
      await this.withDatabaseConnection(async (db) => {
        await this.createTablesWithConnection(db);
      });
    
      
      this.isInitialized = true;
      logger.info(LogCategories.DATABASE, 'Main database initialized successfully');
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error initializing main database', { 
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async createTablesWithConnection(db: SQLite.SQLiteDatabase): Promise<void> {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT NOT NULL,
        wordInfo TEXT,
        lastRepeat DATETIME NOT NULL,
        level INTEGER NOT NULL,
        userId TEXT NOT NULL,
        source TEXT NOT NULL,
        comment TEXT NOT NULL,
        sourceLanguage TEXT NOT NULL,
        targetLanguage TEXT NOT NULL,
        info TEXT DEFAULT '{}'
      );
    
      CREATE TABLE IF NOT EXISTS contexts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sentence TEXT NOT NULL,
        translation TEXT NOT NULL,
        cardId INTEGER NOT NULL,
        isBad BOOL NOT NULL DEFAULT 0,
        FOREIGN KEY (cardId) REFERENCES cards(id)
      );

      CREATE TABLE IF NOT EXISTS histories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        success TEXT NOT NULL,
        cardId INTEGER NOT NULL,
        contextId INTEGER NULL,
        exampleHash TEXT NULL,
        type TEXT NULL,
        FOREIGN KEY (cardId) REFERENCES cards(id),
        FOREIGN KEY (contextId) REFERENCES contexts(id)
      );

      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sourceLanguage TEXT NOT NULL,
        updateDate TEXT NOT NULL,
        lastreadDate TEXT NOT NULL,
        bookUrl TEXT NOT NULL,
        imageUrl TEXT NULL,
        currentLocation TEXT NULL, 
        progress INTEGER DEFAULT 0
      );
    `);
    
    // Check for new columns and add them if they don't exist
    await this.ensureColumnExistsWithConnection(db, 'cards', 'wordInfo', 'TEXT');
    await this.ensureColumnExistsWithConnection(db, 'cards', 'info', "TEXT DEFAULT '{}'");
    await this.ensureColumnExistsWithConnection(db, 'histories', 'exampleHash', 'TEXT NULL');
  }

  async createTables(): Promise<void> {
    await this.withDatabaseConnection(async (db) => {
      await this.createTablesWithConnection(db);
    });
  }

  private async ensureColumnExistsWithConnection(db: SQLite.SQLiteDatabase, table: string, column: string, type: string): Promise<void> {
    try {
      const tableInfo = await db.getAllAsync(`PRAGMA table_info(${table})`);
      const hasColumn = tableInfo.some((col: any) => col.name === column);
      
      if (!hasColumn) {
        await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        logger.debug(LogCategories.DATABASE, 'Added column to table', { column, table });
      }
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error checking/adding column', { 
        error: error instanceof Error ? error.message : String(error),
        column,
        table
      });
      throw error;
    }
  }

  private async ensureColumnExists(table: string, column: string, type: string): Promise<void> {
    await this.withDatabaseConnection(async (db) => {
      await this.ensureColumnExistsWithConnection(db, table, column, type);
    });
  }

  // Synchronous version of hash creation for use in selection
  createExampleHashSync(source: string, target: string): string {
    // Simple hash function for synchronous use
    const content = `${source}||${target}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  async createExampleHash(source: string, target: string): Promise<string> {
    // Create a deterministic hash from source and target
    const content = `${source}||${target}`;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      content,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash.substring(0, 16); // Use first 16 chars for brevity
  }


  async WordDoesNotExist(name: string): Promise<boolean> {
    await this.initialize();
    
    return await this.withDatabaseConnection(async (db) => {
      const result = await db.getFirstAsync<{ name: string }>(
        'SELECT * FROM cards WHERE word = ?',
        [name]
      );

      return result === null;
    });
  }

  async insertCard(emittedWord: EmittedWord, sourceLanguage: string, targetLanguage: string): Promise<number> {
    await this.initialize();
    
    // Check if word already exists
    const wordExists = !(await this.WordDoesNotExist(emittedWord.word));
    if (wordExists) {
      // Skip routine operation logging
      return 0;
    }

    // Create BookDatabase instance for the emitted word's book
    const bookDatabase = new BookDatabase(emittedWord.bookTitle);
    let wordInfo: Word | undefined;
    
    try {
      // Try to initialize the book database and get word information
      const initialized = await bookDatabase.initialize();
      if (initialized) {
        const bookWordInfo = await bookDatabase.getWordTranslation(emittedWord.word.toLowerCase());
        if (bookWordInfo) {
          wordInfo = bookWordInfo;
        }
      }
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error accessing book database for word insertion', { 
        error: error instanceof Error ? error.message : String(error),
        bookTitle: emittedWord.bookTitle,
        word: emittedWord.word
      });
    }

    // If no word info found in book database, create minimal structure
    if (!wordInfo) {
      wordInfo = {
        name: emittedWord.word,
        baseForm: '',
        additionalInfo: '',
        translations: [{
          type: '',
          meaning: emittedWord.translation,
          additionalInfo: '',
          examples: []
        }]
      };
    }

    // Get the sentence context if sentenceId is provided
    let sentenceContext = '';
    if (emittedWord.sentenceId && bookDatabase) {
      try {
        const sentences = await bookDatabase.getSentences();
        const sentence = sentences.find(s => s.id === emittedWord.sentenceId);
        if (sentence) {
          sentenceContext = sentence.original_text || '';
        }
      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error getting sentence context', { 
          error: error instanceof Error ? error.message : String(error),
          sentenceId: emittedWord.sentenceId,
          bookTitle: emittedWord.bookTitle
        });
      }
    }

    // Create default CardInfo
    const defaultInfo: CardInfo = {
      status: 'learning',
      learningProgress: {
        wordToMeaning: 0,
        meaningToWord: 0,
        context: 0,
        contextLetters: 0
      },
      sentence: sentenceContext
    };

    const infoString = JSON.stringify(defaultInfo);
    const wordInfoString = JSON.stringify(wordInfo);

    return await this.withDatabaseConnection(async (db) => {
      const result = await db.runAsync(
        `INSERT INTO cards (word, wordInfo, lastRepeat, level, userId, source, sourceLanguage, targetLanguage, comment, info)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          emittedWord.word,
          wordInfoString,
          new Date().toISOString(),
          0, // level starts at 0
          'test', // userId - you might want to make this dynamic
          emittedWord.bookTitle,
          sourceLanguage,
          targetLanguage,
          '', // empty comment initially
          infoString
        ]
      );
  
      return result.lastInsertRowId;
    });
  }

  private async getCardByIdWithConnection(db: SQLite.SQLiteDatabase, id: number): Promise<Card | null> {
    try {
      const result = await db.getFirstAsync<any>(
        'SELECT * FROM cards WHERE id = ?',
        [id]
      );
      
      if (!result) return null;

      const card: Card = {
        id: result.id,
        word: result.word,
        wordInfo: result.wordInfo ? JSON.parse(result.wordInfo) : undefined,
        lastRepeat: new Date(result.lastRepeat),
        level: result.level,
        userId: result.userId,
        source: result.source,
        comment: result.comment,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        info: ensureCardInfo(JSON.parse(result.info || '{}'))
      };

      return card;
    } catch (error) {
      logger.error(LogCategories.DATABASE, 'Error getting card by id', { 
        error: error instanceof Error ? error.message : String(error),
        cardId: id
      });
      throw error;
    }
  }

  async getCardById(id: number): Promise<Card | null> {
    await this.initialize();
    
    return await this.withDatabaseConnection(async (db) => {
      return await this.getCardByIdWithConnection(db, id);
    });
  }

  async getCardByWord(word: string): Promise<Card | null> {
    await this.initialize();
    
    return await this.withDatabaseConnection(async (db) => {
      try {
        const result = await db.getFirstAsync<any>(
          'SELECT * FROM cards WHERE word = ?',
          [word]
        );
        
        if (!result) return null;

        const card: Card = {
          id: result.id,
          word: result.word,
          wordInfo: result.wordInfo ? JSON.parse(result.wordInfo) : undefined,
          lastRepeat: new Date(result.lastRepeat),
          level: result.level,
          userId: result.userId,
          source: result.source,
          comment: result.comment,
          sourceLanguage: result.sourceLanguage,
          targetLanguage: result.targetLanguage,
          info: ensureCardInfo(JSON.parse(result.info || '{}'))
        };

        return card;
      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error getting card by word', { 
          error: error instanceof Error ? error.message : String(error),
          word
        });
        throw error;
      }
    });
  }

  async updateCard(card: Card): Promise<void> {
    await this.initialize();
    
    await this.withDatabaseConnection(async (db) => {
      await db.runAsync(
        `UPDATE cards SET 
          word = ?, wordInfo = ?, lastRepeat = ?, level = ?, 
          userId = ?, source = ?, sourceLanguage = ?, targetLanguage = ?,
          comment = ?, info = ?
         WHERE id = ?`,
        [
          card.word || '',
          JSON.stringify(card.wordInfo || {}),
          card.lastRepeat.toISOString(),
          card.level,
          card.userId,
          card.source,
          card.sourceLanguage,
          card.targetLanguage,
          card.comment,
          JSON.stringify(card.info || {}),
          card.id ?? 0
        ]
      );
    });
  }

  async updateCardComment(card: Card): Promise<void> {
    await this.initialize();
    
    await this.withDatabaseConnection(async (db) => {
      await db.runAsync(
        `UPDATE cards SET comment = ? WHERE id = ?`,
        [card.comment, card.id ?? 0]
      );
    });
  }

  async updateHistory(history: HistoryEntry): Promise<void> {
    await this.initialize();

    await this.withDatabaseConnection(async (db) => {
      const result = await db.runAsync(
        `INSERT INTO histories (date, success, cardId, exampleHash, type)
         VALUES (?, ?, ?, ?, ?)`,
        [
          history.date.toISOString(),
          history.success,
          history.cardId,
          history.exampleHash || null,
          history.type || null
        ]
      );
      
      // Skip routine operation logging
    });
  }

  async getCardHistory(cardId: number): Promise<HistoryEntry[]> {
    await this.initialize();

    return await this.withDatabaseConnection(async (db) => {
      const history = await db.getAllAsync<any>(
        'SELECT * FROM histories WHERE cardId = ? ORDER BY date DESC',
        [cardId]
      );

      return history.map(entry => ({
        ...entry,
        date: new Date(entry.date),
        success: entry.success === "true" || entry.success === true || entry.success === 1 || entry.success === "1",
      }));
    });
  }

  async getNextExampleForCard(cardId: number): Promise<{ translation: Translation, example: Example, hash: string } | null> {
    await this.initialize();

    return await this.withDatabaseConnection(async (db) => {
      try {
        const card = await this.getCardByIdWithConnection(db, cardId);
        if (!card || !card.wordInfo || !card.wordInfo.translations) return null;

        // Get all examples with their hashes
        const allExamples: Array<{ translation: Translation, example: Example, hash: string }> = [];
        
        for (const translation of card.wordInfo.translations) {
          if (translation.examples) {
            for (const example of translation.examples) {
              const hash = await this.createExampleHash(example.sentence || '', example.translation || '');
              allExamples.push({ translation, example, hash });
            }
          }
        }

        if (allExamples.length === 0) return null;

        // Get history of example usage for this card
        const historyQuery = `
          SELECT exampleHash, MAX(date) as lastUsed
          FROM histories
          WHERE cardId = ? AND exampleHash IS NOT NULL
          GROUP BY exampleHash
          ORDER BY date ASC
        `;
        const exampleHistory = await db.getAllAsync<{ exampleHash: string, lastUsed: string }>(
          historyQuery, 
          [cardId]
        );

        // Find unused examples
        const usedHashes = exampleHistory.map(h => h.exampleHash);
        const unusedExamples = allExamples.filter(e => !usedHashes.includes(e.hash));

        if (unusedExamples.length > 0) {
          // Return a random unused example
          const randomIndex = Math.floor(Math.random() * unusedExamples.length);
          return unusedExamples[randomIndex];
        }

        // If all examples have been used, return the one used longest ago
        if (exampleHistory.length > 0) {
          const oldestHash = exampleHistory[0].exampleHash;
          return allExamples.find(e => e.hash === oldestHash) || allExamples[0];
        }

        // If no history exists, return the first example
        return allExamples[0];

      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error getting next example', { 
          error: error instanceof Error ? error.message : String(error),
          cardId
        });
        return null;
      }
    });
  }

  async deleteCard(id: number): Promise<void> {
    await this.initialize();

    await this.withDatabaseConnection(async (db) => {
      // Delete associated histories first
      await db.runAsync('DELETE FROM histories WHERE cardId = ?', [id]);
      
      // Delete the card
      await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
      
      // Skip routine operation logging
    });
  }

  async getCardToLearnBySource(source: string, sourceLanguage: string, targetLanguage: string): Promise<Card[]> {
    await this.initialize();
    
    if (source === 'All Cards') {
      return this.getAllCards(sourceLanguage, targetLanguage);
    }

    return await this.withDatabaseConnection(async (db) => {
      const cardsQuery = `
        SELECT * FROM cards
        WHERE sourceLanguage = ? AND targetLanguage = ? AND source = ?
        ORDER BY lastRepeat DESC
      `;
      
      const cards = await db.getAllAsync<any>(cardsQuery, [sourceLanguage, targetLanguage, source]);
      
      // Create the cards with their histories
      const cardPromises = cards.map(async (card: any) => {
        const history = await this.getCardHistory(card.id);
        
        return {
          id: card.id,
          word: card.word,
          wordInfo: card.wordInfo ? JSON.parse(card.wordInfo) : undefined,
          lastRepeat: new Date(card.lastRepeat),
          level: card.level,
          userId: card.userId,
          source: card.source,
          comment: card.comment,
          sourceLanguage: card.sourceLanguage,
          targetLanguage: card.targetLanguage,
          history: history,
          info: ensureCardInfo(JSON.parse(card.info || '{}'))
        };
      });
      
      return Promise.all(cardPromises);
    });
  }

  async getAllCards(sourceLanguage: string, targetLanguage: string): Promise<Card[]> {
    await this.initialize();
    
    return await this.withDatabaseConnection(async (db) => {
      const cardsQuery = `
        SELECT * FROM cards
        WHERE sourceLanguage = ? AND targetLanguage = ?
        ORDER BY lastRepeat DESC
      `;
      
      const cards = await db.getAllAsync<any>(cardsQuery, [sourceLanguage, targetLanguage]);
      
      // Create the cards with their histories
      const cardPromises = cards.map(async (card: any) => {
        const history = await this.getCardHistory(card.id);
        
        return {
          id: card.id,
          word: card.word,
          wordInfo: card.wordInfo ? JSON.parse(card.wordInfo) : undefined,
          lastRepeat: new Date(card.lastRepeat),
          level: card.level,
          userId: card.userId,
          source: card.source,
          comment: card.comment,
          sourceLanguage: card.sourceLanguage,
          targetLanguage: card.targetLanguage,
          history: history,
          info: ensureCardInfo(JSON.parse(card.info || '{}'))
        };
      });
      
      return Promise.all(cardPromises);
    });
  }

  // Book-related methods
  async insertBook(book: Book): Promise<number> {
    await this.initialize();
    
    const bookExist = await this.getBookByName(book.name, book.sourceLanguage);
    if (bookExist !== null) {
      return 0;
    }
    
    return await this.withDatabaseConnection(async (db) => {
      try {
        const result = await db.runAsync(
          `INSERT INTO books (name, sourceLanguage, updateDate, lastreadDate, bookUrl, imageUrl, currentLocation, progress)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            book.name,
            book.sourceLanguage,
            book.updateDate.toISOString(),
            book.lastreadDate.toISOString(),
            book.bookUrl,
            book.imageUrl || null,
            book.currentLocation || null,
            book.progress || 0
          ]
        );
        
        logger.info(LogCategories.DATABASE, 'Book inserted successfully', { bookName: book.name });
        return result.lastInsertRowId;
      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error inserting book', { 
          error: error instanceof Error ? error.message : String(error),
          bookName: book.name
        });
        throw error;
      }
    });
  }

  async getAllBooks(sourceLanguage: string): Promise<Book[]> {
    await this.initialize();
    
    return await this.withDatabaseConnection(async (db) => {
      try {
        const result = await db.getAllAsync<any>(
          `SELECT * FROM books WHERE sourceLanguage = ? ORDER BY lastreadDate DESC`,
          [sourceLanguage]
        );

        const books: Book[] = result.map((row: any) => ({
          id: row.id,
          name: row.name,
          sourceLanguage: row.sourceLanguage,
          updateDate: new Date(row.updateDate),
          lastreadDate: new Date(row.lastreadDate),
          bookUrl: row.bookUrl,
          imageUrl: row.imageUrl,
          currentLocation: row.currentLocation,
          progress: row.progress
        }));

        return books;
      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error fetching books for language', { 
          error: error instanceof Error ? error.message : String(error),
          sourceLanguage
        });
        throw error;
      }
    });
  }

  async getBookByName(name: string, sourceLanguage: string): Promise<Book | null> {
    await this.initialize();

    return await this.withDatabaseConnection(async (db) => {
      try {
        const query = `SELECT * FROM books WHERE name = ? AND sourceLanguage = ?`;
        const result = await db.getFirstAsync<any>(query, [name, sourceLanguage.toLowerCase()]);
        
        if (!result) {
          return null;
        }

        return {
          id: result.id,
          name: result.name,
          sourceLanguage: result.sourceLanguage,
          updateDate: new Date(result.updateDate),
          lastreadDate: new Date(result.lastreadDate),
          bookUrl: result.bookUrl,
          imageUrl: result.imageUrl,
          currentLocation: result.currentLocation,
          progress: result.progress
        };
      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error getting book by name', { 
          error: error instanceof Error ? error.message : String(error),
          bookName: name,
          sourceLanguage
        });
        throw error;
      }
    });
  }

  async updateBook(name: string, source: string, currentLocation: string): Promise<void> {
    await this.initialize();
    
    await this.withDatabaseConnection(async (db) => {
      try {
        await db.runAsync(
          `UPDATE books 
           SET currentLocation = ?, lastreadDate = ?
           WHERE name = ? AND sourceLanguage = ?`,
          [
            currentLocation,
            new Date().toISOString(),
            name,
            source.toLowerCase()
          ]
        );
        
        logger.info(LogCategories.DATABASE, 'Book updated successfully', { bookName: name });
      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error updating book', { 
          error: error instanceof Error ? error.message : String(error),
          bookName: name
        });
        throw error;
      }
    });
  }

  async updateBookProgress(name: string, source: string, progress: number): Promise<void> {
    await this.initialize();

    await this.withDatabaseConnection(async (db) => {
      await db.runAsync(
        `UPDATE books SET progress = ? WHERE name = ? AND sourceLanguage = ?`,
        [progress, name, source.toLowerCase()]
      );
    });
  }

  async deleteBook(name: string, sourceLanguage: string, deleteCards: boolean): Promise<void> {
    await this.initialize();

    await this.withDatabaseConnection(async (db) => {
      try {
        const book = await this.getBookByName(name, sourceLanguage);
        if (!book) {
          throw new Error(`Book '${name}' not found.`);
        }

        // Delete book record
        await db.runAsync(
          'DELETE FROM books WHERE name = ? AND sourceLanguage = ?',
          [name, sourceLanguage]
        );
        
        if (deleteCards) {
          // Get all cards associated with this book
          const cardIds = await db.getAllAsync<{ id: number }>(
            'SELECT id FROM cards WHERE source = ? AND sourceLanguage = ?',
            [name, sourceLanguage]
          );

          // Delete associated histories and cards
          for (const { id } of cardIds) {
            await db.runAsync('DELETE FROM histories WHERE cardId = ?', [id]);
          }

          await db.runAsync(
            'DELETE FROM cards WHERE source = ? AND sourceLanguage = ?',
            [name, sourceLanguage]
          );
        }
        
        logger.info(LogCategories.DATABASE, 'Book and associated data successfully deleted', { bookName: name });
      } catch (error) {
        logger.error(LogCategories.DATABASE, 'Error deleting book', { 
          error: error instanceof Error ? error.message : String(error),
          bookName: name
        });
        throw error;
      }
    });
  }
}

// Export a single instance of the Database class
export const database = new Database();

function ensureCardInfo(info: any): CardInfo {
  const DEFAULT_CARD_INFO: CardInfo = {
    status: 'reviewing',
    learningProgress: {
      wordToMeaning: 2,
      meaningToWord: 2,
      context: 2,
      contextLetters: 2
    },
    sentence: ""
  };
  
  if (!info) return DEFAULT_CARD_INFO;
  
  return {
    status: info.status || DEFAULT_CARD_INFO.status,
    learningProgress: {
      wordToMeaning: info.learningProgress?.wordToMeaning ?? DEFAULT_CARD_INFO.learningProgress.wordToMeaning,
      meaningToWord: info.learningProgress?.meaningToWord ?? DEFAULT_CARD_INFO.learningProgress.meaningToWord,
      context: info.learningProgress?.context ?? DEFAULT_CARD_INFO.learningProgress.context,
      contextLetters: info.learningProgress?.contextLetters ?? DEFAULT_CARD_INFO.learningProgress.contextLetters
    },
    sentence: info.sentence || ""
  };
}