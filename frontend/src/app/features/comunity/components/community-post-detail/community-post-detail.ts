import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideAngularModule,
  LucideArrowLeft,
  LucideHeart,
  LucideSend,
  LucideTrash2,
  LucideX,
} from 'lucide-angular';
import type { CommunityComment, CommunityPost } from '../../models/community.models';

export type AddCommentEvent = {
  postId: string;
  content: string;
  parentCommentId?: string;
};

export type DeleteCommentEvent = {
  postId: string;
  commentId: string;
  parentCommentId?: string;
};

@Component({
  selector: 'app-community-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './community-post-detail.html',
  styleUrl: './community-post-detail.css',
})
export class CommunityPostDetail {
  readonly post = input.required<CommunityPost>();

  readonly close = output<void>();
  readonly support = output<string>();
  readonly addComment = output<AddCommentEvent>();
  readonly deleteComment = output<DeleteCommentEvent>();

  readonly commentDraft = signal('');
  readonly replyingTo = signal<CommunityComment | null>(null);
  readonly pendingDelete = signal<DeleteCommentEvent | null>(null);

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

  submitComment(): void {
    const content = this.commentDraft().trim();
    if (!content) return;

    const parent = this.replyingTo();
    this.addComment.emit({
      postId: this.post().id,
      content,
      parentCommentId: parent?.id,
    });
    this.commentDraft.set('');
    this.replyingTo.set(null);
  }

  requestDelete(commentId: string, parentCommentId?: string): void {
    this.pendingDelete.set({
      postId: this.post().id,
      commentId,
      parentCommentId,
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

  trackReply(_index: number, reply: CommunityComment): string {
    return reply.id;
  }
}
