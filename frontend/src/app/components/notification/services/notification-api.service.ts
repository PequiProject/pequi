import { Injectable, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';

export interface AppNotification {
  id: string;
  type: 'dose_reminder' | 'ai_feedback' | 'low_adherence' | 'alert_generated';
  title: string;
  body: string;
  unread: boolean;
  read_at: string | null;
  created_at: string;
  whatsapp_sent: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private readonly http = inject(HttpClient);

  readonly notifications = httpResource<AppNotification[]>(() => ({
    url: '/api/notifications',
    method: 'GET',
  }));

  readonly unreadCount = httpResource<{ count: number }>(() => ({
    url: '/api/notifications/unread-count',
    method: 'GET',
  }));

  markAsRead(id: string) {
    return this.http.post<void>(`/api/notifications/${id}/read`, {});
  }

  markAllAsRead() {
    return this.http.post<void>('/api/notifications/read-all', {});
  }

  reloadAll(): void {
    this.notifications.reload();
    this.unreadCount.reload();
  }
}