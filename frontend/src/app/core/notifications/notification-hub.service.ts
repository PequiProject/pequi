import { Injectable, effect, inject, signal } from '@angular/core';
import { NotificationApiService } from './../../components/notification/services/notification-api.service';

@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private readonly api = inject(NotificationApiService);

  readonly unreadCount = signal(0);
  readonly isSyncing = signal(false);
  readonly trayVersion = signal(0);

  constructor() {
    effect(() => {
      const payload = this.api.unreadCount.value();
      this.unreadCount.set(payload?.count ?? 0);
    });
  }

  openTray(): void {
    this.trayVersion.update((v) => v + 1);
    this.sync();
  }

  sync(): void {
    this.isSyncing.set(true);
    this.api.reloadAll();
    queueMicrotask(() => this.isSyncing.set(false));
  }

  clearUnread(): void {
    this.unreadCount.set(0);
  }
}