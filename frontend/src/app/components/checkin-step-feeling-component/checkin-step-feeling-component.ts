import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

type MoodOption = {
  value: string;
  label: string;
  emoji: string;
  color: string;
  bars: number;
};

@Component({
  selector: 'app-checkin-step-feeling-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkin-step-feeling-component.html',
  styleUrl: './checkin-step-feeling-component.css',
})
export class CheckinStepFeelingComponent {
  @Input({ required: true }) form!: FormGroup;

  barSlots = Array.from({ length: 5 });

  moodOptions: MoodOption[] = [
    {
      value: 'great',
      label: 'Ótimo',
      emoji: '😄',
      color: 'bg-[#6B5CCF]',
      bars: 5,
    },
    {
      value: 'muito-bem',
      label: 'Muito Bem',
      emoji: '🙂',
      color: 'bg-[#5C9B7B]',
      bars: 4,
    },
    {
      value: 'ok',
      label: 'Bem',
      emoji: '😐',
      color: 'bg-[#C9A63A]',
      bars: 3,
    },
    {
      value: 'bad',
      label: 'Mal',
      emoji: '🙁',
      color: 'bg-[#D98A3A]',
      bars: 2,
    },
    {
      value: 'terrible',
      label: 'Terrível',
      emoji: '😔',
      color: 'bg-[#D95C5C]',
      bars: 1,
    },
  ];

  get showError(): boolean {
    const control = this.form.get('mood');
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  isSelected(value: string): boolean {
    return this.form.get('mood')?.value === value;
  }

  selectMood(value: string): void {
    this.form.get('mood')?.setValue(value);
    this.form.get('mood')?.markAsDirty();
    this.form.get('mood')?.markAsTouched();
  }
}