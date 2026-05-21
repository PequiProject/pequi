import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideAngularModule, LucideUserRound, LucideVenetianMask } from 'lucide-angular';
import type { CommunityAuthorMode } from '../../models/community.models';

type AuthorModeOption = {
  mode: CommunityAuthorMode;
  label: string;
  icon: typeof LucideUserRound | typeof LucideVenetianMask;
};

@Component({
  selector: 'app-community-author-mode-picker',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './community-author-mode-picker.html',
})
export class CommunityAuthorModePicker {
  readonly selected = input<CommunityAuthorMode>('public');
  readonly modeChange = output<CommunityAuthorMode>();

  readonly options: AuthorModeOption[] = [
    { mode: 'public', label: 'Perfil', icon: LucideUserRound },
    { mode: 'anonymous', label: 'Anônimo', icon: LucideVenetianMask },
  ];

  select(mode: CommunityAuthorMode): void {
    this.modeChange.emit(mode);
  }

  isSelected(mode: CommunityAuthorMode): boolean {
    return this.selected() === mode;
  }
}
