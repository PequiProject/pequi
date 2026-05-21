import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  LucideHeart,
  LucideShield,
  LucideUserRound,
  LucideUsers,
  LucideVenetianMask,
} from 'lucide-angular';
import {
  CommunityProfileService,
  type CommunityProfileMode,
} from './services/community-profile.service';

type Principle = {
  title: string;
  description: string;
  icon: typeof LucideShield;
  iconBg: string;
  iconColor: string;
};

type ProfileOption = {
  mode: CommunityProfileMode;
  title: string;
  description: string;
  icon: typeof LucideUserRound | typeof LucideVenetianMask;
};

@Component({
  selector: 'app-comunity',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './comunity.html',
})
export class Comunity {
  private readonly router = inject(Router);
  private readonly profileService = inject(CommunityProfileService);

  readonly LucideUsers = LucideUsers;

  readonly principles: Principle[] = [
    {
      title: 'Privacidade Garantida',
      description:
        'Você escolhe o que e com quem compartilhar. Seus dados estão protegidos.',
      icon: LucideShield,
      iconBg: 'bg-[#CAF9DC]',
      iconColor: 'text-[#436D57]',
    },
    {
      title: 'Empatia e Gentileza',
      description:
        'Tratamos todos com respeito. Não toleramos julgamentos ou discursos de ódio.',
      icon: LucideHeart,
      iconBg: 'bg-[#ADDEF6]',
      iconColor: 'text-[#396A7F]',
    },
  ];

  readonly profileOptions: ProfileOption[] = [
    {
      mode: 'public',
      title: 'Perfil Público',
      description:
        'Seu nome de exibição aparece nos posts e comentários da comunidade.',
      icon: LucideUserRound,
    },
    {
      mode: 'anonymous',
      title: 'Perfil Anônimo',
      description:
        'Participação com identificador anônimo. Ninguém vê seu nome real.',
      icon: LucideVenetianMask,
    },
  ];

  readonly selectedProfile = signal<CommunityProfileMode | null>(null);
  readonly showProfileError = signal(false);

  constructor() {
    if (this.profileService.hasProfile()) {
      void this.router.navigate(['/comunity/feed']);
    }
  }

  selectProfile(mode: CommunityProfileMode): void {
    this.selectedProfile.set(mode);
    this.showProfileError.set(false);
  }

  isProfileSelected(mode: CommunityProfileMode): boolean {
    return this.selectedProfile() === mode;
  }

  enter(): void {
    const profile = this.selectedProfile();
    if (!profile) {
      this.showProfileError.set(true);
      return;
    }

    this.profileService.save(profile);
    void this.router.navigate(['/comunity/feed']);
  }
}
