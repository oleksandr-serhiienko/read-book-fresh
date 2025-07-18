// Centralized logging system for the application
export interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  category: string;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep only last 1000 logs

  private addLog(level: LogEntry['level'], category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data
    };

    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console for development
    if (__DEV__) {
      const logMessage = `[${level}] ${category}: ${message}`;
      switch (level) {
        case 'ERROR':
          console.error(logMessage, data);
          break;
        case 'WARNING':
          console.warn(logMessage, data);
          break;
        case 'DEBUG':
          console.debug(logMessage, data);
          break;
        default:
          console.log(logMessage, data);
      }
    }
  }

  info(category: string, message: string, data?: any) {
    this.addLog('INFO', category, message, data);
  }

  warning(category: string, message: string, data?: any) {
    this.addLog('WARNING', category, message, data);
  }

  error(category: string, message: string, data?: any) {
    this.addLog('ERROR', category, message, data);
  }

  debug(category: string, message: string, data?: any) {
    this.addLog('DEBUG', category, message, data);
  }

  warn(category: string, message: string, data?: any) {
    this.addLog('WARNING', category, message, data);
  }

  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogs(category?: string): LogEntry[] {
    if (category) {
      return this.logs.filter(log => log.category === category);
    }
    return [...this.logs];
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return this.logs.map(log => 
      `${log.timestamp.toISOString()} [${log.level}] ${log.category}: ${log.message}${log.data ? ' ' + JSON.stringify(log.data) : ''}`
    ).join('\n');
  }
}

export const logger = new Logger();

// Logging categories
export const LogCategories = {
  CARD_SWIPE: 'CardSwipe',
  CONTEXT_SELECTION: 'ContextSelection',
  SPACED_REPETITION: 'SpacedRepetition',
  LEARNING_PROGRESS: 'LearningProgress',
  DATABASE: 'Database',
  REVIEW_SYSTEM: 'ReviewSystem',
  CARD_GENERATION: 'CardGeneration',
  USER_ACTION: 'UserAction',
  SETTINGS: 'Settings',
  ERROR: 'Error',
  WORD_HIGHLIGHT: 'WordHighlight',
  CHAPTER_DATA: 'ChapterData',
  FONT_SIZE_EVENTS: 'FontSizeEvents',
  WORD_INTERACTION: 'WordInteraction'
} as const;