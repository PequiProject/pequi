import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-community-delete-confirm',
  standalone: true,
  templateUrl: './community-delete-confirm.html',
})
export class CommunityDeleteConfirm {
  readonly title = input.required<string>();
  readonly message = input('Esta ação não pode ser desfeita.');
  readonly confirmLabel = input('Excluir');
  readonly testId = input('delete-confirm-dialog');

  readonly cancel = output<void>();
  readonly confirm = output<void>();

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }
}
