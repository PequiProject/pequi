import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ImagePlus, CirclePlus, Calendar } from 'lucide-angular';
import { Router } from '@angular/router';

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

interface CalendarWeek {
  dateObj: Date;
  dayName: string;
  dayNumber: number;
  dots: number[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class HomeComponent implements OnInit {
  private router = inject(Router);
  readonly ImagePlus = ImagePlus;
  readonly CirclePlus = CirclePlus;
  readonly CalendarIcon = Calendar;

  currentMonthYear: string = '';
  calendarWeek: CalendarWeek[] = [];
  selectedDate: Date = new Date();

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

  executeAction(path: string) {
    this.router.navigate([path]);
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
        dots: Array(Math.floor(Math.random() * 3)).fill(0), //simulação, mudar para dados reais depois
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
