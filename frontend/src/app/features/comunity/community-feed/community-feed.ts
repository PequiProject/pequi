import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, LucideUsers } from 'lucide-angular';
import { CommunityCreatePost } from '../components/community-create-post/community-create-post';
import { CommunityDeleteConfirm } from '../components/community-delete-confirm/community-delete-confirm';
import { CommunityFab } from '../components/community-fab/community-fab';
import { CommunityFilterTags } from '../components/community-filter-tags/community-filter-tags';
import { CommunityPostCard } from '../components/community-post-card/community-post-card';
import { CommunitySearchBar } from '../components/community-search-bar/community-search-bar';
import type {
  CommunityFilterId,
  CommunityFilterTag,
  CreatePostFormValue,
} from '../models/community.models';
import { CommunityPostsService } from '../services/community-posts.service';
import { CommunityProfileService } from '../services/community-profile.service';

@Component({
  selector: 'app-community-feed',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    CommunitySearchBar,
    CommunityFilterTags,
    CommunityPostCard,
    CommunityFab,
    CommunityCreatePost,
    CommunityDeleteConfirm,
  ],
  templateUrl: './community-feed.html',
})
export class CommunityFeed {
  private readonly router = inject(Router);
  readonly profileService = inject(CommunityProfileService);
  readonly postsService = inject(CommunityPostsService);

  readonly LucideUsers = LucideUsers;

  readonly filterTags: CommunityFilterTag[] = [
    { id: 'all', label: 'Todos' },
    { id: 'relato', label: 'Relatos' },
    { id: 'duvida', label: 'Dúvidas' },
    { id: 'apoio', label: 'Apoio' },
  ];

  readonly searchQuery = signal('');
  readonly activeFilter = signal<CommunityFilterId>('all');
  readonly showCreatePost = signal(false);
  readonly pendingDeletePostId = signal<string | null>(null);

  readonly filteredPosts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.postsService.posts().filter((post) => {
      const matchesFilter = filter === 'all' || post.categories.includes(filter);
      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [post.title, post.description, post.authorName, ...post.categoryLabels]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });

  constructor() {
    if (!this.profileService.hasProfile()) {
      void this.router.navigate(['/comunity']);
    }
  }

  changeProfile(): void {
    this.profileService.clear();
    void this.router.navigate(['/comunity']);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onFilterChange(filter: CommunityFilterId): void {
    this.activeFilter.set(filter);
  }

  toggleSupport(postId: string): void {
    this.postsService.toggleSupport(postId);
  }

  openPost(postId: string): void {
    void this.router.navigate(['/comunity/feed', postId]);
  }

  onCreatePost(): void {
    this.showCreatePost.set(true);
  }

  closeCreatePost(): void {
    this.showCreatePost.set(false);
  }

  onSubmitPost(payload: CreatePostFormValue): void {
    this.postsService.createPost(payload);
    this.showCreatePost.set(false);
  }

  requestDeletePost(postId: string): void {
    this.pendingDeletePostId.set(postId);
  }

  cancelDeletePost(): void {
    this.pendingDeletePostId.set(null);
  }

  confirmDeletePost(): void {
    const postId = this.pendingDeletePostId();
    if (!postId) return;
    this.postsService.deletePost(postId);
    this.pendingDeletePostId.set(null);
  }
}
