// app-shell.component.ts
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Menu } from '../../components/menu/menu';
import { AppHeader, type AppHeaderLayout } from '../../components/app-header/app-header';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Menu, AppHeader],
  templateUrl: './app-shell-component.html',
})
export class AppShellComponent {
  private readonly router = inject(Router);

  isMenuCollapsed = false;

  readonly headerLayout = signal<AppHeaderLayout>('default');
  readonly headerPageTitle = signal('Perfil');
  readonly quietNotificationBell = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.syncHeaderFromUrl());
    this.syncHeaderFromUrl();
  }

  onMenuCollapsedChange(collapsed: boolean): void {
    this.isMenuCollapsed = collapsed;
  }

  private syncHeaderFromUrl(): void {
    const path = this.router.url.split('?')[0];
    const onNotifications =
      path.endsWith('/notifications') || path.includes('/notifications');

    this.quietNotificationBell.set(onNotifications);

    if (path.endsWith('/profile') || path.includes('/profile')) {
      this.headerLayout.set('withBack');
      this.headerPageTitle.set('Meu perfil');
    } else if (onNotifications) {
      this.headerLayout.set('withBack');
      this.headerPageTitle.set('Notificações');
    } else if (path.includes('/appointments/register')) {
      this.headerLayout.set('withBack');
      this.headerPageTitle.set('Registrar consulta');
    } else if (path.includes('/education/') && !path.endsWith('/education')) {
      this.headerLayout.set('withBack');
      this.headerPageTitle.set('Educação');
    } else {
      this.headerLayout.set('default');
    }
  }
}