import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { ToastService } from '../../../components/toast/toast.service';
import { getApiErrorMessage } from '../../../core/api-error.utils';
import { CommunityPostDetail } from '../components/community-post-detail/community-post-detail';
import type { CommunityAuthorMode } from '../models/community.models';
import { CommunityPostsService } from '../services/community-posts.service';
import { CommunityProfileService } from '../services/community-profile.service';

@Component({
  selector: 'app-community-post-page',
  standalone: true,
  imports: [CommunityPostDetail],
  templateUrl: './community-post-page.html',
})
export class CommunityPostPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly profileService = inject(CommunityProfileService);
  readonly postsService = inject(CommunityPostsService);

  readonly loading = signal(true);

  private readonly postId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('postId'))),
    { initialValue: this.route.snapshot.paramMap.get('postId') },
  );

  readonly post = computed(() => {
    const id = this.postId();
    if (!id) return null;
    return this.postsService.getPostById(id) ?? null;
  });

  constructor() {
    if (!this.profileService.hasProfile()) {
      void this.router.navigate(['/comunity']);
    }
  }

  ngOnInit(): void {
    const id = this.postId();
    if (!id) {
      void this.router.navigate(['/comunity/feed']);
      return;
    }

    this.loading.set(true);
    this.postsService.loadPostDetail(id).subscribe({
      next: () => this.loading.set(false),
      error: (error) => {
        this.loading.set(false);
        this.toast.error(
          'Erro ao carregar post',
          getApiErrorMessage(error, 'Tente novamente em instantes.'),
        );
        void this.router.navigate(['/comunity/feed']);
      },
    });
  }

  back(): void {
    void this.router.navigate(['/comunity/feed']);
  }

  onSupport(postId: string): void {
    this.postsService.toggleSupport(postId).subscribe({
      error: (error) => {
        this.toast.error(
          'Erro ao acolher post',
          getApiErrorMessage(error, 'Tente novamente em instantes.'),
        );
      },
    });
  }

  onAddComment(payload: {
    postId: string;
    content: string;
    authorMode: CommunityAuthorMode;
    parentCommentId?: string;
    replyToAuthorName?: string;
  }): void {
    this.postsService.addComment(payload).subscribe({
      next: () => this.toast.success('Comentário publicado!'),
      error: (error) => {
        this.toast.error(
          'Erro ao comentar',
          getApiErrorMessage(error, 'Revise o texto e tente novamente.'),
        );
      },
    });
  }

  onDeleteComment(payload: { postId: string; commentId: string }): void {
    this.postsService.deleteComment(payload).subscribe({
      next: () => this.toast.success('Comentário excluído.'),
      error: (error) => {
        this.toast.error(
          'Erro ao excluir comentário',
          getApiErrorMessage(error, 'Tente novamente em instantes.'),
        );
      },
    });
  }

  onDeletePost(postId: string): void {
    this.postsService.deletePost(postId).subscribe({
      next: () => {
        this.toast.success('Post excluído.');
        void this.router.navigate(['/comunity/feed']);
      },
      error: (error) => {
        this.toast.error(
          'Erro ao excluir post',
          getApiErrorMessage(error, 'Tente novamente em instantes.'),
        );
      },
    });
  }
}
