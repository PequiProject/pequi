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

interface Article {
  tag: string;
  title: string;
  description: string;
  imageUrl: string;
  actionText: string;
  actionUrl: string;
}

interface Article {
  tag: string;
  title: string;
  description: string;
  imageUrl: string;
  actionText: string;
  actionUrl: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
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
      path: '/checkin',
    },
    {
      title: 'Registro de Fotos',
      description: 'Acompanhe mudanças na pele',
      icon: this.ImagePlus,
      colorClass: 'green-icon',
      path: '',
    },
  ];

  weeklyArticle: Article = {
    tag: 'ANÁLISE SEMANAL',
    title: 'O Poder da Hidratação na Resiliência da Pele',
    description:
      'Estudos recentes sugerem que rotinas de hidratação consistentes podem melhorar a função de barreira da pele em até 30% ao longo de 4 semanas.',
    imageUrl: 'assets/abstract-blue.png',
    actionText: 'Ler Artigo',
    actionUrl: '#',
  };

  executeAction(path: string) {
    this.router.navigate([path]);
  }
}
