import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { LucideAngularModule, LucideVenetianMask } from 'lucide-angular';

export type CommunityAuthorAvatarSize = 'sm' | 'md';

@Component({
  selector: 'app-community-author-avatar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './community-author-avatar.html',
})
export class CommunityAuthorAvatar {
  readonly initials = input.required<string>();
  readonly anonymous = input(false);
  readonly imageUrl = input<string | null>(null);
  readonly size = input<CommunityAuthorAvatarSize>('md');

  readonly LucideVenetianMask = LucideVenetianMask;

  readonly containerClass = computed(() => {
    const palette = this.anonymous()
      ? 'bg-[#EDE9FE] text-[#5B21B6]'
      : 'bg-[#E0E7FF] text-[#4338CA]';
    const dimensions =
      this.size() === 'sm'
        ? 'h-9 w-9 text-xs'
        : 'h-10 w-10 text-sm sm:h-11 sm:w-11';
    const overflow = this.imageUrl() ? 'overflow-hidden' : '';
    return `flex shrink-0 items-center justify-center rounded-full font-semibold ${palette} ${dimensions} ${overflow}`;
  });

  readonly iconSize = computed(() => (this.size() === 'sm' ? 16 : 18));
}
