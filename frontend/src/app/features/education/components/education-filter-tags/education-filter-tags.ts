import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { EducationFilterTag } from '../../models/article.models';

@Component({
  selector: 'app-education-filter-tags',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './education-filter-tags.html',
})
export class EducationFilterTags {
  readonly tags = input.required<EducationFilterTag[]>();
  readonly activeTag = input<string>('all');
  readonly tagChange = output<string>();

  selectTag(id: string): void {
    this.tagChange.emit(id);
  }

  isActive(id: string): boolean {
    return this.activeTag() === id;
  }
}
