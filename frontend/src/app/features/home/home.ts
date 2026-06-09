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
import {
  LucideAngularModule,
  ImagePlus,
  CirclePlus,
  Calendar,
  Stethoscope,
  Pill,
  ChevronLeft,
  ChevronRight,
} from 'lucide-angular';
import { Router } from '@angular/router';
import { HealthAppointmentService } from '../appointments/services/health-appointment.service';
import {
  formatAppointmentDatePt,
  resolveNextAppointment,
} from '../appointments/utils/next-appointment.utils';
import {
  DailyMedicationProgressService,
  type DailyMedicationSummaryResponse,
} from '../medication/services/daily-medication-progress.service';

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
export class HomeComponent implements OnInit, AfterViewInit {
  private readonly router = inject(Router);
  private readonly appointmentService = inject(HealthAppointmentService);
  private readonly dailyMedicationProgressService = inject(DailyMedicationProgressService);

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

  readonly medicationSummary = signal<DailyMedicationSummaryResponse | null>(null);

  readonly medicationSummaryCard = computed<HomeHighlightCard>(() => {
    const summary = this.medicationSummary();

    if (!summary || summary.expected_count === 0) {
      return {
        value: '0/0',
        title: 'Medicações tomadas',
        subtitle: 'Nenhuma dose esperada para hoje',
        backgroundClass: 'summary-card--purple',
      };
    }

    return {
      value: `${summary.taken_count}/${summary.expected_count}`,
      title: 'Medicações tomadas',
      subtitle: summary.completed ? 'Todas as doses do dia foram marcadas' : 'Progresso de hoje',
      backgroundClass: 'summary-card--purple',
    };
  });

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
    this.loadDailyMedicationSummary();
  }

  ngAfterViewInit(): void {
    this.centerActiveDay();
  }

  toggleCalendar() {
    this.isExpanded.update((val) => !val);

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
    this.loadDailyMedicationSummary();
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
          inline: 'center',
        });
      }
    }, 100);
  }

  generateCurrentWeek() {
    this.calendarWeek = [];
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

  private loadDailyMedicationSummary(): void {
    this.dailyMedicationProgressService.getSummary(this.getTodayDate()).subscribe({
      next: (summary) => {
        this.medicationSummary.set(summary);
      },
      error: () => {
        this.medicationSummary.set(null);
      },
    });
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}