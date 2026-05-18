import { Injectable, signal } from '@angular/core';

/**
 * Central place for notification UI state. Wire SSE/polling here when the API exists.
 */
@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  /** Count for badge; backend can call `setUnreadCount` when events arrive. */
  readonly unreadCount = signal(0);

  /** True while a refresh/sync is in flight (optional UI). */
  readonly isSyncing = signal(false);

  /** Incremented when the user opens the tray — hook a panel component to this later. */
  readonly trayVersion = signal(0);

  openTray(): void {
    this.trayVersion.update((v) => v + 1);
  }

  setUnreadCount(count: number): void {
    this.unreadCount.set(Math.max(0, Math.floor(count)));
  }

  incrementUnread(delta = 1): void {
    this.unreadCount.update((n) => Math.max(0, n + delta));
  }

  clearUnread(): void {
    this.unreadCount.set(0);
  }
}
