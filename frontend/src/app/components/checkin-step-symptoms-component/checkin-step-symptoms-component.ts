import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

type SymptomOption = {
  value: string;
  label: string;
  selectedClass: string;
  unselectedClass: string;
};

@Component({
  selector: 'app-checkin-step-symptoms-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkin-step-symptoms-component.html',
  styleUrl: './checkin-step-symptoms-component.css',
})
export class CheckinStepSymptomsComponent {
  @Input({ required: true }) form!: FormGroup;

  readonly noSymptomsValue = 'nenhum sintoma';

  symptoms: SymptomOption[] = [
    {
      value: 'nenhum sintoma',
      label: 'Nenhum sintoma hoje',
      selectedClass: 'bg-[#C0B9FF] border-[#C0B9FF] text-white',
      unselectedClass: 'bg-[#4338CA] border-[#4338CA] opacity-80 text-white',
    },
    {
      value: 'dormencia',
      label: 'Dormência',
      selectedClass: 'bg-[#E9E3FF] border-[#CFC2FF] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F5F2FF] border-[#DDD3F8] text-[#44403C]',
    },
    {
      value: 'feridas na pele',
      label: 'Feridas na pele',
      selectedClass: 'bg-[#CFF2D9] border-[#A9E2BC] text-[#2F6B45]',
      unselectedClass: 'bg-[#EEF9F1] border-[#CBEBD4] text-[#44403C]',
    },
    {
      value: 'pele seca',
      label: 'Pele seca',
      selectedClass: 'bg-[#DFF1F5] border-[#BEDDE4] text-[#315C66]',
      unselectedClass: 'bg-[#EDF7F9] border-[#D2E8ED] text-[#44403C]',
    },
    {
      value: 'formigamento',
      label: 'Formigamento',
      selectedClass: 'bg-[#E9E3FF] border-[#CFC2FF] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F5F2FF] border-[#DDD3F8] text-[#44403C]',
    },
    {
      value: 'fraqueza muscular',
      label: 'Fraqueza muscular',
      selectedClass: 'bg-[#E4F4E4] border-[#CBE6CB] text-[#446044]',
      unselectedClass: 'bg-[#F2FAF2] border-[#DCECDC] text-[#44403C]',
    },
    {
      value: 'nodulos',
      label: 'Nódulos',
      selectedClass: 'bg-[#E3F1F5] border-[#C9E0E7] text-[#315C66]',
      unselectedClass: 'bg-[#EFF8FA] border-[#D9E9ED] text-[#44403C]',
    },
    {
      value: 'problemas de visao',
      label: 'Problemas de visão',
      selectedClass: 'bg-[#ECE9FF] border-[#D3CDF8] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F7F5FF] border-[#E2DCF8] text-[#44403C]',
    },
    {
      value: 'vermelhidao',
      label: 'Vermelhidão',
      selectedClass: 'bg-[#F9E6E6] border-[#EFCACA] text-[#8A4A4A]',
      unselectedClass: 'bg-[#FCF1F1] border-[#F1DADA] text-[#44403C]',
    },
    {
      value: 'mudança de cor da pele',
      label: 'Mudança de cor da pele',
      selectedClass: 'bg-[#F9E6E6] border-[#EFCACA] text-[#8A4A4A]',
      unselectedClass: 'bg-[#FCF1F1] border-[#F1DADA] text-[#44403C]',
    },
    {
      value: 'coceira',
      label: 'Coceira',
      selectedClass: 'bg-[#E3F1F5] border-[#C9E0E7] text-[#315C66]',
      unselectedClass: 'bg-[#EFF8FA] border-[#D9E9ED] text-[#44403C]',
    },
    {
      value: 'suor frio',
      label: 'Suor frio',
      selectedClass: 'bg-[#E4F4E4] border-[#CBE6CB] text-[#446044]',
      unselectedClass: 'bg-[#F2FAF2] border-[#DCECDC] text-[#44403C]',
    },
    {
      value: 'escamação',
      label: 'Escamação',
      selectedClass: 'bg-[#E9E3FF] border-[#CFC2FF] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F5F2FF] border-[#DDD3F8] text-[#44403C]',
    },
    {
      value: 'sangramento',
      label: 'Sangramento',
      selectedClass: 'bg-[#DFF1F5] border-[#BEDDE4] text-[#315C66]',
      unselectedClass: 'bg-[#EDF7F9] border-[#D2E8ED] text-[#44403C]',
    },
    {
      value: 'perda de sensibilidade na pele',
      label: 'Perda de sensibilidade na pele',
      selectedClass: 'bg-[#F9E6E6] border-[#EFCACA] text-[#8A4A4A]',
      unselectedClass: 'bg-[#FCF1F1] border-[#F1DADA] text-[#44403C]',
    },
  ];

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