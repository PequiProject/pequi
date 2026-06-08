import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-notification-card',
  standalone: true,
  imports: [],
  templateUrl: './notification-card.html',
})
export class NotificationCard {
  readonly title = input.required<string>();
  readonly body = input.required<string>();
  readonly timeLabel = input.required<string>();
  readonly timeDatetime = input<string | null>(null);
  readonly unread = input(false);
  readonly ariaLabel = input<string | null>(null);

  readonly cardClick = output<void>();

  readonly cardAriaLabel = computed(() => {
    const custom = this.ariaLabel();
    if (custom) {
      return custom;
    }
    const prefix = this.unread() ? 'Não lida: ' : 'Lida: ';
    return `${prefix}${this.title()}`;
  });

  readonly articleClass = computed(() =>
    this.unread()
      ? 'relative flex w-full overflow-hidden rounded-xl border border-indigo-300/60 bg-white text-left shadow-md transition hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
      : 'relative flex w-full overflow-hidden rounded-xl border border-stone-200 bg-[var(--card-bg)] text-left shadow-sm transition hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
  );

  readonly titleClass = computed(() =>
    this.unread()
      ? 'm-0 text-base font-semibold text-indigo-700'
      : 'm-0 text-base font-semibold text-[#373831]'
  );

  handleClick(): void {
    this.cardClick.emit();
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.cardClick.emit();
    }
  }
}