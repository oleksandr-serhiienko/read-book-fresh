// events/SlidePanelEvents.ts - Updated with EmittedWord type
import { ResponseTranslation, SentenceTranslation } from '@/components/reverso/reverso';

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
    console.log('[SlidePanelEvents] New listener subscribed');
    this.listeners.push(listener);
    return () => {
      console.log('[SlidePanelEvents] Listener unsubscribed');
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static emit(content: PanelContent, isVisible: boolean) {
    if (this.isEmitting) {
      console.log('[SlidePanelEvents] Already emitting, skipping');
      return;
    }

    console.log('[SlidePanelEvents] Emitting event:', { contentExists: !!content, isVisible });
    this.isEmitting = true;

    try {
      this.listeners.forEach(listener => {
        try {
          listener(content, isVisible);
        } catch (error) {
          console.error('[SlidePanelEvents] Error in listener:', error);
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