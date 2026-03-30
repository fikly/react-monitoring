const SESSION_KEY = '__web_monitor_session_id';

export class SessionManager {
  private sessionId: string;
  private userId: string | undefined;

  constructor(userId?: string) {
    this.sessionId = this.getOrCreateSessionId();
    this.userId = userId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  private getOrCreateSessionId(): string {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;

      const id = this.generateId();
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch {
      // sessionStorage unavailable (e.g., incognito in some browsers)
      return this.generateId();
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
