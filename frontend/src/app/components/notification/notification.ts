import { Component } from '@angular/core';
import { NotificationCard } from '../notification-card/notification-card';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [NotificationCard],
  templateUrl: './notification.html',
})
export class Notification {}
