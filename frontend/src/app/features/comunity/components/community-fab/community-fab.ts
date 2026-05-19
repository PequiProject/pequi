import { Component, output } from '@angular/core';
import { LucideAngularModule, LucidePlus } from 'lucide-angular';

@Component({
  selector: 'app-community-fab',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './community-fab.html',
})
export class CommunityFab {
  readonly createPost = output<void>();

  readonly LucidePlus = LucidePlus;

  onClick(): void {
    this.createPost.emit();
  }
}
