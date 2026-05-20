import { Injectable, inject, signal } from '@angular/core';
import { labelsForCategories } from '../data/community-categories';
import { MOCK_COMMUNITY_POSTS } from '../data/mock-posts';
import type {
  CommunityAuthorMode,
  CommunityComment,
  CommunityPost,
  CreatePostFormValue,
} from '../models/community.models';
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

function authorLabelForMode(mode: CommunityAuthorMode): string {
  return mode === 'anonymous' ? 'Você (anônimo)' : 'Você';
}

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

  createPost(payload: CreatePostFormValue): CommunityPost {
    const newPost: CommunityPost = {
      id: `local-post-${Date.now()}`,
      authorName: authorLabelForMode(payload.authorMode),
      authorInitials: 'VC',
      title: payload.title.trim(),
      description: payload.description.trim(),
      categories: payload.categories,
      categoryLabels: labelsForCategories(payload.categories),
      timeLabel: 'Agora',
      supportCount: 0,
      isSupported: false,
      commentCount: 0,
      comments: [],
      isOwn: true,
      isAnonymous: payload.authorMode === 'anonymous',
    };

    this.posts.update((list) => [newPost, ...list]);
    return newPost;
  }

  deletePost(postId: string): void {
    this.posts.update((list) => {
      const target = list.find((p) => p.id === postId);
      if (!target?.isOwn) return list;
      return list.filter((p) => p.id !== postId);
    });
  }

  addComment(payload: AddCommentPayload): void {
    const profile = this.profileService.selectedProfile();
    const isAnonymous = profile === 'anonymous';
    const authorLabel = authorLabelForMode(isAnonymous ? 'anonymous' : 'public');

    const newComment: CommunityComment = {
      id: `local-${Date.now()}`,
      authorName: authorLabel,
      authorInitials: 'VC',
      content: payload.content,
      timeLabel: 'Agora',
      isOwn: true,
      isAnonymous,
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
