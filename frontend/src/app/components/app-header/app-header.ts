import { Component, HostListener, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideBell,
  LucideDynamicIcon,
  LucideLogOut,
  LucideUser,
} from '@lucide/angular';
import { NotificationHubService } from '../../core/notifications/notification-hub.service';
import { AuthService } from '../../features/auth/services/auth-service';

export type AppHeaderLayout = 'default' | 'withBack';

const ICON_BTN =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-indigo-700 transition-colors duration-150 hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700 focus-visible:outline-offset-2';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LucideDynamicIcon],
  templateUrl: './app-header.html',
})
export class AppHeader {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  protected readonly notifications = inject(NotificationHubService);

  readonly layout = input<AppHeaderLayout>('default');
  readonly userName = input('Usuário');
  readonly pageTitle = input('');
  readonly avatarUrl = input<string | null>(null);
  readonly profileLink = input('/profile');
  readonly backLink = input('/home');
  readonly quietNotificationButton = input(false);

  readonly LucideBell = LucideBell;
  readonly LucideArrowLeft = LucideArrowLeft;
  readonly LucideLogOut = LucideLogOut;
  readonly LucideUser = LucideUser;

  readonly unread = this.notifications.unreadCount;
  readonly showUnreadBadge = computed(() => this.unread() > 0);

  readonly navIconBtnClass = ICON_BTN;
  readonly bellBtnClass = computed(() =>
    this.quietNotificationButton()
      ? `${ICON_BTN} relative [-webkit-tap-highlight-color:transparent] hover:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent active:!bg-transparent`
      : `${ICON_BTN} relative`
  );

  readonly isProfileMenuOpen = signal(false);

  onNotificationsClick(): void {
    void this.router.navigateByUrl('/notifications');
  }

  toggleProfileMenu(event: Event): void {
    event.stopPropagation();
    this.isProfileMenuOpen.update(value => !value);
  }

  closeProfileMenu(): void {
    this.isProfileMenuOpen.set(false);
  }

  onProfileClick(event: Event): void {
    event.stopPropagation();
    this.closeProfileMenu();
    void this.router.navigateByUrl(this.profileLink());
  }

  logout(event?: Event): void {
    event?.stopPropagation();
    this.closeProfileMenu();
    this.authService.logout();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeProfileMenu();
  }
}