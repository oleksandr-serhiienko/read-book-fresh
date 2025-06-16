// events/FontSizeEvents.ts
type FontSizeUpdateListener = (fontSize: number) => void;

export class FontSizeEvents {
  private static listeners: FontSizeUpdateListener[] = [];
  private static isEmitting = false;

  static subscribe(listener: FontSizeUpdateListener) {
    console.log('[FontSizeEvents] New listener subscribed');
    this.listeners.push(listener);
    return () => {
      console.log('[FontSizeEvents] Listener unsubscribed');
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static emit(fontSize: number) {
    if (this.isEmitting) {
      console.log('[FontSizeEvents] Already emitting, skipping');
      return;
    }

    console.log('[FontSizeEvents] Emitting font size change:', fontSize);
    this.isEmitting = true;

    try {
      this.listeners.forEach(listener => {
        try {
          listener(fontSize);
        } catch (error) {
          console.error('[FontSizeEvents] Error in listener:', error);
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