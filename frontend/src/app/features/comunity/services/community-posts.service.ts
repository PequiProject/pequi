import { Injectable, inject, signal } from '@angular/core';
import { MOCK_COMMUNITY_POSTS } from '../data/mock-posts';
import type { CommunityComment, CommunityPost } from '../models/community.models';
import { CommunityProfileService } from './community-profile.service';

export type AddCommentPayload = {
  postId: string;
  content: string;
  parentCommentId?: string;
};

export type DeleteCommentPayload = {
  postId: string;
  commentId: string;
  parentCommentId?: string;
};

@Injectable({ providedIn: 'root' })
export class CommunityPostsService {
  private readonly profileService = inject(CommunityProfileService);

  readonly posts = signal<CommunityPost[]>(MOCK_COMMUNITY_POSTS.map((p) => ({ ...p })));

  getPostById(id: string): CommunityPost | undefined {
    return this.posts().find((p) => p.id === id);
  }

  toggleSupport(postId: string): void {
    this.posts.update((list) =>
      list.map((post) => {
        if (post.id !== postId) return post;
        const isSupported = !post.isSupported;
        return {
          ...post,
          isSupported,
          supportCount: isSupported ? post.supportCount + 1 : Math.max(0, post.supportCount - 1),
        };
      })
    );
  }

  addComment(payload: AddCommentPayload): void {
    const authorLabel =
      this.profileService.selectedProfile() === 'anonymous' ? 'Você (anônimo)' : 'Você';

    const newComment: CommunityComment = {
      id: `local-${Date.now()}`,
      authorName: authorLabel,
      authorInitials: 'VC',
      content: payload.content,
      timeLabel: 'Agora',
      isOwn: true,
    };

    this.posts.update((list) =>
      list.map((post) => {
        if (post.id !== payload.postId) return post;

        if (!payload.parentCommentId) {
          return {
            ...post,
            comments: [...post.comments, newComment],
            commentCount: post.commentCount + 1,
          };
        }

        return {
          ...post,
          comments: post.comments.map((comment) => {
            if (comment.id !== payload.parentCommentId) return comment;
            return {
              ...comment,
              replies: [...(comment.replies ?? []), newComment],
            };
          }),
          commentCount: post.commentCount + 1,
        };
      })
    );
  }

  deleteComment(payload: DeleteCommentPayload): void {
    this.posts.update((list) =>
      list.map((post) => {
        if (post.id !== payload.postId) return post;

        if (!payload.parentCommentId) {
          const target = post.comments.find((c) => c.id === payload.commentId);
          if (!target?.isOwn) return post;

          return {
            ...post,
            comments: post.comments.filter((c) => c.id !== payload.commentId),
            commentCount: Math.max(0, post.commentCount - 1),
          };
        }

        const parent = post.comments.find((c) => c.id === payload.parentCommentId);
        const target = parent?.replies?.find((r) => r.id === payload.commentId);
        if (!target?.isOwn) return post;

        return {
          ...post,
          comments: post.comments.map((comment) => {
            if (comment.id !== payload.parentCommentId) return comment;
            return {
              ...comment,
              replies: (comment.replies ?? []).filter((r) => r.id !== payload.commentId),
            };
          }),
          commentCount: Math.max(0, post.commentCount - 1),
        };
      })
    );
  }
}
