import { Injectable, computed, signal } from '@angular/core';

export type CommunityProfileMode = 'public' | 'anonymous';

const PROFILE_STORAGE_KEY = 'pequi-community-profile-mode';

@Injectable({ providedIn: 'root' })
export class CommunityProfileService {
  readonly selectedProfile = signal<CommunityProfileMode | null>(this.loadFromStorage());

  readonly selectedProfileLabel = computed(() => {
    const mode = this.selectedProfile();
    if (mode === 'public') return 'Perfil público';
    if (mode === 'anonymous') return 'Perfil anônimo';
    return '';
  });

  hasProfile(): boolean {
    return this.selectedProfile() !== null;
  }

  save(mode: CommunityProfileMode): void {
    this.selectedProfile.set(mode);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, mode);
    } catch {
      /* storage indisponível */
    }
  }

  clear(): void {
    this.selectedProfile.set(null);
    try {
      localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      /* storage indisponível */
    }
  }

  private loadFromStorage(): CommunityProfileMode | null {
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (stored === 'public' || stored === 'anonymous') return stored;
    } catch {
      /* storage indisponível */
    }
    return null;
  }
}
