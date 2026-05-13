// app-shell.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Menu } from '../../components/menu/menu';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Menu],
  templateUrl: './app-shell-component.html',
})
export class AppShellComponent {
  isMenuCollapsed = false;

  onMenuCollapsedChange(collapsed: boolean): void {
    this.isMenuCollapsed = collapsed;
  }
}