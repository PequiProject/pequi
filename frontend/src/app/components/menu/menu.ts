// menu.component.ts
import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideHouse,
  LucideMap,
  LucideMapPinned,
  LucideGraduationCap,
  LucideUsers,
  LucideIcon,
} from '@lucide/angular';

type NavItem = {
  label: string;
  route: string;
  icon: LucideIcon;
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideDynamicIcon,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  @Output() collapsedChange = new EventEmitter<boolean>();

  isCollapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Início', route: '/home', icon: LucideHouse },
    { label: 'Jornada', route: '/journey', icon: LucideMap },
    { label: 'Check In', route: '/checkin', icon: LucideMapPinned },
    { label: 'Educação', route: '/education', icon: LucideGraduationCap },
    { label: 'Comunidade', route: '/comunity', icon: LucideUsers },
  ];

  toggleSidebar(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    this.collapsedChange.emit(next);
  }

  trackByRoute = (_: number, item: NavItem) => item.route;
}