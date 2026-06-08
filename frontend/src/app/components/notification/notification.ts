import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { finalize } from 'rxjs';

import { NotificationCard } from '../notification-card/notification-card';
import { NotificationApiService } from './../../components/notification/services/notification-api.service';
import { NotificationHubService } from './../../core/notifications/notification-hub.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [NotificationCard, DatePipe],
  templateUrl: './notification.html',
})
export class Notification {
  private readonly api = inject(NotificationApiService);
  private readonly hub = inject(NotificationHubService);

  readonly notifications = computed(() => this.api.notifications.value() ?? []);
  readonly isLoading = this.api.notifications.isLoading;
  readonly error = this.api.notifications.error;

  constructor() {
    this.hub.sync();
  }

  markAsRead(id: string, unread: boolean): void {
    if (!unread) {
      return;
    }

    this.api
      .markAsRead(id)
      .pipe(
        finalize(() => {
          this.api.reloadAll();
          this.hub.sync();
        }),
      )
      .subscribe();
  }

  markAllAsRead(): void {
    this.api
      .markAllAsRead()
      .pipe(
        finalize(() => {
          this.api.reloadAll();
          this.hub.sync();
        }),
      )
      .subscribe();
  }
}