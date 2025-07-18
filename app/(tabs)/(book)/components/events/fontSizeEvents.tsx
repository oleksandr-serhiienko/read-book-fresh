// events/FontSizeEvents.ts
import { logger, LogCategories } from '@/utils/logger';

type FontSizeUpdateListener = (fontSize: number) => void;

export class FontSizeEvents {
  private static listeners: FontSizeUpdateListener[] = [];
  private static isEmitting = false;

  static subscribe(listener: FontSizeUpdateListener) {
    logger.debug(LogCategories.FONT_SIZE_EVENTS, 'New listener subscribed');
    this.listeners.push(listener);
    return () => {
      logger.debug(LogCategories.FONT_SIZE_EVENTS, 'Listener unsubscribed');
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static emit(fontSize: number) {
    if (this.isEmitting) {
      logger.debug(LogCategories.FONT_SIZE_EVENTS, 'Already emitting, skipping');
      return;
    }

    logger.debug(LogCategories.FONT_SIZE_EVENTS, 'Emitting font size change', { fontSize });
    this.isEmitting = true;

    try {
      this.listeners.forEach(listener => {
        try {
          listener(fontSize);
        } catch (error) {
          logger.error(LogCategories.FONT_SIZE_EVENTS, 'Error in listener', { error: error instanceof Error ? error.message : String(error) });
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

export default FontSizeEvents;