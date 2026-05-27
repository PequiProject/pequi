import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MedicationModel } from './../../models/medication-model';

export interface MedicationCheckPayload {
  checkedCount: number;
  totalCount: number;
}

@Component({
  selector: 'app-medication',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './medication.html',
  styleUrl: './medication.css',
})
export class Medication {
  @Input() medications: MedicationModel[] = [];

  @Output() checkSummaryChange = new EventEmitter<MedicationCheckPayload>();

  toggleChecked(id: string): void {
    this.medications = this.medications.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );

    this.emitCheckSummary();
  }

  private emitCheckSummary(): void {
    const checkedCount = this.medications.filter(item => item.checked).length;
    const totalCount = this.medications.length;

    this.checkSummaryChange.emit({
      checkedCount,
      totalCount,
    });
  }

  trackById(_: number, item: MedicationModel): string {
    return item.id;
  }
}