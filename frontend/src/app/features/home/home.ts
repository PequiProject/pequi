import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ImagePlus, CirclePlus } from 'lucide-angular';
import { Router } from '@angular/router';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  colorClass: string;
  path: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  private router = inject(Router);
  readonly ImagePlus = ImagePlus;
  readonly CirclePlus = CirclePlus;

  QuickAction = [
    {
      title: 'Check-in',
      description: 'Registre seu humor e sintomas',
      icon: this.CirclePlus,
      colorClass: 'blue-icon',
      path: '/checkin'
    },
    {
      title: 'Registro de Fotos',
      description: 'Acompanhe mudanças na pele',
      icon: this.ImagePlus,
      colorClass: 'green-icon',
      path: ''
    }
  ];

  executeAction(path: string) {
    this.router.navigate([path]);
  }
}