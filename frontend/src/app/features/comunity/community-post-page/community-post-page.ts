import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { CommunityPostDetail } from '../components/community-post-detail/community-post-detail';
import { CommunityPostsService } from '../services/community-posts.service';
import { CommunityProfileService } from '../services/community-profile.service';

@Component({
  selector: 'app-community-post-page',
  standalone: true,
  imports: [CommunityPostDetail],
  templateUrl: './community-post-page.html',
})
export class CommunityPostPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileService = inject(CommunityProfileService);
  readonly postsService = inject(CommunityPostsService);

  private readonly postId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('postId'))),
    { initialValue: this.route.snapshot.paramMap.get('postId') }
  );

  readonly post = computed(() => {
    const id = this.postId();
    if (!id) return null;
    return this.postsService.getPostById(id) ?? null;
  });

  constructor() {
    if (!this.profileService.hasProfile()) {
      void this.router.navigate(['/comunity']);
      return;
    }

    const id = this.postId();
    if (id && !this.postsService.getPostById(id)) {
      void this.router.navigate(['/comunity/feed']);
    }
  }

  back(): void {
    void this.router.navigate(['/comunity/feed']);
  }

  onSupport(postId: string): void {
    this.postsService.toggleSupport(postId);
  }

  onAddComment(payload: { postId: string; content: string; parentCommentId?: string }): void {
    this.postsService.addComment(payload);
  }

  onDeleteComment(payload: {
    postId: string;
    commentId: string;
    parentCommentId?: string;
  }): void {
    this.postsService.deleteComment(payload);
  }
}
