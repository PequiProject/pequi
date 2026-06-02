import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

type IntensityVisual = {
  label: string;
  description: string;
  circleClass: string;
  valueClass: string;
  labelClass: string;
  activeColor: string;
};

@Component({
  selector: 'app-checkin-step-intensity-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkin-step-intensity-component.html',
  styleUrl: './checkin-step-intensity-component.css',
})
export class CheckinStepIntensityComponent {
  @Input({ required: true }) form!: FormGroup;

  get scaleValue(): number | null {
    return this.form.get('scale')?.value ?? null;
  }

  get hasSelectedIntensity(): boolean {
    return this.scaleValue !== null;
  }

  get displayScaleValue(): string {
    return this.scaleValue === null ? '' : String(this.scaleValue);
  }

  get sliderValue(): number {
    return this.scaleValue ?? 1;
  }

  get showError(): boolean {
    const control = this.form.get('scale');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  get hasNoSymptomsIntensity(): boolean {
    return this.scaleValue === 1;
  }

  get intensityVisual(): IntensityVisual {
    const value = this.scaleValue;

    if (value === null) {
      return {
        label: 'Selecione',
        description: 'Escolha um valor de 1 a 10',
        circleClass: 'border-[#D9D4CE] bg-[#F7F5F1]',
        valueClass: 'text-[#9A968F]',
        labelClass: 'text-[#9A968F]',
        activeColor: '#D9D4CE',
      };
    }

    if (value <= 3) {
      return {
        label: value === 1 ? 'Nenhuma' : 'Leve',
        description: 'Sintomas leves',
        circleClass: 'border-[#5A7B63] bg-[#F1F0EA]',
        valueClass: 'text-[#5A7B63]',
        labelClass: 'text-[#5A7B63]',
        activeColor: '#5A7B63',
      };
    }

    if (value <= 6) {
      return {
        label: 'Moderada',
        description: 'Atenção aos sinais',
        circleClass: 'border-[#C47B33] bg-[#F7EFE4]',
        valueClass: 'text-[#C47B33]',
        labelClass: 'text-[#C47B33]',
        activeColor: '#C47B33',
      };
    }

    return {
      label: 'Severa',
      description: 'Impacto elevado',
      circleClass: 'border-[#B05A5A] bg-[#F8EAEA]',
      valueClass: 'text-[#B05A5A]',
      labelClass: 'text-[#B05A5A]',
      activeColor: '#B05A5A',
    };
  }

  get intensityLabel(): string {
    return this.intensityVisual.label;
  }

  get intensityDescription(): string {
    return this.intensityVisual.description;
  }

  get sliderFillPercentage(): number {
    return ((this.sliderValue - 1) / 9) * 100;
  }

  get sliderTrackStyle(): string {
    const fill = this.sliderFillPercentage;
    const active = this.intensityVisual.activeColor;
    const inactive = '#D9D4CE';

    return `linear-gradient(to right, ${active} 0%, ${active} ${fill}%, ${inactive} ${fill}%, ${inactive} 100%)`;
  }

  onScaleChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);

    this.form.get('scale')?.setValue(value);
    this.form.get('scale')?.markAsDirty();
    this.form.get('scale')?.markAsTouched();
  }
}