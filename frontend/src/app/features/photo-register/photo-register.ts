import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, User, Plus, History, CircleCheck, Trash2 } from 'lucide-angular';

export interface BodyMarker {
  id: string;
  x: number;
  y: number;
  view: 'front' | 'back';
  status: 'active' | 'review' | 'cured';
  bodyPart: string;
}

@Component({
  selector: 'app-photo-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './photo-register.html',
})
export class PhotoRegister implements OnInit {
  private readonly fb = inject(FormBuilder);

  form!: FormGroup;
  currentView = signal<'front' | 'back'>('front');
  public selectedMarkerId = signal<string | null>(null);
  markers = signal<BodyMarker[]>([]);

  readonly UserIcon = User;
  readonly PlusIcon = Plus;
  readonly HistoryIcon = History;
  readonly CircleCheckIcon = CircleCheck;
  readonly TrashIcon = Trash2;
  ngOnInit() {
    this.form = this.fb.group({
      markers: [this.markers()]
    });
  }

  setView(view: 'front' | 'back'): void {
    this.currentView.set(view);
    this.selectedMarkerId.set(null);
  }

  private identifyBodyPart(x: number, y: number, view: 'front' | 'back'): string | null {
    if (x < 15 || x > 85) return null;

    if (view === 'front') {
      if (y >= 0 && y < 15) return 'Face';
      if (y >= 15 && y < 20) return 'Pescoço';
      if (y >= 20 && y < 35 && (x < 35 || x > 65)) return 'Ombros';
      if (y >= 35 && y < 65 && (x < 35 || x > 65)) return 'Braços';
      if (y >= 65 && y < 80 && (x < 35 || x > 65)) return 'Mãos';
      if (y >= 20 && y < 45) return 'Abdômen';
      if (y >= 45 && y < 55) return 'Quadril';
      if (y >= 55 && y < 75) return 'Pernas';
      if (y >= 75 && y < 85) return 'Joelhos';
      if (y >= 85 && y <= 100) return 'Pés';
    } else {
      if (y >= 0 && y < 15) return 'Couro cabeludo';
      if (y >= 15 && y < 20) return 'Nuca';
      if (y >= 20 && y < 45 && (x > 35 && x < 65)) return 'Costas';
      if (y >= 20 && y < 65 && (x < 35 || x > 65)) return 'Braços'; 
      if (y >= 45 && y < 60) return 'Glúteos';
      if (y >= 60 && y < 75) return 'Posterior das coxas';
      if (y >= 75 && y <= 100) return 'Panturrilhas';
    }
    
    return 'Local Indefinido';
  }

  addMarker(event: MouseEvent): void {
    if (this.selectedMarkerId() !== null) {
      this.selectedMarkerId.set(null);
      return;
    }

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    const bodyPart = this.identifyBodyPart(x, y, this.currentView());

    // Se a função retornar null (clique no fundo azul), não fazemos nada!
    if (!bodyPart) return;

    const newMarker: BodyMarker = {
      id: Date.now().toString(), // ID único para cada marcador
      x,
      y,
      view: this.currentView(),
      status: 'active',
      bodyPart
    };

    this.markers.update((current) => [...current, newMarker]);
    this.updateForm();
  }

  toggleMenu(event: MouseEvent, id: string) {
    event.stopPropagation(); // Impede que o clique adicione um novo marcador
    this.selectedMarkerId.set(this.selectedMarkerId() === id ? null : id);
  }

  markAsActive(id: string) {
    this.markers.update(current => 
      current.map(m => m.id === id ? { ...m, status: 'active' } : m)
    );
    this.selectedMarkerId.set(null);
    this.updateForm();
  }

  markAsCured(id: string) {
    this.markers.update(current => 
      current.map(m => m.id === id ? { ...m, status: 'cured' } : m)
    );
    this.selectedMarkerId.set(null);
    this.updateForm();
  }

  removeMarker(id: string) {
    this.markers.update(current => current.filter(m => m.id !== id));
    this.selectedMarkerId.set(null);
    this.updateForm();
  }

  private updateForm() {
    this.form.get('markers')?.setValue(this.markers());
  }

  get visibleMarkers() {
    return this.markers().filter((m) => m.view === this.currentView());
  }

  get activeCount() {
    return this.markers().filter((m) => m.status === 'active' || m.status === 'review').length;
  }

  get curedCount() {
    return this.markers().filter((m) => m.status === 'cured').length;
  }
}
