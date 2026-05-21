import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, LucideSearch } from 'lucide-angular';

@Component({
  selector: 'app-community-search-bar',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './community-search-bar.html',
})
export class CommunitySearchBar {
  readonly value = input('');
  readonly placeholder = input('Buscar na comunidade...');
  readonly searchChange = output<string>();

  readonly LucideSearch = LucideSearch;

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchChange.emit(target.value);
  }
}
