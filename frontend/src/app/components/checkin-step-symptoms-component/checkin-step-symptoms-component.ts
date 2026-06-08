import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import type { SymptomOption } from '../../features/checkin/models/checkin.models';

@Component({
  selector: 'app-checkin-step-symptoms-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkin-step-symptoms-component.html',
  styleUrl: './checkin-step-symptoms-component.css',
})
export class CheckinStepSymptomsComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) symptoms: SymptomOption[] = [];
  @Input() loading = false;

  readonly noSymptomsValue = 'nenhum sintoma';

  get selectedSymptoms(): string[] {
    return this.form.get('selectedSymptoms')?.value ?? [];
  }

  get customSymptomControl() {
    return this.form.get('customSymptom');
  }

  get showError(): boolean {
    const control = this.form.get('selectedSymptoms');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get hasNoSymptomsSelected(): boolean {
    return this.selectedSymptoms.includes(this.noSymptomsValue);
  }

  isSelected(symptomValue: string): boolean {
    return this.selectedSymptoms.includes(symptomValue);
  }

  toggleSymptom(symptomValue: string): void {
    if (symptomValue === this.noSymptomsValue) {
      const isAlreadySelected = this.hasNoSymptomsSelected;
      const updated = isAlreadySelected ? [] : [this.noSymptomsValue];

      this.updateSelectedSymptoms(updated);
      return;
    }

    const current = this.selectedSymptoms.filter(item => item !== this.noSymptomsValue);
    const exists = current.includes(symptomValue);

    const updated = exists
      ? current.filter(item => item !== symptomValue)
      : [...current, symptomValue];

    this.updateSelectedSymptoms(updated);
  }

  addCustomSymptom(): void {
    const rawValue = this.customSymptomControl?.value ?? '';
    const normalized = this.normalizeSymptom(rawValue);

    if (!normalized) {
      return;
    }

    const current = this.selectedSymptoms.filter(item => item !== this.noSymptomsValue);

    if (!current.includes(normalized)) {
      this.updateSelectedSymptoms([...current, normalized]);
    }

    this.customSymptomControl?.setValue('');
    this.customSymptomControl?.markAsPristine();
    this.customSymptomControl?.markAsUntouched();
  }

  removeSymptom(symptomValue: string): void {
    const updated = this.selectedSymptoms.filter(item => item !== symptomValue);
    this.updateSelectedSymptoms(updated);
  }

  private updateSelectedSymptoms(values: string[]): void {
    this.form.get('selectedSymptoms')?.setValue(values);
    this.form.get('selectedSymptoms')?.markAsDirty();
    this.form.get('selectedSymptoms')?.markAsTouched();
  }

  private normalizeSymptom(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }
}