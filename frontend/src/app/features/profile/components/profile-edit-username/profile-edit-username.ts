import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, LucideX } from 'lucide-angular';
import { normalizeUsername, usernameValidator, USERNAME_SPACE_MESSAGE, USERNAME_VALIDATION_MESSAGE } from '../../../auth/username.utils';

@Component({
  selector: 'app-profile-edit-username',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule],
  templateUrl: './profile-edit-username.html',
})
export class ProfileEditUsername {
  private readonly fb = inject(FormBuilder);

  readonly initialUsername = input.required<string>();
  readonly saved = output<string>();
  readonly closed = output<void>();

  readonly LucideX = LucideX;
  readonly usernameHint = USERNAME_VALIDATION_MESSAGE;
  readonly usernameSpaceMessage = USERNAME_SPACE_MESSAGE;
  readonly showValidation = signal(false);
  readonly isSubmitting = signal(false);

  readonly form = this.fb.group({
    username: ['', [usernameValidator()]],
  });

  constructor() {
    effect(() => {
      this.form.patchValue({ username: this.initialUsername() }, { emitEvent: false });
    });
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    if (this.isSubmitting()) return;
    this.closed.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      this.showValidation.set(true);
      return;
    }

    const username = normalizeUsername(this.form.controls.username.value ?? '');
    this.isSubmitting.set(true);
    this.saved.emit(username);
  }

  finishSubmit(): void {
    this.isSubmitting.set(false);
  }
}
