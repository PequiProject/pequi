import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  LucideAngularModule,
  LucideHeart,
  LucideMessageSquare,
  LucideTrash2,
} from 'lucide-angular';
import type { CommunityPost } from '../../models/community.models';
import { CommunityAuthorAvatar } from '../community-author-avatar/community-author-avatar';

@Component({
  selector: 'app-community-post-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CommunityAuthorAvatar],
  templateUrl: './community-post-card.html',
  styleUrl: './community-post-card.css',
})
export class CommunityPostCard {
  readonly post = input.required<CommunityPost>();

  readonly support = output<string>();
  readonly comment = output<string>();
  readonly deletePost = output<string>();

  readonly LucideHeart = LucideHeart;
  readonly LucideMessageSquare = LucideMessageSquare;
  readonly LucideTrash2 = LucideTrash2;

  onSupport(event: Event): void {
    event.stopPropagation();
    this.support.emit(this.post().id);
  }

  onOpenPost(): void {
    this.comment.emit(this.post().id);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.deletePost.emit(this.post().id);
  }

  commentCountLabel(): string {
    const count = this.post().commentCount;
    return count === 1 ? '1 comentário' : `${count} comentários`;
  }
}
