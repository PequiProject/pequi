import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { LucideAngularModule, LucideClock } from 'lucide-angular';
import type { Article } from '../../models/article.models';

@Component({
  selector: 'app-education-article-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './education-article-card.html',
})
export class EducationArticleCard {
  readonly article = input.required<Article>();
  readonly openArticle = output<string>();

  readonly LucideClock = LucideClock;

  onOpen(): void {
    this.openArticle.emit(this.article().slug);
  }

  formatPublishedAt(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  readingTimeLabel(minutes: number | null): string {
    if (minutes == null || minutes < 1) return 'Leitura rápida';
    return `${minutes} min de leitura`;
  }
}
