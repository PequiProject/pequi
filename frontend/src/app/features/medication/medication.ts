import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import type { PatientTreatmentData } from '../profile/models/patient-profile.models';
import {
  MedicationDataService,
  type MedicationChecklistResponse,
  type MedicationAlarmPayload,
  type MedicationAlarmConfig,
} from './services/medication-data.service';
import {
  Hospital,
  Pill,
  Clock3,
  Bell,
  X,
  LucideAngularModule,
} from 'lucide-angular';

type InstitutedMedicationItem = PatientTreatmentData['institutedMedications'][number];
type MedicationSection = 'unsupervised' | 'supervised';
type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface MedicationChecklistPayload {
  checkedCount: number;
  totalCount: number;
  unsupervisedCheckedCount: number;
  unsupervisedTotalCount: number;
  supervisedCheckedCount: number;
  supervisedTotalCount: number;
}

interface WeekdayOption {
  key: WeekdayKey;
  label: string;
  shortLabel: string;
}

interface MedicationCardItem {
  id: string;
  title: string;
  subtitle: string;
  checked: boolean;
  section: MedicationSection;
  doseLabel: string;
  alarmEnabled: boolean;
  alarmConfig: MedicationAlarmConfig;
}

@Component({
  selector: 'app-medication',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './medication.html',
  styleUrl: './medication.css',
})
export class Medication implements OnInit {
  private readonly medicationDataService = inject(MedicationDataService);

  readonly Pill = Pill;
  readonly Hospital = Hospital;
  readonly Clock3 = Clock3;
  readonly Bell = Bell;
  readonly X = X;

  @Output() checklistChange = new EventEmitter<MedicationChecklistPayload>();

  isLoading = false;

  unsupervisedItems: MedicationCardItem[] = [];
  supervisedItems: MedicationCardItem[] = [];

  isAlarmModalOpen = false;
  selectedMedicationId: string | null = null;
  selectedMedicationSection: MedicationSection | null = null;

  modalDraftDays: WeekdayKey[] = [];
  modalDraftTime = '08:00';

  readonly weekdays: WeekdayOption[] = [
    { key: 'monday', label: 'Segunda-feira', shortLabel: 'Seg' },
    { key: 'tuesday', label: 'Terça-feira', shortLabel: 'Ter' },
    { key: 'wednesday', label: 'Quarta-feira', shortLabel: 'Qua' },
    { key: 'thursday', label: 'Quinta-feira', shortLabel: 'Qui' },
    { key: 'friday', label: 'Sexta-feira', shortLabel: 'Sex' },
    { key: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
    { key: 'sunday', label: 'Domingo', shortLabel: 'Dom' },
  ];

  ngOnInit(): void {
    this.loadMedicationChecklist();
  }

  loadMedicationChecklist(): void {
    this.isLoading = true;

    this.medicationDataService.getMedicationChecklist().subscribe({
      next: (response: MedicationChecklistResponse) => {
        this.unsupervisedItems = this.mapUnsupervisedItems(response.institutedMedications);
        this.supervisedItems = this.mapSupervisedItem(response.currentDoseMedication);
        this.emitChecklistPayload();
      },
      error: () => {
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
    this.unsupervisedItems = this.unsupervisedItems.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );

    this.emitChecklistPayload();
  }

  toggleSupervised(id: string): void {
    this.supervisedItems = this.supervisedItems.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );

    this.emitChecklistPayload();
  }

  openAlarmModal(item: MedicationCardItem): void {
    this.isAlarmModalOpen = true;
    this.selectedMedicationId = item.id;
    this.selectedMedicationSection = item.section;
    this.modalDraftDays = [...item.alarmConfig.days];
    this.modalDraftTime = item.alarmConfig.time;
  }

  closeAlarmModal(): void {
    this.isAlarmModalOpen = false;
    this.selectedMedicationId = null;
    this.selectedMedicationSection = null;
    this.modalDraftDays = [];
    this.modalDraftTime = '08:00';
  }

  toggleModalDay(day: WeekdayKey): void {
    const alreadySelected = this.modalDraftDays.includes(day);

    this.modalDraftDays = alreadySelected
      ? this.modalDraftDays.filter(selectedDay => selectedDay !== day)
      : [...this.modalDraftDays, day];
  }

  saveAlarmConfig(): void {
    const item = this.getSelectedMedicationItem();

    if (!item) {
      return;
    }

    const normalizedDays = this.modalDraftDays.length
      ? [...this.modalDraftDays]
      : this.weekdays.map(day => day.key);

    const updatedItem: MedicationCardItem = {
      ...item,
      alarmEnabled: true,
      alarmConfig: {
        days: normalizedDays,
        time: this.modalDraftTime || '08:00',
      },
    };

    this.updateMedicationItem(updatedItem);

    const payload: MedicationAlarmPayload = {
      medicationName: updatedItem.title,
      dosage: updatedItem.doseLabel,
      message: `Está na hora de tomar o remédio ${updatedItem.title}.`,
      schedule: {
        days: updatedItem.alarmConfig.days,
        time: updatedItem.alarmConfig.time,
      },
    };

    this.medicationDataService.saveMedicationAlarm(payload).subscribe();
    this.closeAlarmModal();
  }

  getSelectedMedicationName(): string {
    return this.getSelectedMedicationItem()?.title ?? '';
  }

  isDaySelected(day: WeekdayKey): boolean {
    return this.modalDraftDays.includes(day);
  }

  trackById(_: number, item: MedicationCardItem): string {
    return item.id;
  }

  private getSelectedMedicationItem(): MedicationCardItem | null {
    if (!this.selectedMedicationId || !this.selectedMedicationSection) {
      return null;
    }

    const source =
      this.selectedMedicationSection === 'unsupervised'
        ? this.unsupervisedItems
        : this.supervisedItems;

    return source.find(item => item.id === this.selectedMedicationId) ?? null;
  }

  private updateMedicationItem(updatedItem: MedicationCardItem): void {
    if (updatedItem.section === 'unsupervised') {
      this.unsupervisedItems = this.unsupervisedItems.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      );
      return;
    }

    this.supervisedItems = this.supervisedItems.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
  }

  private mapUnsupervisedItems(
    items: PatientTreatmentData['institutedMedications']
  ): MedicationCardItem[] {
    return items.map((item: InstitutedMedicationItem) => {
      const doseLabel = this.buildDoseLabel(item.dose, item.unit);

      return {
        id: crypto.randomUUID(),
        title: item.name,
        subtitle: this.buildSubtitle(item.dose, item.unit, item.frequency),
        checked: false,
        section: 'unsupervised',
        doseLabel,
        alarmEnabled: true,
        alarmConfig: this.buildDefaultAlarmConfig(item.frequency),
      };
    });
  }

  private mapSupervisedItem(
    value: PatientTreatmentData['currentDoseMedication']
  ): MedicationCardItem[] {
    const trimmed = value.trim();

    if (!trimmed) return [];

    return [
      {
        id: crypto.randomUUID(),
        title: trimmed,
        subtitle: '',
        checked: false,
        section: 'supervised',
        doseLabel: 'Dose supervisionada',
        alarmEnabled: true,
        alarmConfig: this.buildDefaultAlarmConfig(),
      },
    ];
  }

  private buildSubtitle(dose: string, unit: string, frequency: string): string {
    const parts = [dose?.trim(), unit?.trim(), frequency?.trim()].filter(Boolean);
    return parts.join(' • ');
  }

  private buildDoseLabel(dose: string, unit: string): string {
    const parts = [dose?.trim(), unit?.trim()].filter(Boolean);
    return parts.join(' ');
  }

  private buildDefaultAlarmConfig(frequency?: string): MedicationAlarmConfig {
    return {
      days: this.weekdays.map(day => day.key),
      time: this.extractTimeFromFrequency(frequency),
    };
  }

  private extractTimeFromFrequency(frequency?: string): string {
    const value = frequency?.trim();

    if (!value) {
      return '08:00';
    }

    const match = value.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);

    if (!match) {
      return '08:00';
    }

    const [, hourRaw, minute, periodRaw] = match;
    const period = periodRaw.toUpperCase();
    let hour = Number(hourRaw);

    if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    if (period === 'PM' && hour < 12) {
      hour += 12;
    }

    return `${String(hour).padStart(2, '0')}:${minute}`;
  }

  private emitChecklistPayload(): void {
    const unsupervisedCheckedCount = this.unsupervisedItems.filter(item => item.checked).length;
    const unsupervisedTotalCount = this.unsupervisedItems.length;

    const supervisedCheckedCount = this.supervisedItems.filter(item => item.checked).length;
    const supervisedTotalCount = this.supervisedItems.length;

    this.checklistChange.emit({
      checkedCount: unsupervisedCheckedCount + supervisedCheckedCount,
      totalCount: unsupervisedTotalCount + supervisedTotalCount,
      unsupervisedCheckedCount,
      unsupervisedTotalCount,
      supervisedCheckedCount,
      supervisedTotalCount,
    });
  }
}