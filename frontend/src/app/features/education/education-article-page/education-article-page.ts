import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, LucideArrowLeft, LucideClock } from 'lucide-angular';
import { EMPTY } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import type { Article } from '../models/article.models';
import { ArticlesService } from '../services/articles.service';

@Component({
  selector: 'app-education-article-page',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './education-article-page.html',
})
export class EducationArticlePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly articlesService = inject(ArticlesService);

  readonly LucideArrowLeft = LucideArrowLeft;
  readonly LucideClock = LucideClock;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly article = signal<Article | null>(null);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => params.get('slug')),
        switchMap((slug) => {
          this.loading.set(true);
          this.error.set(null);
          this.article.set(null);

          if (!slug) {
            this.loading.set(false);
            this.error.set('Artigo não encontrado.');
            return EMPTY;
          }

          return this.articlesService.getArticle(slug);
        })
      )
      .subscribe({
        next: (item) => {
          this.article.set(item);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Não foi possível carregar este conteúdo. Tente novamente.');
        },
      });
  }

  back(): void {
    void this.router.navigate(['/education']);
  }

  formatPublishedAt(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  readingTimeLabel(minutes: number | null): string {
    if (minutes == null || minutes < 1) return 'Leitura rápida';
    return `${minutes} min de leitura`;
  }
}
