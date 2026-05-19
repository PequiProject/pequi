import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, LucideUsers } from 'lucide-angular';
import { CommunityFab } from '../components/community-fab/community-fab';
import { CommunityFilterTags } from '../components/community-filter-tags/community-filter-tags';
import { CommunityPostCard } from '../components/community-post-card/community-post-card';
import { CommunitySearchBar } from '../components/community-search-bar/community-search-bar';
import type { CommunityFilterId, CommunityFilterTag } from '../models/community.models';
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
  readonly showCreatePostHint = signal(false);

  readonly filteredPosts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.postsService.posts().filter((post) => {
      const matchesFilter = filter === 'all' || post.category === filter;
      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [post.title, post.description, post.authorName, post.categoryLabel]
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
    this.showCreatePostHint.set(true);
    setTimeout(() => this.showCreatePostHint.set(false), 3000);
  }
}
