// menu.component.ts
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

type NavItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  @Output() collapsedChange = new EventEmitter<boolean>();

  isCollapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Início', route: '/home', icon: 'assets/home.svg' },
  ];

  toggleSidebar(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    this.collapsedChange.emit(next);
  }

  trackByRoute = (_: number, item: NavItem) => item.route;
}