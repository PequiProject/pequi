import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  LucideAngularModule,
  LucideHeart,
  LucideMessageSquare,
  LucideMoreHorizontal,
} from 'lucide-angular';
import type { CommunityPost } from '../../models/community.models';

@Component({
  selector: 'app-community-post-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './community-post-card.html',
  styleUrl: './community-post-card.css',
})
export class CommunityPostCard {
  readonly post = input.required<CommunityPost>();

  readonly support = output<string>();
  readonly comment = output<string>();

  readonly LucideHeart = LucideHeart;
  readonly LucideMessageSquare = LucideMessageSquare;
  readonly LucideMoreHorizontal = LucideMoreHorizontal;

  onSupport(): void {
    this.support.emit(this.post().id);
  }

  onComment(): void {
    this.comment.emit(this.post().id);
  }

}
