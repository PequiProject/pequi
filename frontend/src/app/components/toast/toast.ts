import { Component, computed, input, output } from '@angular/core';
import {
  LucideAngularModule,
  LucideCircleCheck,
  LucideCircleX,
  LucideTriangleAlert,
  LucideX,
} from 'lucide-angular';
import type { ToastVariant } from './toast.types';

type ToastStyle = {
  container: string;
  icon: string;
};

const VARIANT_STYLES: Record<ToastVariant, ToastStyle> = {
  success: {
    container: 'bg-green-50 text-green-800',
    icon: 'text-green-800 focus-visible:outline-green-800',
  },
  error: {
    container: 'bg-red-50 text-red-800',
    icon: 'text-red-800 focus-visible:outline-red-800',
  },
  warning: {
    container: 'bg-amber-50 text-amber-700',
    icon: 'text-amber-700 focus-visible:outline-amber-700',
  },
};

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './toast.html',
})
export class Toast {
  readonly variant = input.required<ToastVariant>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  readonly dismissible = input(true);

  readonly hasDescription = computed(() => !!this.description()?.trim());

  readonly dismissed = output<void>();

  readonly LucideCircleCheck = LucideCircleCheck;
  readonly LucideCircleX = LucideCircleX;
  readonly LucideTriangleAlert = LucideTriangleAlert;
  readonly LucideX = LucideX;

  readonly role = computed(() => (this.variant() === 'error' ? 'alert' : 'status'));

  readonly containerClass = computed(() => {
    const style = VARIANT_STYLES[this.variant()];
    return [
      'flex items-start gap-3 rounded-xl px-4 py-3 shadow-md',
      style.container,
    ].join(' ');
  });

  readonly iconClass = computed(() => {
    const style = VARIANT_STYLES[this.variant()];
    return ['mt-0.5 shrink-0', style.icon].join(' ');
  });

  readonly descriptionClass = computed(() => {
    const base = 'm-0 mt-0.5 text-sm font-normal leading-snug opacity-90';
    switch (this.variant()) {
      case 'success':
        return `${base} text-green-700`;
      case 'error':
        return `${base} text-red-700`;
      case 'warning':
        return `${base} text-amber-600`;
    }
  });

  readonly icon = computed(() => {
    switch (this.variant()) {
      case 'success':
        return LucideCircleCheck;
      case 'error':
        return LucideCircleX;
      case 'warning':
        return LucideTriangleAlert;
    }
  });

  onDismiss(): void {
    this.dismissed.emit();
  }
}
