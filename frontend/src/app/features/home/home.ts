import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ImagePlus, CirclePlus, Calendar, Stethoscope, Pill } from 'lucide-angular';
import { Router, RouterLink } from '@angular/router';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  colorClass: string;
  path: string;
}

interface CalendarWeek {
  dateObj: Date;
  dayName: string;
  dayNumber: number;
  dots: number[];
}

interface Article {
  tag: string;
  title: string;
  description: string;
  imageUrl: string;
  actionText: string;
  actionUrl: string;
}

interface HomeHighlightCard {
  value: string;
  title: string;
  subtitle?: string;
  backgroundClass: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent implements OnInit {
  private readonly router = inject(Router);
  readonly ImagePlus = ImagePlus;
  readonly CirclePlus = CirclePlus;
  readonly CalendarIcon = Calendar;
  readonly Stethoscope = Stethoscope;
  readonly Pill = Pill;

  currentMonthYear: string = '';
  calendarWeek: CalendarWeek[] = [];
  selectedDate: Date = new Date();

  summaryCards: HomeHighlightCard[] = [
    {
      value: '2/4',
      title: 'Medicações tomadas',
      backgroundClass: 'summary-card--purple',
    },
    {
      value: '27/06/2026',
      title: '15:30',
      subtitle: 'Próxima consulta',
      backgroundClass: 'summary-card--blue',
    },
  ];

  QuickAction = [
    {
      title: 'Check-in',
      description: 'Registre seu humor e sintomas',
      icon: this.CirclePlus,
      colorClass: 'blue-icon',
      path: '/checkin',
    },
        {
      title: 'Registrar medicamentos',
      description: 'Veja quais remédios tomar hoje',
      icon: this.Pill,
      colorClass: 'yellow-icon',
      path: '/medication',
    },
    {
      title: 'Registrar consulta',
      description: 'Consultas, exames e retornos',
      icon: this.Stethoscope,
      colorClass: 'purple-icon',
      path: '/appointments/register',
    },
    {
      title: 'Registro de Fotos',
      description: 'Acompanhe mudanças na pele',
      icon: this.ImagePlus,
      colorClass: 'green-icon',
      path: '/photo-register',
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
    if (!path) return;
    void this.router.navigate([path]);
  }

  ngOnInit(): void {
    this.generateCurrentWeek();
    this.updateMonthYearLabel();
  }

  generateCurrentWeek() {
    const today = new Date();
    const currentDay = today.getDay();

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);

    const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 7; i++) {
      const dateObj = new Date(startOfWeek);
      dateObj.setDate(startOfWeek.getDate() + i);

      this.calendarWeek.push({
        dateObj,
        dayName: daysPt[dateObj.getDay()],
        dayNumber: dateObj.getDate(),
        dots: Array(Math.floor(Math.random() * 3)).fill(0), 
      });
    }
  }

  updateMonthYearLabel() {
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    this.currentMonthYear = `${months[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}`;
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.updateMonthYearLabel();
  }

  isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }
}
