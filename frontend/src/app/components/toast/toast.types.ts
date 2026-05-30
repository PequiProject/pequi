export type ToastVariant = 'success' | 'error' | 'warning';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
}
