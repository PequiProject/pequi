import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { JourneyService } from './journey-service';

export type LeprosyType = 'PB' | 'MB';
export type JourneyEventType =
  | 'app-start'
  | 'treatment-start'
  | 'appointment'
  | 'medication-summary'
  | 'clinical-update'
  | 'motivational-message';

export type JourneyEventStatus = 'positive' | 'neutral' | 'attention';
export type SymptomTrend = 'improved' | 'stable' | 'worsened';

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  title: string;
  description: string;
  date: string;
  monthIndex?: number;
  status?: JourneyEventStatus;
  metadata?: {
    dosesTaken?: number;
    dosesExpected?: number;
    symptomTrend?: SymptomTrend;
    consultationLocation?: string;
  };
}

export interface JourneyMonth {
  monthIndex: number;
  label: string;
  expanded: boolean;
  completed: boolean;
  current: boolean;
  locked: boolean;
  events: JourneyEvent[];
  medicationTaken: number;
  medicationExpected: number;
}

@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './journey.html',
  styleUrl: './journey.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Journey {
  readonly journeyService = inject(JourneyService);
  readonly patient = this.journeyService.patient;

  readonly patientName = computed(() => this.patient().name);
  readonly leprosyType = computed(() => this.patient().leprosyType);
  readonly treatmentStartDate = computed(() => this.patient().treatmentStartDate);
  readonly appStartDate = computed(() => this.patient().appStartDate);
  readonly events = this.journeyService.events();

  readonly expandedMonths = signal<Record<number, boolean>>({});

  readonly totalMonths = computed(() =>
    this.leprosyType() === 'PB' ? 6 : 12
  );

  readonly totalDays = computed(() => this.totalMonths() * 30);

  readonly treatmentStart = computed(() =>
    this.parseIsoDate(this.treatmentStartDate())
  );

  readonly today = computed(() => this.stripTime(new Date()));

  readonly elapsedDays = computed(() => {
    const start = this.treatmentStart();
    if (!start) {
      return 0;
    }

    return Math.max(0, this.diffInDays(start, this.today()));
  });

  readonly remainingDays = computed(() =>
    Math.max(0, this.totalDays() - this.elapsedDays())
  );

  readonly progressPercent = computed(() => {
    const percent = Math.floor(
      (this.elapsedDays() / this.totalDays()) * 100
    );

    return Number.isFinite(percent) ? Math.min(100, Math.max(0, percent)) : 0;
  });

  readonly currentMonth = computed(() =>
    Math.min(
      this.totalMonths(),
      Math.max(1, Math.floor(this.elapsedDays() / 30) + 1)
    )
  );

  readonly estimatedEndDate = computed(() => {
    const start = this.treatmentStart();
    if (!start) {
      return '';
    }

    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + this.totalDays());
    return endDate.toISOString();
  });

  readonly months = computed<JourneyMonth[]>(() => {
    const totalMonths = this.totalMonths();
    const currentMonth = this.currentMonth();
    const expandedMap = this.expandedMonths();

    return Array.from({ length: totalMonths }, (_, index) => {
      const monthIndex = index + 1;
      const events = this.getEventsForMonth(monthIndex);
      const medicationSummary = this.extractMedicationSummary(events);
      const locked = monthIndex > currentMonth;

      return {
        monthIndex,
        label: `Mês ${monthIndex}`,
        expanded: expandedMap[monthIndex] ?? monthIndex === currentMonth,
        completed: monthIndex < currentMonth,
        current: monthIndex === currentMonth,
        locked,
        events,
        medicationTaken: medicationSummary.taken,
        medicationExpected: medicationSummary.expected,
      };
    });
  });

  readonly leprosyTypeLabel = computed(() =>
    this.leprosyType() === 'PB'
      ? 'Hanseníase paucibacilar (PB)'
      : 'Hanseníase multibacilar (MB)'
  );

  readonly treatmentEstimateText = computed(() =>
    this.leprosyType() === 'PB'
      ? 'Estimativa de tratamento: 6 meses'
      : 'Estimativa de tratamento: 12 meses'
  );

  readonly progressHeadline = computed(() => {
    if (this.progressPercent() >= 80) {
      return 'Você está avançando bem no tratamento';
    }

    if (this.progressPercent() >= 40) {
      return 'Seu tratamento segue em andamento';
    }

    return 'Cada etapa cumprida fortalece sua jornada';
  });

  readonly progressSupportText = computed(
    () =>
      `Você já percorreu ${this.elapsedDays()} de ${this.totalDays()} dias previstos do tratamento.`
  );

  readonly remainingText = computed(() => {
    if (this.remainingDays() <= 0) {
      return 'Tratamento previsto concluído.';
    }

    const remainingMonths = Math.ceil(this.remainingDays() / 30);

    return `Faltam aproximadamente ${this.remainingDays()} dias (${remainingMonths} ${
      remainingMonths === 1 ? 'mês' : 'meses'
    }) para a estimativa final. Continue com o ótimo trabalho!`;
  });

  toggleMonth(month: JourneyMonth): void {
    if (month.locked) {
      return;
    }

    this.expandedMonths.update((current) => ({
      ...current,
      [month.monthIndex]: !month.expanded,
    }));
  }

  getMonthStatusLabel(month: JourneyMonth): string {
    if (month.current) {
      return 'Mês atual';
    }

    if (month.completed) {
      return 'Etapa concluída';
    }

    return 'Etapa futura';
  }

  getMonthSummary(month: JourneyMonth): string {
    if (month.locked) {
      return 'Este mês ainda não começou.';
    }

    if (!month.events.length) {
      return 'Nenhum registro neste mês até agora.';
    }

    if (month.medicationExpected > 0) {
      return `${month.events.length} registro(s) e ${month.medicationTaken}/${month.medicationExpected} doses registradas.`;
    }

    return `${month.events.length} registro(s) neste mês.`;
  }

  getMonthButtonLabel(month: JourneyMonth): string {
    if (month.locked) {
      return 'Aguardando';
    }

    return month.expanded ? 'Ocultar' : 'Ver detalhes';
  }

  getMedicationAdherenceText(month: JourneyMonth): string | null {
    if (!month.medicationExpected) {
      return null;
    }

    const percentage = Math.floor(
      (month.medicationTaken / month.medicationExpected) * 100
    );

    return `Adesão registrada no mês: ${percentage}% (${month.medicationTaken}/${month.medicationExpected} doses).`;
  }

  getEventContainerClass(status?: JourneyEventStatus): string {
    switch (status) {
      case 'positive':
        return 'border-emerald-200 bg-emerald-50 text-emerald-900';
      case 'attention':
        return 'border-amber-200 bg-amber-50 text-amber-900';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-900';
    }
  }

  getEventBadgeClass(type: JourneyEventType): string {
    switch (type) {
      case 'appointment':
        return 'bg-sky-100 text-sky-700';
      case 'treatment-start':
        return 'bg-violet-100 text-violet-700';
      case 'app-start':
        return 'bg-slate-200 text-slate-700';
      case 'medication-summary':
        return 'bg-emerald-100 text-emerald-700';
      case 'clinical-update':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-indigo-100 text-indigo-700';
    }
  }

  getEventTypeLabel(type: JourneyEventType): string {
    switch (type) {
      case 'appointment':
        return 'Consulta';
      case 'treatment-start':
        return 'Tratamento';
      case 'app-start':
        return 'Aplicativo';
      case 'medication-summary':
        return 'Medicação';
      case 'clinical-update':
        return 'Evolução';
      default:
        return 'Mensagem';
    }
  }

  getEventsForMonth(monthIndex: number): JourneyEvent[] {
    const mappedInputEvents = this.journeyService.events()
      .map((event) => ({
        ...event,
        monthIndex: event.monthIndex ?? this.getMonthIndexFromDate(event.date),
      }))
      .filter((event) => event.monthIndex === monthIndex);

    const generatedEvents: JourneyEvent[] = [];

    const appMonth = this.getMonthIndexFromDate(this.appStartDate());
    if (appMonth === monthIndex && this.appStartDate()) {
      generatedEvents.push({
        id: `app-start-${monthIndex}`,
        type: 'app-start',
        title: 'Você começou a usar o aplicativo',
        description:
          'Seu acompanhamento digital foi iniciado para apoiar sua continuidade no tratamento.',
        date: this.appStartDate(),
        monthIndex,
        status: 'neutral',
      });
    }

    const treatmentMonth = this.getMonthIndexFromDate(this.treatmentStartDate());
    if (treatmentMonth === monthIndex && this.treatmentStartDate()) {
      generatedEvents.push({
        id: `treatment-start-${monthIndex}`,
        type: 'treatment-start',
        title: 'Início do tratamento',
        description:
          'Seu tratamento foi iniciado e sua jornada de cuidado começou oficialmente.',
        date: this.treatmentStartDate(),
        monthIndex,
        status: 'positive',
      });
    }

    const allEvents = [...mappedInputEvents, ...generatedEvents]
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));

    const hasImproved = allEvents.some(
      (event) => event.metadata?.symptomTrend === 'improved'
    );
    const hasWorsened = allEvents.some(
      (event) => event.metadata?.symptomTrend === 'worsened'
    );

    if (hasImproved) {
      allEvents.push({
        id: `auto-improved-${monthIndex}`,
        type: 'motivational-message',
        title: 'Sinais positivos neste mês',
        description:
          'Percebemos uma melhora registrada no período. Manter a regularidade do tratamento é importante para seguir avançando.',
        date: this.getSyntheticMonthDate(monthIndex),
        monthIndex,
        status: 'positive',
      });
    }

    if (hasWorsened) {
      allEvents.push({
        id: `auto-attention-${monthIndex}`,
        type: 'motivational-message',
        title: 'Atenção aos sintomas',
        description:
          'Houve registro de piora neste mês. Continue acompanhando os sintomas e leve essas informações para a próxima consulta.',
        date: this.getSyntheticMonthDate(monthIndex),
        monthIndex,
        status: 'attention',
      });
    }

    return allEvents.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }

  extractMedicationSummary(events: JourneyEvent[]): {
    taken: number;
    expected: number;
  } {
    return events
      .filter((event) => event.type === 'medication-summary')
      .reduce(
        (acc, event) => {
          acc.taken += event.metadata?.dosesTaken ?? 0;
          acc.expected += event.metadata?.dosesExpected ?? 0;
          return acc;
        },
        { taken: 0, expected: 0 }
      );
  }

  getMonthIndexFromDate(dateString?: string): number {
    const start = this.parseIsoDate(this.treatmentStartDate());
    const date = this.parseIsoDate(dateString);

    if (!start || !date) {
      return 1;
    }

    const diffDays = Math.max(0, this.diffInDays(start, date));
    return Math.min(this.totalMonths(), Math.floor(diffDays / 30) + 1);
  }

  trackMonth(_: number, month: JourneyMonth): number {
    return month.monthIndex;
  }

  trackEvent(_: number, event: JourneyEvent): string {
    return event.id;
  }

  private getSyntheticMonthDate(monthIndex: number): string {
    const start = this.parseIsoDate(this.treatmentStartDate());

    if (!start) {
      return new Date().toISOString();
    }

    const synthetic = new Date(start);
    synthetic.setDate(synthetic.getDate() + (monthIndex - 1) * 30 + 29);
    return synthetic.toISOString();
  }

  private parseIsoDate(dateString?: string): Date | null {
    if (!dateString) {
      return null;
    }

    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? null : this.stripTime(date);
  }

  private stripTime(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private diffInDays(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((end.getTime() - start.getTime()) / msPerDay);
  }
}