import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PatientTreatmentData } from '../profile/models/patient-profile.models';
import {
  MedicationDataService,
  type MedicationChecklistResponse,
} from './services/medication-data.service';
import { MedicationIntakeService } from './services/medication-intake.service';
import { HealthAppointmentService } from '../appointments/services/health-appointment.service';
import {
  buildMedicationSchedule,
  buildTodayDoseSlots,
  getDoseSlotIntakeState,
  type DoseSlot,
} from './utils/medication-schedule.utils';
import { formatSupervisedDoseScheduleLabel } from './utils/supervised-dose-schedule.utils';
import { Hospital, Pill, LucideAngularModule } from 'lucide-angular';
import { DailyMedicationProgressService } from './services/daily-medication-progress.service';

type InstitutedMedicationItem = PatientTreatmentData['institutedMedications'][number];
type MedicationSection = 'unsupervised' | 'supervised';

export interface MedicationChecklistPayload {
  checkedCount: number;
  totalCount: number;
  unsupervisedCheckedCount: number;
  unsupervisedTotalCount: number;
  supervisedCheckedCount: number;
  supervisedTotalCount: number;
}

/** Um card por horário de dose no dia (ex.: 08:00, 16:00, 00:00). */
interface MedicationDoseCardItem {
  storageKey: string;
  id: string;
  medicationName: string;
  title: string;
  subtitle: string;
  frequencyLabel: string;
  doseTime: string;
  doseIndex: number;
  dosesPerDay: number;
  slot: DoseSlot;
  isDueNow: boolean;
  canToggle: boolean;
  checked: boolean;
  statusLabel: string | null;
  section: MedicationSection;
  doseLabel: string;
  nextSupervisedDoseLabel: string | null;
}

interface SupervisedMedicationCardItem {
  storageKey: string;
  id: string;
  title: string;
  subtitle: string;
  scheduleLabel: string;
  doseLabel: string;
  nextSupervisedDoseLabel: string | null;
}

@Component({
  selector: 'app-medication',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './medication.html',
  styleUrl: './medication.css',
})
export class Medication implements OnInit, OnDestroy {
  private readonly medicationDataService = inject(MedicationDataService);
  private readonly intakeService = inject(MedicationIntakeService);
  private readonly appointmentService = inject(HealthAppointmentService);
  private readonly dailyMedicationProgressService = inject(DailyMedicationProgressService);

  readonly Pill = Pill;
  readonly Hospital = Hospital;

  @Output() checklistChange = new EventEmitter<MedicationChecklistPayload>();

  isLoading = false;
  canRegisterDoses = false;
  loadError = '';

  unsupervisedItems: MedicationDoseCardItem[] = [];
  supervisedItems: SupervisedMedicationCardItem[] = [];

  private institutedMedications: PatientTreatmentData['institutedMedications'] = [];
  private currentDoseMedication = '';
  private treatmentStartDate = '';
  private slotRefreshTimer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      this.appointmentService.appointments();
      this.refreshSupervisedSchedule();
    });
  }

  get dueTodayCount(): number {
    return this.unsupervisedItems.filter((item) => item.isDueNow).length;
  }

  ngOnInit(): void {
    this.loadMedicationChecklist();
    this.slotRefreshTimer = setInterval(() => this.refreshUnsupervisedSlots(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.slotRefreshTimer) clearInterval(this.slotRefreshTimer);
  }

  loadMedicationChecklist(): void {
    this.isLoading = true;

    this.medicationDataService.getMedicationChecklist().subscribe({
      next: (response: MedicationChecklistResponse) => {
        this.canRegisterDoses = response.canRegisterDoses;
        this.loadError = '';
        this.currentDoseMedication = response.currentDoseMedication;
        this.treatmentStartDate = response.treatmentStartDate;
        this.institutedMedications = response.institutedMedications;
        this.unsupervisedItems = this.mapUnsupervisedItems(this.institutedMedications);
        this.refreshSupervisedSchedule();
        this.emitChecklistPayload();
        this.syncDailyMedicationProgress();
      },
      error: () => {
        this.loadError =
          'Não foi possível carregar os medicamentos. Preencha Meu tratamento no perfil.';
        this.institutedMedications = [];
        this.unsupervisedItems = [];
        this.supervisedItems = [];
        this.emitChecklistPayload();
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  toggleUnsupervised(id: string): void {
    const item = this.unsupervisedItems.find((entry) => entry.id === id);
    if (!item?.canToggle) return;

    if (item.checked) {
      this.intakeService.unmarkSlot(item.storageKey, item.slot.slotKey);
    } else {
      this.intakeService.markSlotTaken(item.storageKey, item.slot.slotKey);
    }

    this.unsupervisedItems = this.unsupervisedItems.map((entry) =>
      entry.id === id ? this.applySlotState(entry) : entry
    );

    this.emitChecklistPayload();
    this.syncDailyMedicationProgress();
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  private mapUnsupervisedItems(
    items: PatientTreatmentData['institutedMedications']
  ): MedicationDoseCardItem[] {
    return items.flatMap((item: InstitutedMedicationItem) => {
      const schedule = buildMedicationSchedule(item.frequency);
      const storageKey = this.intakeService.medicationKey(item.name);
      const slots = buildTodayDoseSlots(schedule.reminderTimes);
      const dosesPerDay = slots.length;
      const frequencyLabel = schedule.label.split(' · ')[0] ?? schedule.label;
      const subtitle = this.buildSubtitle(item.dose, item.unit);

      return slots.map((slot, index) => {
        const base: MedicationDoseCardItem = {
          storageKey,
          id: `${storageKey}_${slot.time}`,
          medicationName: item.name,
          title: item.name,
          subtitle,
          frequencyLabel,
          doseTime: slot.time,
          doseIndex: index + 1,
          dosesPerDay,
          slot,
          isDueNow: false,
          canToggle: false,
          checked: false,
          statusLabel: null,
          section: 'unsupervised',
          doseLabel: this.buildDoseLabel(item.dose, item.unit),
          nextSupervisedDoseLabel: null,
        };

        return this.applySlotState(base);
      });
    });
  }

  private applySlotState(item: MedicationDoseCardItem): MedicationDoseCardItem {
    const taken = this.intakeService.isSlotTaken(item.storageKey, item.slot.slotKey);
    const state = getDoseSlotIntakeState(item.slot, taken);

    return {
      ...item,
      checked: state.checked,
      canToggle: state.canToggle,
      isDueNow: state.isDueNow,
      statusLabel: state.statusLabel,
    };
  }

  private refreshSupervisedSchedule(): void {
    this.supervisedItems = this.mapSupervisedItems(
      this.currentDoseMedication,
      this.treatmentStartDate
    );
  }

  private refreshUnsupervisedSlots(): void {
    if (this.institutedMedications.length === 0) return;

    this.unsupervisedItems = this.mapUnsupervisedItems(this.institutedMedications);
    this.emitChecklistPayload();
    this.syncDailyMedicationProgress();
  }

  private mapSupervisedItems(
    value: PatientTreatmentData['currentDoseMedication'],
    treatmentStartDate: string
  ): SupervisedMedicationCardItem[] {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const storageKey = this.intakeService.medicationKey(`supervised:${trimmed}`);
    const lastSupervisedDoseDate = this.appointmentService.getLastSupervisedDoseDate();

    return [
      {
        storageKey,
        id: storageKey,
        title: trimmed,
        subtitle: '',
        scheduleLabel: '1 vez por mês · na unidade de saúde',
        doseLabel: 'Dose supervisionada',
        nextSupervisedDoseLabel: formatSupervisedDoseScheduleLabel(
          treatmentStartDate,
          lastSupervisedDoseDate
        ),
      },
    ];
  }

  private buildSubtitle(dose: string, unit: string): string {
    const parts = [dose?.trim(), unit?.trim()].filter(Boolean);
    return parts.join(' • ');
  }

  private buildDoseLabel(dose: string, unit: string): string {
    const parts = [dose?.trim(), unit?.trim()].filter(Boolean);
    return parts.join(' ');
  }

  private getTodayDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private syncDailyMedicationProgress(): void {
    const expectedCount = this.unsupervisedItems.length;
    const takenCount = this.unsupervisedItems.filter((item) => item.checked).length;

    this.dailyMedicationProgressService
      .upsert({
        progress_date: this.getTodayDate(),
        expected_count: expectedCount,
        taken_count: takenCount,
      })
      .subscribe({
        error: () => undefined,
      });
  }

  private emitChecklistPayload(): void {
    const unsupervisedCheckedCount = this.unsupervisedItems.filter((item) => item.checked).length;
    const unsupervisedTotalCount = this.unsupervisedItems.length;

    this.checklistChange.emit({
      checkedCount: unsupervisedCheckedCount,
      totalCount: unsupervisedTotalCount,
      unsupervisedCheckedCount,
      unsupervisedTotalCount,
      supervisedCheckedCount: 0,
      supervisedTotalCount: this.supervisedItems.length,
    });
  }
}