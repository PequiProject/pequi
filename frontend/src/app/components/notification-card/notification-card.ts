import { Component, computed, input } from '@angular/core';

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
  /** Overrides auto-generated aria-label when you need exact copy. */
  readonly ariaLabel = input<string | null>(null);

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
      ? 'relative flex overflow-hidden rounded-xl border border-indigo-300/60 shadow-md'
      : 'relative flex overflow-hidden rounded-xl border border-stone-200 bg-[var(--card-bg)] shadow-sm'
  );

  readonly titleClass = computed(() =>
    this.unread()
      ? 'm-0 text-base font-semibold text-indigo-700'
      : 'm-0 text-base font-semibold text-[#373831]'
  );
}
