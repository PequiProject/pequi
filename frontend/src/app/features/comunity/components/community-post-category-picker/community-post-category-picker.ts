import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { COMMUNITY_POST_CATEGORIES } from '../../data/community-categories';
import type { CommunityPostCategory } from '../../models/community.models';

@Component({
  selector: 'app-community-post-category-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './community-post-category-picker.html',
})
export class CommunityPostCategoryPicker {
  readonly categories = COMMUNITY_POST_CATEGORIES;
  readonly selected = input<CommunityPostCategory[]>([]);
  readonly categoriesChange = output<CommunityPostCategory[]>();

  toggle(category: CommunityPostCategory): void {
    const current = this.selected();
    const next = current.includes(category)
      ? current.filter((c) => c !== category)
      : [...current, category];
    this.categoriesChange.emit(next);
  }

  isSelected(category: CommunityPostCategory): boolean {
    return this.selected().includes(category);
  }
}
