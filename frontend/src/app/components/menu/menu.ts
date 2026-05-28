import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  LucideAngularModule,
  House,
  Map,
  MapPinned,
  GraduationCap,
  Users,
} from 'lucide-angular';

type NavItem = {
  label: string;
  route: string;
  icon: any;
  exactLink?: boolean;
};

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  @Output() menuCollapsedChange  = new EventEmitter<boolean>();

  isCollapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Início', route: '/home', icon: House },
    { label: 'Jornada', route: '/journey', icon: Map },
    { label: 'Check In', route: '/checkin', icon: MapPinned },
    { label: 'Educação', route: '/education', icon: GraduationCap },
    { label: 'Comunidade', route: '/comunity', icon: Users, exactLink: false },
  ];

  toggleSidebar(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    this.menuCollapsedChange .emit(next);
  }

  trackByRoute = (_: number, item: NavItem) => item.route;
}