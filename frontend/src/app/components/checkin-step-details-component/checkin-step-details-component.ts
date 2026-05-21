import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-checkin-step-details-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkin-step-details-component.html',
  styleUrl: './checkin-step-details-component.css',
})
export class CheckinStepDetailsComponent {
  @Input({ required: true }) form!: FormGroup;
}