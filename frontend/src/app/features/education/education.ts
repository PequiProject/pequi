import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CommunitySearchBar } from '../comunity/components/community-search-bar/community-search-bar';
import { EducationArticleCard } from './components/education-article-card/education-article-card';
import { EducationFilterTags } from './components/education-filter-tags/education-filter-tags';
import type { Article, EducationFilterTag } from './models/article.models';
import { ArticlesService } from './services/articles.service';

@Component({
  selector: 'app-education',
  standalone: true,
  imports: [CommonModule, CommunitySearchBar, EducationFilterTags, EducationArticleCard],
  templateUrl: './education.html',
  styleUrl: './education.css',
})
export class Education implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly articlesService = inject(ArticlesService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchChanges$ = new Subject<string>();

  readonly searchQuery = signal('');
  readonly activeTag = signal<string>('all');
  readonly articles = signal<Article[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly availableTags = signal<EducationFilterTag[]>([{ id: 'all', label: 'Todos' }]);

  readonly filterTags = computed(() => this.availableTags());

  readonly hasArticles = computed(() => this.articles().length > 0);

  ngOnInit(): void {
    this.loadTags();
    this.loadArticles();

    this.searchChanges$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.loadArticles();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchChanges$.next(query);
  }

  onFilterChange(tag: string): void {
    this.activeTag.set(tag);
    this.loadArticles();
  }

  openArticle(slug: string): void {
    void this.router.navigate(['/education', slug]);
  }

  private loadTags(): void {
    this.articlesService.listTags().subscribe({
      next: (tags) => {
        this.availableTags.set([
          { id: 'all', label: 'Todos' },
          ...tags.map((tag) => ({ id: tag.name, label: tag.name })),
        ]);
      },
      error: () => {
        this.availableTags.set([{ id: 'all', label: 'Todos' }]);
      },
    });
  }

  private loadArticles(): void {
    this.loading.set(true);
    this.loadError.set(null);

    const activeTag = this.activeTag();
    const search = this.searchQuery().trim();

    this.articlesService
      .listArticles({
        category: 'education',
        limit: 50,
        offset: 0,
        ...(activeTag !== 'all' ? { tag: activeTag } : {}),
        ...(search ? { search } : {}),
      })
      .subscribe({
        next: (response) => {
          this.articles.set(response.items);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => {
          this.articles.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.loadError.set('Não foi possível carregar os conteúdos. Tente novamente.');
        },
      });
  }
}
