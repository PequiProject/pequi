import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ImagePlus, CirclePlus, Calendar, Stethoscope, Pill, ChevronLeft, ChevronRight } from 'lucide-angular';
import { Router } from '@angular/router';
import { HealthAppointmentService } from '../appointments/services/health-appointment.service';
import {
  formatAppointmentDatePt,
  resolveNextAppointment,
} from '../appointments/utils/next-appointment.utils';
import type { Article } from '../education/models/article.models';
import { ArticlesService } from '../education/services/articles.service';

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  colorClass: string;
  path: string;
}

interface CalendarDay {
  dateObj: Date;
  dayName: string;
  dayNumber: number;
  dots: number[];
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
export class HomeComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly appointmentService = inject(HealthAppointmentService);
  private readonly articlesService = inject(ArticlesService);
  readonly ImagePlus = ImagePlus;
  readonly CirclePlus = CirclePlus;
  readonly CalendarIcon = Calendar;
  readonly Stethoscope = Stethoscope;
  readonly Pill = Pill;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  @ViewChild('daysRow') daysRow!: ElementRef<HTMLDivElement>;

  currentMonthYear: string = '';
  isExpanded = signal(false);
  calendarWeek: CalendarDay[] = [];
  calendarMonth: (CalendarDay | null)[] = [];
  selectedDate: Date = new Date();

  readonly medicationSummaryCard: HomeHighlightCard = {
    value: '2/4',
    title: 'Medicações tomadas',
    backgroundClass: 'summary-card--purple',
  };

  readonly nextAppointmentCard = computed(() => {
    const next = resolveNextAppointment(this.appointmentService.appointments());
    if (!next) {
      return {
        value: 'Próxima consulta ainda não registrada',
        title: '',
        subtitle: 'Próxima consulta',
        backgroundClass: 'summary-card--blue',
        hasNext: false as const,
        info: null,
      };
    }

    return {
      value: formatAppointmentDatePt(next.dateIso),
      title: next.time ?? 'Horário não informado',
      subtitle: 'Próxima consulta',
      backgroundClass: 'summary-card--blue',
      hasNext: true as const,
      info: next,
    };
  });

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

  readonly featuredArticle = signal<Article | null>(null);

  executeAction(path: string) {
    if (!path) return;
    void this.router.navigate([path]);
  }

  openNextAppointment(): void {
    const card = this.nextAppointmentCard();
    const queryParams: Record<string, string> = {};

    if (card.info?.appointmentId) {
      queryParams['appointmentId'] = card.info.appointmentId;
    } else if (card.info) {
      queryParams['date'] = card.info.dateIso;
      if (card.info.time) {
        queryParams['time'] = card.info.time;
      }
      if (card.info.location) {
        queryParams['location'] = card.info.location;
      }
      if (card.info.appointmentType) {
        queryParams['type'] = card.info.appointmentType;
      }
    }

    void this.router.navigate(['/appointments/register'], { queryParams });
  }

  ngOnInit(): void {
    this.generateCurrentWeek();
    this.generateCurrentMonth();
    this.updateMonthYearLabel();
    this.loadFeaturedArticle();
  }

  openFeaturedArticle(): void {
    const article = this.featuredArticle();
    if (!article) return;
    void this.router.navigate(['/education', article.slug]);
  }

  private loadFeaturedArticle(): void {
    this.articlesService.listArticles({ category: 'education', limit: 1 }).subscribe({
      next: (response) => {
        this.featuredArticle.set(response.items[0] ?? null);
      },
      error: () => {
        this.featuredArticle.set(null);
      },
    });
  }

  ngAfterViewInit(): void {
    this.centerActiveDay();
  }

  toggleCalendar() {
    this.isExpanded.update(val => !val);

    if (!this.isExpanded()) {
      this.centerActiveDay();
    }
  }

  changeMonth(delta: number) {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    this.selectedDate = newDate;
    
    this.updateMonthYearLabel();
    this.generateCurrentWeek();
    this.generateCurrentMonth();
  }

  goToToday() {
    this.selectedDate = new Date();
    this.updateMonthYearLabel();
    this.generateCurrentWeek();
    this.generateCurrentMonth();
    this.centerActiveDay();
  }

  centerActiveDay() {
    setTimeout(() => {
      if (!this.daysRow) return;

      const container = this.daysRow.nativeElement;
      const activeCard = container.querySelector('.day-card.active') as HTMLElement;

      if (activeCard) {
        activeCard.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
      }
    }, 100);
  }

  generateCurrentWeek() {
    this.calendarWeek = [];
    const currentDay = this.selectedDate.getDay();

    const startOfScroll = new Date(this.selectedDate);
    startOfScroll.setDate(this.selectedDate.getDate() - 10);

    const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 21; i++) {
      const dateObj = new Date(startOfScroll);
      dateObj.setDate(startOfScroll.getDate() + i);

      this.calendarWeek.push({
        dateObj,
        dayName: daysPt[dateObj.getDay()],
        dayNumber: dateObj.getDate(),
        dots: Array(Math.floor(Math.random() * 3)).fill(0), 
      });
    }
  }

  generateCurrentMonth() {
    this.calendarMonth = [];
    const year = this.selectedDate.getFullYear();
    const month = this.selectedDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < firstDayOfMonth.getDay(); i++) {
      this.calendarMonth.push(null);
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const dateObj = new Date(year, month, i);
      this.calendarMonth.push({
        dateObj,
        dayName: daysPt[dateObj.getDay()],
        dayNumber: i,
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
