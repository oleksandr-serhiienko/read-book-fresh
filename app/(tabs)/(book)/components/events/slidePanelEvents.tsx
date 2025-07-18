// events/SlidePanelEvents.ts - Updated with EmittedWord type
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';
import { logger, LogCategories } from '@/utils/logger';

// New interface for the simplified word emission
export interface EmittedWord {
  word: string;
  translation: string;
  bookTitle: string;
  sentenceId: number;
}

export type PanelContent =  EmittedWord | null;
type PanelUpdateListener = (content: PanelContent, isVisible: boolean) => void;

export class SlidePanelEvents {
  private static listeners: PanelUpdateListener[] = [];
  private static isEmitting = false;

  static subscribe(listener: PanelUpdateListener) {
    logger.debug(LogCategories.USER_ACTION, 'Panel event listener subscribed');
    this.listeners.push(listener);
    return () => {
      logger.debug(LogCategories.USER_ACTION, 'Panel event listener unsubscribed');
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static emit(content: PanelContent, isVisible: boolean) {
    if (this.isEmitting) {
      logger.debug(LogCategories.USER_ACTION, 'Panel event already emitting, skipping');
      return;
    }

    logger.debug(LogCategories.USER_ACTION, 'Panel event emitting', { contentExists: !!content, isVisible });
    this.isEmitting = true;

    try {
      this.listeners.forEach(listener => {
        try {
          listener(content, isVisible);
        } catch (error) {
          logger.error(LogCategories.ERROR, 'Error in panel event listener', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      });
    } finally {
      this.isEmitting = false;
    }
  }

  static hasListeners() {
    return this.listeners.length > 0;
  }

  static reset() {
    this.listeners = [];
    this.isEmitting = false;
  }
}

export default SlidePanelEvents;