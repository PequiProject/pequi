import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, User, Plus, History } from 'lucide-angular';

export interface BodyMarker {
  x: number;
  y: number;
  view: 'front' | 'back';
  status: 'active' | 'review';
}

@Component({
  selector: 'app-photo-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './photo-register.html',
})
export class PhotoRegister {
  @Input() form!: FormGroup;

  currentView = signal<'front' | 'back'>('front');
  markers = signal<BodyMarker[]>([
    { x: 70, y: 45, view: 'front', status: 'active' },
    { x: 42, y: 75, view: 'front', status: 'review' },
  ]);

  readonly UserIcon = User;
  readonly PlusIcon = Plus;
  readonly HistoryIcon = History;

  setView(view: 'front' | 'back'): void {
    this.currentView.set(view);
  }

  addMarker(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const newMarker: BodyMarker = {
      x,
      y,
      view: this.currentView(),
      status: 'active',
    };

    this.markers.update((current) => [...current, newMarker]);

    this.form.get('markers')?.setValue(this.markers());
  }

  get visibleMarkers() {
    return this.markers().filter((m) => m.view === this.currentView());
  }

  get activeCount() {
    return this.markers().filter((m) => m.status === 'active').length;
  }
}
