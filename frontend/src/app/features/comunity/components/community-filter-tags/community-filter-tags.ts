import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CommunityFilterId, CommunityFilterTag } from '../../models/community.models';

@Component({
  selector: 'app-community-filter-tags',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './community-filter-tags.html',
})
export class CommunityFilterTags {
  readonly tags = input.required<CommunityFilterTag[]>();
  readonly activeTag = input<CommunityFilterId>('all');
  readonly tagChange = output<CommunityFilterId>();

  selectTag(id: CommunityFilterId): void {
    this.tagChange.emit(id);
  }

  isActive(id: CommunityFilterId): boolean {
    return this.activeTag() === id;
  }
}
