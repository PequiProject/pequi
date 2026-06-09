import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { JourneyService } from './services/journey-service';
import { RouterLink } from '@angular/router';

export type LeprosyType = 'PB' | 'MB' | '';
export type JourneyEventType =
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
  completedMedicationDays: number;
  expectedMedicationDays: number;
}

@Component({
  selector: 'app-journey',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './journey.html',
  styleUrl: './journey.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Journey implements OnInit {
  readonly journeyService = inject(JourneyService);

  readonly patient = this.journeyService.patient;
  readonly apiMonths = this.journeyService.months;
  readonly summary = this.journeyService.summary;
  readonly isLoading = this.journeyService.isLoading;
  readonly error = this.journeyService.error;

  readonly expandedMonths = signal<Record<number, boolean>>({});

  ngOnInit(): void {
    this.journeyService.loadJourney();
  }

  readonly patientName = computed(() => this.patient().name);

  readonly leprosyType = computed<LeprosyType>(() => {
    return this.summary()?.classification ?? this.patient().leprosyType ?? '';
  });

  readonly treatmentStartDate = computed(
    () => this.summary()?.treatment_start_date ?? this.patient().treatmentStartDate
  );

  readonly events = computed(() => this.journeyService.events());

  readonly totalMonths = computed(() => {
    const apiValue = this.summary()?.treatment_duration_months;
    if (apiValue) {
      return apiValue;
    }
    return this.leprosyType() === 'PB' ? 6 : 12;
  });

  readonly totalDays = computed(() => {
    return this.summary()?.total_days ?? this.totalMonths() * 30;
  });

  readonly elapsedDays = computed(() => this.summary()?.elapsed_days ?? 0);

  readonly remainingDays = computed(() => {
    return this.summary()?.remaining_days ?? Math.max(0, this.totalDays() - this.elapsedDays());
  });

  readonly progressPercent = computed(() => {
    return this.summary()?.progress_percent ?? 0;
  });

  readonly currentMonth = computed(() => {
    return this.summary()?.current_month ?? 1;
  });

  readonly estimatedEndDate = computed(() => {
    return this.summary()?.estimated_end_date ?? '';
  });

  readonly months = computed<JourneyMonth[]>(() => {
    const expandedMap = this.expandedMonths();

    return this.apiMonths().map((month) => ({
      monthIndex: month.month_index,
      label: month.label,
      expanded: expandedMap[month.month_index] ?? month.status === 'current',
      completed: month.status === 'completed',
      current: month.status === 'current',
      locked: month.status === 'upcoming',
      events: month.events
        .map((event) => ({
          id: event.id,
          type: event.type,
          title: event.title,
          description: event.description,
          date: event.date,
          monthIndex: month.month_index,
          status: event.status,
          metadata: {
            dosesTaken: event.metadata?.dosesTaken,
            dosesExpected: event.metadata?.dosesExpected,
            symptomTrend: event.metadata?.symptomTrend,
            consultationLocation:
              event.metadata?.consultationLocation ?? event.metadata?.location,
          },
        }))
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
      completedMedicationDays: month.medication_summary.doses_taken,
      expectedMedicationDays: month.medication_summary.doses_expected,
    }));
  });

  readonly hasTreatmentStartDate = computed(() => {
    const value = this.treatmentStartDate();
    return !!value?.trim();
  });

  readonly shouldShowJourneySetupState = computed(() => !this.hasTreatmentStartDate());

  readonly emptyJourneyTitle = computed(() =>
    'Sua jornada de tratamento ainda não começou'
  );

  readonly emptyJourneyMessage = computed(
    () => 'Para acompanhar sua evolução, adicione a data de início do tratamento na tela de '
  );

  readonly emptyJourneyLinkLabel = computed(() => 'Perfil > Meu tratamento');

  readonly emptyJourneySupportMessage = computed(
    () =>
      'Depois de informar essa data, a linha do tempo será organizada automaticamente.'
  );

  readonly leprosyTypeLabel = computed(() =>
    this.leprosyType() === 'PB'
      ? 'Hanseníase paucibacilar (PB)'
      : 'Hanseníase multibacilar (MB)'
  );

  readonly treatmentEstimateText = computed(() =>
    this.totalMonths() === 6
      ? 'Estimativa de tratamento: 6 meses'
      : 'Estimativa de tratamento: 12 meses'
  );

  readonly progressHeadline = computed(() => {
    if (!this.hasTreatmentStartDate()) {
      return 'Adicione a data de início do tratamento';
    }

    if (this.progressPercent() >= 80) {
      return 'Você está avançando bem no tratamento';
    }

    if (this.progressPercent() >= 40) {
      return 'Seu tratamento segue em andamento';
    }

    return 'Cada etapa cumprida fortalece sua jornada';
  });

  readonly progressSupportText = computed(() => {
    if (!this.hasTreatmentStartDate()) {
      return 'Assim que essa data for informada, mostraremos seu progresso e os marcos da jornada.';
    }

    return `Você já percorreu ${this.elapsedDays()} de ${this.totalDays()} dias previstos do tratamento.`;
  });

  readonly remainingText = computed(() => {
    if (!this.hasTreatmentStartDate()) {
      return 'Acesse Perfil > Meu tratamento para informar a data e iniciar sua jornada visual.';
    }

    if (this.remainingDays() <= 0) {
      return 'Tratamento previsto concluído.';
    }

    const remainingMonths = Math.ceil(this.remainingDays() / 30);

    return `Faltam aproximadamente ${this.remainingDays()} dias (${remainingMonths} ${
      remainingMonths === 1 ? 'mês' : 'meses'
    }) para a estimativa final. Continue com o ótimo trabalho!`;
  });

  readonly displayMonths = computed<JourneyMonth[]>(() => {
    return this.months()
      .filter((month) => month.current || month.completed)
      .sort((a, b) => b.monthIndex - a.monthIndex);
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

    return `${month.events.length} registro(s) e ${month.completedMedicationDays}/${month.expectedMedicationDays} dia(s) completos no ciclo de 30 dias.`;
  }

  getMedicationAdherenceText(month: JourneyMonth): string | null {
    if (!month.expectedMedicationDays) {
      return null;
    }

    const percentage = Math.floor(
      (month.completedMedicationDays / month.expectedMedicationDays) * 100
    );

    return `Adesão registrada no mês: ${percentage}% (${month.completedMedicationDays}/${month.expectedMedicationDays} dias completos).`;
  }

  getMonthButtonLabel(month: JourneyMonth): string {
    if (month.locked) {
      return 'Aguardando';
    }

    return month.expanded ? 'Ocultar' : 'Ver detalhes';
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
      case 'medication-summary':
        return 'Medicação';
      case 'clinical-update':
        return 'Evolução';
      default:
        return 'Mensagem';
    }
  }

  trackMonth(_: number, month: JourneyMonth): number {
    return month.monthIndex;
  }

  trackEvent(_: number, event: JourneyEvent): string {
    return event.id;
  }
}