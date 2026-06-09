import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule, User, Plus, History, CircleCheck, Trash2, Camera, ChevronDown, ChevronUp } from 'lucide-angular';
import { BodyMapService } from './services/body-map.service'; 
import type { BodyArea, BodyMapFinding } from '../../models/body-map.models'; 

export interface BodyMarker {
  id: string; 
  x: number;
  y: number;
  view: 'front' | 'back';
  status: 'active' | 'review' | 'cured';
  bodyPart: string;
  imageUrl?: string;
  backendAreaId?: string;
}

@Component({
  selector: 'app-photo-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './photo-register.html',
})
export class PhotoRegister implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly bodyMapService = inject(BodyMapService);

  form!: FormGroup;
  currentView = signal<'front' | 'back'>('front');
  public selectedMarkerId = signal<string | null>(null);
  private uploadingMarkerId: string | null = null;
  
  markers = signal<BodyMarker[]>([]);
  backendAreas = signal<BodyArea[]>([]);
  
  isActivesExpanded = signal(false);
  isCuredExpanded = signal(false);

  readonly UserIcon = User;
  readonly PlusIcon = Plus;
  readonly HistoryIcon = History;
  readonly CircleCheckIcon = CircleCheck;
  readonly TrashIcon = Trash2;
  readonly CameraIcon = Camera;
  readonly ChevronDownIcon = ChevronDown;
  readonly ChevronUpIcon = ChevronUp;

  private readonly defaultCoordinates: Record<string, { x: number, y: number, view: 'front'|'back' }> = {
    'Face': { x: 50, y: 10, view: 'front' },
    'Pescoço': { x: 50, y: 17, view: 'front' },
    'Ombros': { x: 25, y: 25, view: 'front' }, 
    'Braços': { x: 20, y: 50, view: 'front' },
    'Mãos': { x: 15, y: 75, view: 'front' },
    'Abdômen': { x: 50, y: 35, view: 'front' },
    'Quadril': { x: 50, y: 50, view: 'front' },
    'Pernas': { x: 35, y: 65, view: 'front' },
    'Joelhos': { x: 35, y: 80, view: 'front' },
    'Pés': { x: 35, y: 95, view: 'front' },
    'Couro cabeludo': { x: 50, y: 8, view: 'back' },
    'Nuca': { x: 50, y: 17, view: 'back' },
    'Costas': { x: 50, y: 35, view: 'back' },
    'Glúteos': { x: 50, y: 52, view: 'back' },
    'Posterior das coxas': { x: 35, y: 65, view: 'back' },
    'Panturrilhas': { x: 35, y: 85, view: 'back' }
  };

  ngOnInit() {
    this.form = this.fb.group({
      markers: [this.markers()]
    });
    this.loadData();
  }

  private loadData() {
    this.bodyMapService.listBodyAreas().subscribe({
      next: (areas) => {
        console.log('LISTA DO BANCO DE DADOS:', JSON.stringify(areas, null, 2));
        this.backendAreas.set(areas);
        this.loadPatientMap();
      }
    });
  }

  private loadPatientMap() {
    this.bodyMapService.getBodyMap().subscribe({
      next: (findings: BodyMapFinding[]) => {
        const loadedMarkers: BodyMarker[] = findings.map(finding => {
          const coords = this.defaultCoordinates[finding.body_area.label] || { x: 50, y: 50, view: 'front' };
          
          return {
            id: finding.id,
            backendAreaId: finding.body_area_id,
            x: coords.x,
            y: coords.y,
            view: coords.view,
            status: finding.intensity === 0 ? 'cured' : 'active',
            bodyPart: finding.body_area.label,
            imageUrl: finding.image_url
          };
        });

        this.markers.set(loadedMarkers);
        this.updateForm();
      }
    });
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

    const bodyPartName = this.identifyBodyPart(x, y, this.currentView());

    if (!bodyPartName || bodyPartName === 'Local Indefinido') return;

    const backendArea = this.backendAreas().find(a => 
      a.label.toLowerCase().includes(bodyPartName.toLowerCase()) || 
      bodyPartName.toLowerCase().includes(a.label.toLowerCase())
    );

    const tempId = Date.now().toString();
    const newMarker: BodyMarker = {
      id: tempId,
      backendAreaId: backendArea?.id,
      x,
      y,
      view: this.currentView(),
      status: 'active',
      bodyPart: bodyPartName 
    };

    this.markers.update((current) => [...current, newMarker]);
    this.updateForm();

    if (backendArea) {
      const payload = {
        entries: [
          {
            body_area_id: backendArea.id,
            finding_type: 'lesion', 
            intensity: 1,
          }
        ]
      };

      this.bodyMapService.updateBodyMap(payload).subscribe({
        next: (savedFinding) => {
          this.markers.update(current => 
            current.map(m => m.id === tempId ? { ...m, id: savedFinding.id } : m)
          );
        },
        error: (err) => {
          console.error('Erro ao salvar no banco de dados:', err);
        }
      });
    } else {
      console.warn(`O local "${bodyPartName}" foi desenhado na tela, mas não encontrou correspondência no catálogo do banco para ser salvo.`);
    }
  }

  removeMarker(id: string) {
    const marker = this.markers().find(m => m.id === id);
    if (marker && marker.backendAreaId) {
      const payload = {
        entries: [
          {
            body_area_id: marker.backendAreaId,
            finding_type: 'lesion',
            intensity: 0
          }
        ]
      };

      this.bodyMapService.updateBodyMap(payload).subscribe({
        next: () => {
          this.markers.update(current => current.filter(m => m.id !== id));
          this.selectedMarkerId.set(null);
          this.updateForm();
        },
        error: (err) => console.error('Erro ao remover local no backend:', err)
      });
    } else {
      this.markers.update(current => current.filter(m => m.id !== id));
      this.selectedMarkerId.set(null);
      this.updateForm();
    }
  }

  handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !this.uploadingMarkerId) return;
    
    const file = input.files[0];
    const markerId = this.uploadingMarkerId; 

    // 6.1 Pede pro backend uma URL de upload
    this.bodyMapService.createUploadUrl({ 
      filename: file.name,
      content_type: file.type
    }).subscribe({
      next: (response: any) => {
        
        // Usando as chaves exatas que descobrimos!
        const targetUploadUrl = response.upload_url;
        const targetFileUrl = response.public_url;
        const imageKey = response.file_key;

        // 6.2 Faz o upload usando a URL
        fetch(targetUploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        }).then((res) => {
          
          if (!res.ok) {
             throw new Error(`Upload falhou com status: ${res.status}`);
          }

          const marker = this.markers().find(m => m.id === markerId);
          
          if (marker && marker.backendAreaId) {
            const updatePayload = {
              entries: [
                {
                  body_area_id: marker.backendAreaId,
                  finding_type: 'lesion',
                  intensity: 1,
                  image_key: imageKey 
                }
              ]
            };

            this.bodyMapService.updateBodyMap(updatePayload).subscribe({
              next: () => {
                this.markers.update(current => 
                  current.map(m => m.id === markerId ? { ...m, imageUrl: targetFileUrl } : m)
                );
                this.updateForm();
              },
              error: (err) => console.error('Erro ao vincular imagem ao marcador:', err)
            });
          }
          
          this.uploadingMarkerId = null;
        }).catch(err => console.error('Falha no upload da imagem no storage', err));
      },
      error: (err) => console.error('Erro ao pedir URL de upload', err)
    });
  }

  toggleAtivos() { this.isActivesExpanded.set(!this.isActivesExpanded()); }
  toggleCurados() { this.isCuredExpanded.set(!this.isCuredExpanded()); }
  setView(view: 'front' | 'back'): void { this.currentView.set(view); this.selectedMarkerId.set(null); }
  toggleMenu(event: MouseEvent, id: string) { event.stopPropagation(); this.selectedMarkerId.set(this.selectedMarkerId() === id ? null : id); }
  
  markAsActive(id: string) {
    const marker = this.markers().find(m => m.id === id);
    
    if (marker && marker.backendAreaId) {
      const payload = {
        entries: [
          {
            body_area_id: marker.backendAreaId,
            finding_type: 'lesion',
            intensity: 1 
          }
        ]
      };

      this.bodyMapService.updateBodyMap(payload).subscribe({
        next: () => {
          this.markers.update(current => 
            current.map(m => m.id === id ? { ...m, status: 'active' } : m)
          );
          this.selectedMarkerId.set(null);
          this.updateForm();
        },
        error: (err) => console.error('Erro ao reativar local no backend:', err)
      });
    } else {
      this.markers.update(current => 
        current.map(m => m.id === id ? { ...m, status: 'active' } : m)
      );
      this.selectedMarkerId.set(null);
      this.updateForm();
    }
  }
  
  markAsCured(id: string) {
    const marker = this.markers().find(m => m.id === id);
    if (marker && marker.backendAreaId) {
      const payload = {
        entries: [
          {
            body_area_id: marker.backendAreaId,
            finding_type: 'lesion',
            intensity: 0 
          }
        ]
      };

      this.bodyMapService.updateBodyMap(payload).subscribe({
        next: () => {
          this.markers.update(current => 
            current.map(m => m.id === id ? { ...m, status: 'cured' } : m)
          );
          this.selectedMarkerId.set(null);
          this.updateForm();
        },
        error: (err) => console.error('Erro ao curar local no backend:', err)
      });
    }
  }

  triggerImageUpload(id: string) {
    this.uploadingMarkerId = id;
    const fileInput = document.getElementById('marker-photo-upload') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  private updateForm() { this.form.get('markers')?.setValue(this.markers()); }

  get visibleMarkers() { return this.markers().filter((m) => m.view === this.currentView()); }
  get activeCount() { return this.markers().filter((m) => m.status === 'active' || m.status === 'review').length; }
  get curedCount() { return this.markers().filter((m) => m.status === 'cured').length; }
  get activeMarkersList() { return this.markers().filter(m => m.status === 'active' || m.status === 'review'); }
  get curedMarkersList() { return this.markers().filter(m => m.status === 'cured'); }
}
