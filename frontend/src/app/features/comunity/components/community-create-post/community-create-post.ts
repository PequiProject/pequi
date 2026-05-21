import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, LucideX } from 'lucide-angular';
import type {
  CommunityAuthorMode,
  CommunityPostCategory,
  CreatePostFormValue,
} from '../../models/community.models';
import { CommunityProfileService } from '../../services/community-profile.service';
import { CommunityAuthorModePicker } from '../community-author-mode-picker/community-author-mode-picker';
import { CommunityPostCategoryPicker } from '../community-post-category-picker/community-post-category-picker';

@Component({
  selector: 'app-community-create-post',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    CommunityPostCategoryPicker,
    CommunityAuthorModePicker,
  ],
  templateUrl: './community-create-post.html',
})
export class CommunityCreatePost {
  private readonly profileService = inject(CommunityProfileService);

  readonly close = output<void>();
  readonly submitPost = output<CreatePostFormValue>();

  readonly title = signal('');
  readonly description = signal('');
  readonly categories = signal<CommunityPostCategory[]>([]);
  readonly authorMode = signal<CommunityAuthorMode>(
    this.profileService.selectedProfile() === 'anonymous' ? 'anonymous' : 'public'
  );
  readonly showValidation = signal(false);

  readonly canSubmit = computed(
    () =>
      this.title().trim().length > 0 &&
      this.description().trim().length > 0 &&
      this.categories().length > 0
  );

  readonly LucideX = LucideX;

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onTitleInput(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  onDescriptionInput(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  onCategoriesChange(categories: CommunityPostCategory[]): void {
    this.categories.set(categories);
  }

  onAuthorModeChange(mode: CommunityAuthorMode): void {
    this.authorMode.set(mode);
  }

  submit(): void {
    if (!this.canSubmit()) {
      this.showValidation.set(true);
      return;
    }

    this.submitPost.emit({
      title: this.title(),
      description: this.description(),
      categories: this.categories(),
      authorMode: this.authorMode(),
    });
  }
}
