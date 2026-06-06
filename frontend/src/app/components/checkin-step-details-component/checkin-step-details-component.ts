import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, ImagePlus, Trash2 } from 'lucide-angular';

export interface CheckinImage {
  file: File;
  previewUrl: string;
}

@Component({
  selector: 'app-checkin-step-details-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './checkin-step-details-component.html',
  styleUrl: './checkin-step-details-component.css',
})
export class CheckinStepDetailsComponent {
  @Input({ required: true }) form!: FormGroup;

  readonly ImagePlusIcon = ImagePlus;
  readonly TrashIcon = Trash2;

  images = signal<CheckinImage[]>([]);

  triggerFileInput(): void {
    const fileInput = document.getElementById('checkin-image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const fileArray = Array.from(input.files);

      fileArray.forEach((file) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const previewUrl = e.target?.result as string;
          this.images.update(current => [...current, { file, previewUrl }]);
          this.updateForm();
        };

        reader.readAsDataURL(file);
      });
    }

    input.value = '';
  }

  removeImage(index: number): void {
    this.images.update(current => current.filter((_, i) => i !== index));
    this.updateForm();
  }

  private updateForm(): void {
    const imageFiles = this.images().map(image => image.file);
    this.form.get('images')?.setValue(imageFiles);
  }
}