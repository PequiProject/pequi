import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import type { PatientTreatmentData } from '../profile/models/patient-profile.models';
import {
  MedicationDataService,
  type MedicationChecklistResponse,
} from './services/medication-data.service';
import { Hospital, Pill, LucideAngularModule } from 'lucide-angular';
 
type InstitutedMedicationItem = PatientTreatmentData['institutedMedications'][number];

export interface MedicationChecklistPayload {
  checkedCount: number;
  totalCount: number;
  unsupervisedCheckedCount: number;
  unsupervisedTotalCount: number;
  supervisedCheckedCount: number;
  supervisedTotalCount: number;
}

interface MedicationCardItem {
  id: string;
  title: string;
  subtitle: string;
  checked: boolean;
  section: 'unsupervised' | 'supervised';
}

@Component({
  selector: 'app-medication',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './medication.html',
  styleUrl: './medication.css',
})
export class Medication implements OnInit {
  private readonly medicationDataService = inject(MedicationDataService);
  readonly Pill = Pill;
  readonly Hospital = Hospital;


  @Output() checklistChange = new EventEmitter<MedicationChecklistPayload>();

  isLoading = false;

  unsupervisedItems: MedicationCardItem[] = [];
  supervisedItems: MedicationCardItem[] = [];

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

  trackById(_: number, item: MedicationCardItem): string {
    return item.id;
  }

  private mapUnsupervisedItems(
    items: PatientTreatmentData['institutedMedications']
  ): MedicationCardItem[] {
    return items.map((item: InstitutedMedicationItem) => ({
      id: crypto.randomUUID(),
      title: item.name,
      subtitle: this.buildSubtitle(item.dose, item.unit, item.frequency),
      checked: false,
      section: 'unsupervised',
    }));
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
      },
    ];
  }

  private buildSubtitle(dose: string, unit: string, frequency: string): string {
    const parts = [dose?.trim(), unit?.trim(), frequency?.trim()].filter(Boolean);
    return parts.join(' • ');
  }

  private emitChecklistPayload(): void {
    const unsupervisedCheckedCount = this.unsupervisedItems.filter(item => item.checked).length;
    const unsupervisedTotalCount = this.unsupervisedItems.length;

    const supervisedCheckedCount = this.supervisedItems.filter(item => item.checked).length;
    const supervisedTotalCount = this.supervisedItems.length;
     
    console.log('NÃO SUPERVISIONADA: ', unsupervisedCheckedCount)
    console.log('NÃO SUPERVISIONADA TOTAL: ', unsupervisedTotalCount)

    console.log('SUPERVISIONADA: ', supervisedCheckedCount)
    console.log('SUPERVISIONADA TOTAL: ', supervisedTotalCount)


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