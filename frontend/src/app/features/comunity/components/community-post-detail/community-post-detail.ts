import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LucideArrowLeft,
  LucideHeart,
  LucideSend,
  LucideTrash2,
  LucideX,
} from 'lucide-angular';
import type { CommunityAuthorMode, CommunityComment, CommunityPost } from '../../models/community.models';
import { CommunityProfileService } from '../../services/community-profile.service';
import { CommunityAuthorAvatar } from '../community-author-avatar/community-author-avatar';
import { CommunityAuthorModePicker } from '../community-author-mode-picker/community-author-mode-picker';
import { CommunityDeleteConfirm } from '../community-delete-confirm/community-delete-confirm';

export type AddCommentEvent = {
  postId: string;
  content: string;
  authorMode: CommunityAuthorMode;
  parentCommentId?: string;
  replyToAuthorName?: string;
};

export type DeleteCommentEvent = {
  postId: string;
  commentId: string;
};

@Component({
  selector: 'app-community-post-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    CommunityAuthorAvatar,
    CommunityAuthorModePicker,
    CommunityDeleteConfirm,
  ],
  templateUrl: './community-post-detail.html',
  styleUrl: './community-post-detail.css',
})
export class CommunityPostDetail {
  private readonly profileService = inject(CommunityProfileService);

  readonly post = input.required<CommunityPost>();

  readonly close = output<void>();
  readonly support = output<string>();
  readonly addComment = output<AddCommentEvent>();
  readonly deleteComment = output<DeleteCommentEvent>();
  readonly deletePost = output<string>();

  readonly commentDraft = signal('');
  readonly authorMode = signal<CommunityAuthorMode>(
    this.profileService.selectedProfile() === 'anonymous' ? 'anonymous' : 'public',
  );
  readonly replyingTo = signal<CommunityComment | null>(null);
  readonly pendingDelete = signal<DeleteCommentEvent | null>(null);
  readonly pendingPostDelete = signal(false);

  readonly commentPlaceholder = computed(() => {
    const target = this.replyingTo();
    if (!target) return 'Escrever comentário...';
    return `Responder ${target.authorName}...`;
  });

  readonly LucideArrowLeft = LucideArrowLeft;
  readonly LucideHeart = LucideHeart;
  readonly LucideSend = LucideSend;
  readonly LucideTrash2 = LucideTrash2;
  readonly LucideX = LucideX;

  onClose(): void {
    this.close.emit();
  }

  onSupport(): void {
    this.support.emit(this.post().id);
  }

  startReply(comment: CommunityComment): void {
    this.replyingTo.set(comment);
  }

  cancelReply(): void {
    this.replyingTo.set(null);
  }

  onAuthorModeChange(mode: CommunityAuthorMode): void {
    this.authorMode.set(mode);
  }

  submitComment(): void {
    const content = this.commentDraft().trim();
    if (!content) return;

    const parent = this.replyingTo();
    this.addComment.emit({
      postId: this.post().id,
      content,
      authorMode: this.authorMode(),
      parentCommentId: parent?.id,
      replyToAuthorName: parent?.authorName,
    });
    this.commentDraft.set('');
    this.replyingTo.set(null);
  }

  requestDelete(commentId: string): void {
    this.pendingDelete.set({
      postId: this.post().id,
      commentId,
    });
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const pending = this.pendingDelete();
    if (!pending) return;

    if (this.replyingTo()?.id === pending.commentId) {
      this.cancelReply();
    }

    this.deleteComment.emit(pending);
    this.pendingDelete.set(null);
  }

  requestPostDelete(): void {
    this.pendingPostDelete.set(true);
  }

  cancelPostDelete(): void {
    this.pendingPostDelete.set(false);
  }

  confirmPostDelete(): void {
    this.deletePost.emit(this.post().id);
    this.pendingPostDelete.set(false);
  }

  onCommentInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.commentDraft.set(target.value);
  }

  supportSummary(): string {
    const count = this.post().supportCount;
    return count === 1 ? '1 Acolhimento' : `${count} Acolhimentos`;
  }

  commentSummary(): string {
    const count = this.post().commentCount;
    return count === 1 ? '1 Comentário' : `${count} Comentários`;
  }

  trackComment(_index: number, comment: CommunityComment): string {
    return comment.id;
  }
}
