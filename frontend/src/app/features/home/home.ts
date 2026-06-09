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
import { CheckinService } from '../checkin/services/checkin.service';
import { HealthAppointment } from '../appointments/models/health-appointment.models';
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
  dots: string[];
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
  private readonly checkinService = inject(CheckinService);
  private readonly dailyMedicationProgressService = inject(DailyMedicationProgressService);

  readonly ImagePlus = ImagePlus;
  readonly CirclePlus = CirclePlus;
  readonly CalendarIcon = Calendar;
  readonly Stethoscope = Stethoscope;
  readonly Pill = Pill;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly moodMap: Record<string, string> = {
    'great': 'Ótimo',
    'good': 'Muito Bem',
    'ok': 'Normal',
    'bad': 'Ruim',
    'terrible': 'Péssimo'
  };

  translateMood(mood: string): string {
    if (!mood) return 'Não registrado';
    return this.moodMap[mood.toLowerCase()] || mood;
  }

  @ViewChild('daysRow') daysRow!: ElementRef<HTMLDivElement>;

  currentMonthYear: string = '';
  isExpanded = signal(false);
  calendarWeek: CalendarDay[] = [];
  calendarMonth: (CalendarDay | null)[] = [];
  selectedDate: Date = new Date();

  monthDotsMap = signal<Record<string, string[]>>({});
  allCheckins = signal<any[]>([]);
  allAppointments = signal<HealthAppointment[]>([]);
  selectedDayEvents = signal<any[]>([]);

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
    this.appointmentService.syncFromApi().subscribe({
      next: (appointments) => {
        this.allAppointments.set(appointments);
        this.rebuildDotsMap(); 
      }
    });
    this.fetchMonthData();
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

  fetchMonthData() {
    this.checkinService.getCheckinHistory().subscribe({
      next: (response) => {
        const checkinsList = Array.isArray(response) ? response : response.items || [];
        this.allCheckins.set(checkinsList);

        this.rebuildDotsMap();
      },
      error: (err) => console.error('Erro ao buscar check-ins:', err)
    });
  }

  rebuildDotsMap() {
    const dotsMap: Record<string, string[]> = {};

    this.allCheckins().forEach((checkin: any) => {
      const dateField = checkin.created_at || checkin.date;
      if (dateField) {
        const dateKey = dateField.split('T')[0];
        if (!dotsMap[dateKey]) dotsMap[dateKey] = [];
        dotsMap[dateKey].push('checkin');
      }
    });

    this.allAppointments().forEach((apt: HealthAppointment) => {
      const dateField = apt.appointmentDate;
      if (dateField) {
        const dateKey = dateField.split('T')[0];
        if (!dotsMap[dateKey]) dotsMap[dateKey] = [];
        dotsMap[dateKey].push('appointment');
      }
    });

    this.monthDotsMap.set(dotsMap);
    this.generateCurrentWeek(); 
    this.generateCurrentMonth();
    this.filterEventsForSelectedDate();
  }

  filterEventsForSelectedDate() {
    const clickedDateStr = this.getLocalIsoDate(this.selectedDate);
    const mergedEvents: any[] = [];
    
    this.allCheckins().forEach(checkin => {
      const dateField = checkin.created_at || checkin.date;
      if (dateField && dateField.split('T')[0] === clickedDateStr) {
        mergedEvents.push({
          type: 'checkin',
          id: checkin.id,
          time: dateField, 
          title: 'Check-in de Saúde',
          description: checkin.notes || 'Humor: ' + this.translateMood(checkin.mood),
          icon: this.CirclePlus,
          colorClass: 'text-[#0EA5E9] bg-[#E0F2FE] border-[#0EA5E9]' 
        });
      }
    });

    this.allAppointments().forEach(apt => {
      const dateField = apt.appointmentDate;
      if (dateField && dateField.split('T')[0] === clickedDateStr) {
        mergedEvents.push({
          type: 'appointment',
          id: apt.id,
          time: apt.appointmentTime ? `${dateField}T${apt.appointmentTime}` : dateField,
          title: apt.type === 'exame' ? 'Exame' : apt.type === 'retorno' ? 'Retorno' : 'Consulta',
          description: `Local: ${apt.location || 'Não informado'} ${apt.professional ? '- ' + apt.professional : ''}`,
          icon: this.Stethoscope,
          colorClass: 'text-[#9333EA] bg-[#F3E8FF] border-[#9333EA]'
        });
      }
    });
    mergedEvents.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    this.selectedDayEvents.set(mergedEvents);
  }

  changeMonth(delta: number) {
    const newDate = new Date(this.selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    this.selectedDate = newDate;

    this.updateMonthYearLabel();
    this.fetchMonthData();
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

  private getLocalIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  generateCurrentWeek() {
    this.calendarWeek = [];
    const startOfScroll = new Date(this.selectedDate);
    startOfScroll.setDate(this.selectedDate.getDate() - 10);

    const daysPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    for (let i = 0; i < 21; i++) {
      const dateObj = new Date(startOfScroll);
      dateObj.setDate(startOfScroll.getDate() + i);

      const dateKey = this.getLocalIsoDate(dateObj);
      const dotsForDay = this.monthDotsMap()[dateKey] || [];
      
      this.calendarWeek.push({
        dateObj,
        dayName: daysPt[dateObj.getDay()],
        dayNumber: dateObj.getDate(),
        dots: dotsForDay,
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
      
      const dateKey = this.getLocalIsoDate(dateObj);
      const dotsForDay = this.monthDotsMap()[dateKey] || [];
      
      this.calendarMonth.push({
        dateObj,
        dayName: daysPt[dateObj.getDay()],
        dayNumber: i,
        dots: dotsForDay,
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
    this.generateCurrentWeek();
    this.centerActiveDay();
    this.filterEventsForSelectedDate();
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
