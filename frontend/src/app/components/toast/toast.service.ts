import { Injectable, signal } from '@angular/core';
import type { ToastItem, ToastVariant } from './toast.types';

const DEFAULT_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<ToastItem[]>([]);

  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  success(title: string, durationMs?: number): string;
  success(title: string, description: string, durationMs?: number): string;
  success(
    title: string,
    descriptionOrDuration?: string | number,
    durationMs = DEFAULT_DURATION_MS
  ): string {
    return this.showVariant('success', title, descriptionOrDuration, durationMs);
  }

  error(title: string, durationMs?: number): string;
  error(title: string, description: string, durationMs?: number): string;
  error(
    title: string,
    descriptionOrDuration?: string | number,
    durationMs = DEFAULT_DURATION_MS
  ): string {
    return this.showVariant('error', title, descriptionOrDuration, durationMs);
  }

  warning(title: string, durationMs?: number): string;
  warning(title: string, description: string, durationMs?: number): string;
  warning(
    title: string,
    descriptionOrDuration?: string | number,
    durationMs = DEFAULT_DURATION_MS
  ): string {
    return this.showVariant('warning', title, descriptionOrDuration, durationMs);
  }

  show(
    variant: ToastVariant,
    title: string,
    description?: string,
    durationMs = DEFAULT_DURATION_MS
  ): string {
    const id = crypto.randomUUID();
    const item: ToastItem = {
      id,
      variant,
      title,
      ...(description ? { description } : {}),
      durationMs,
    };

    this.items.update((list) => [...list, item]);
    this.scheduleAutoDismiss(id, durationMs);

    return id;
  }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.update((list) => list.filter((t) => t.id !== id));
  }

  dismissAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.items.set([]);
  }

  private showVariant(
    variant: ToastVariant,
    title: string,
    descriptionOrDuration?: string | number,
    durationMs = DEFAULT_DURATION_MS
  ): string {
    if (typeof descriptionOrDuration === 'number') {
      return this.show(variant, title, undefined, descriptionOrDuration);
    }
    return this.show(variant, title, descriptionOrDuration, durationMs);
  }

  private scheduleAutoDismiss(id: string, durationMs: number): void {
    const timer = setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, timer);
  }
}
