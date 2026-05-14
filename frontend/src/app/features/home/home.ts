import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ImagePlus, CirclePlus } from 'lucide-angular';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent {
  readonly ImagePlus = ImagePlus;
  readonly CirclePlus = CirclePlus;

  QuickAction = [
    {
      title: 'Check-in',
      description: 'Registre seu humor e sintomas',
      icon: this.CirclePlus,
      colorClass: 'blue-icon'
    },
    {
      title: 'Registro de Fotos',
      description: 'Acompanhe mudanças na pele',
      icon: this.ImagePlus,
      colorClass: 'green-icon'
    }
  ];

  executeAction(title: string) {
    console.log(`Ação clicada: ${title}`);
  }
}