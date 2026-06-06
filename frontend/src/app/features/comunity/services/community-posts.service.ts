import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth-service';
import { PatientProfileService } from '../../profile/services/patient-profile.service';
import type {
  CommentListResponse,
  CommentResponse,
  LikeResponse,
  PostListResponse,
  PostResponse,
} from '../models/community-api.models';
import type {
  CommunityAuthorMode,
  CommunityComment,
  CommunityFilterId,
  CommunityPost,
  CreatePostFormValue,
} from '../models/community.models';
import {
  type CommunityMapContext,
  filterToApiCategory,
  mapCommentResponseToCommunityComment,
  mapPostResponseToCommunityPost,
  toCommentCreatePayload,
  toPostCreatePayload,
} from './community-api.mapper';

const ANONYMOUS_ID_STORAGE_KEY = 'pequi-community-anonymous-id';

export type AddCommentPayload = {
  postId: string;
  content: string;
  authorMode: CommunityAuthorMode;
  parentCommentId?: string;
  replyToAuthorName?: string;
};

export type DeleteCommentPayload = {
  postId: string;
  commentId: string;
  parentCommentId?: string;
};

@Injectable({ providedIn: 'root' })
export class CommunityPostsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(PatientProfileService);
  private readonly apiUrl = environment.apiUrl;

  readonly posts = signal<CommunityPost[]>([]);
  readonly loading = signal(false);
  readonly currentUserAnonymousId = signal<string | null>(this.loadAnonymousIdFromStorage());
  private readonly likedPostIds = signal<Set<string>>(new Set());

  private mapContext(): CommunityMapContext {
    return {
      currentUserAnonymousId: this.currentUserAnonymousId(),
      likedPostIds: this.likedPostIds(),
      currentUsername: this.authService.getCurrentUser()?.username ?? null,
      currentUserAvatarUrl: this.profileService.profile().avatarDataUrl ?? null,
    };
  }

  loadPosts(filter: CommunityFilterId = 'all'): Observable<void> {
    this.loading.set(true);

    let params = new HttpParams().set('limit', '50').set('offset', '0');
    const apiCategory = filterToApiCategory(filter);
    if (apiCategory) {
      params = params.set('category', apiCategory);
    }

    return this.http
      .get<PostListResponse>(`${this.apiUrl}/v1/community/posts`, { params })
      .pipe(
        map((response) =>
          response.items.map((item) => mapPostResponseToCommunityPost(item, this.mapContext())),
        ),
        tap((items) => {
          this.posts.set(items);
          this.loading.set(false);
        }),
        map(() => undefined),
        catchError((error) => {
          this.loading.set(false);
          return throwError(() => error);
        }),
      );
  }

  loadPostDetail(postId: string): Observable<CommunityPost> {
    return forkJoin({
      post: this.http.get<PostResponse>(`${this.apiUrl}/v1/community/posts/${postId}`),
      comments: this.http.get<CommentListResponse>(
        `${this.apiUrl}/v1/community/posts/${postId}/comments`,
        { params: new HttpParams().set('limit', '50').set('offset', '0') },
      ),
    }).pipe(
      map(({ post, comments }) => {
        const mappedComments = comments.items.map((item) =>
          mapCommentResponseToCommunityComment(item, this.mapContext()),
        );
        return mapPostResponseToCommunityPost(post, this.mapContext(), mappedComments);
      }),
      tap((mapped) => this.upsertPost(mapped)),
    );
  }

  getPostById(id: string): CommunityPost | undefined {
    return this.posts().find((post) => post.id === id);
  }

  toggleSupport(postId: string): Observable<void> {
    return this.http
      .post<LikeResponse>(`${this.apiUrl}/v1/community/posts/${postId}/like`, {})
      .pipe(
        tap((response) => {
          this.likedPostIds.update((ids) => {
            const next = new Set(ids);
            if (response.liked) {
              next.add(postId);
            } else {
              next.delete(postId);
            }
            return next;
          });
          this.patchPost(postId, (post) => ({
            ...post,
            isSupported: response.liked,
            supportCount: response.like_count,
          }));
        }),
        map(() => undefined),
      );
  }

  createPost(payload: CreatePostFormValue): Observable<CommunityPost> {
    const body = toPostCreatePayload(payload);

    return this.http
      .post<PostResponse>(`${this.apiUrl}/v1/community/posts`, body)
      .pipe(
        tap((response) => this.rememberAnonymousId(response.author_anonymous_id)),
        map((response) => mapPostResponseToCommunityPost(response, this.mapContext())),
        tap((created) => this.posts.update((list) => [created, ...list])),
      );
  }

  deletePost(postId: string): Observable<void> {
    return this.http.delete<PostResponse>(`${this.apiUrl}/v1/community/posts/${postId}`).pipe(
      tap(() => {
        this.posts.update((list) => list.filter((post) => post.id !== postId));
        this.likedPostIds.update((ids) => {
          const next = new Set(ids);
          next.delete(postId);
          return next;
        });
      }),
      map(() => undefined),
    );
  }

  addComment(payload: AddCommentPayload): Observable<CommunityComment> {
    let content = payload.content.trim();
    if (payload.parentCommentId && payload.replyToAuthorName) {
      content = `@${payload.replyToAuthorName}: ${content}`;
    }

    const body = toCommentCreatePayload(content, payload.authorMode);

    return this.http
      .post<CommentResponse>(
        `${this.apiUrl}/v1/community/posts/${payload.postId}/comments`,
        body,
      )
      .pipe(
        tap((response) => this.rememberAnonymousId(response.author_anonymous_id)),
        map((response) => mapCommentResponseToCommunityComment(response, this.mapContext())),
        tap((created) => {
          this.patchPost(payload.postId, (post) => ({
            ...post,
            comments: [...post.comments, created],
            commentCount: post.commentCount + 1,
          }));
        }),
      );
  }

  deleteComment(payload: DeleteCommentPayload): Observable<void> {
    return this.http
      .delete<CommentResponse>(
        `${this.apiUrl}/v1/community/posts/${payload.postId}/comments/${payload.commentId}`,
      )
      .pipe(
        tap(() => {
          this.patchPost(payload.postId, (post) => ({
            ...post,
            comments: post.comments.filter((comment) => comment.id !== payload.commentId),
            commentCount: Math.max(0, post.commentCount - 1),
          }));
        }),
        map(() => undefined),
      );
  }

  private rememberAnonymousId(anonymousId: string): void {
    if (this.currentUserAnonymousId() === anonymousId) return;

    this.currentUserAnonymousId.set(anonymousId);
    try {
      localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, anonymousId);
    } catch {
      /* storage indisponível */
    }
  }

  private loadAnonymousIdFromStorage(): string | null {
    try {
      return localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private upsertPost(post: CommunityPost): void {
    this.posts.update((list) => {
      const index = list.findIndex((item) => item.id === post.id);
      if (index === -1) return [post, ...list];
      const next = [...list];
      next[index] = post;
      return next;
    });
  }

  private patchPost(postId: string, updater: (post: CommunityPost) => CommunityPost): void {
    this.posts.update((list) =>
      list.map((post) => (post.id === postId ? updater(post) : post)),
    );
  }
}
