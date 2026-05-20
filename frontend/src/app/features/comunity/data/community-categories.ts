import type { CommunityPostCategory } from '../models/community.models';

export type CommunityPostCategoryOption = {
  id: CommunityPostCategory;
  label: string;
};

export const COMMUNITY_POST_CATEGORIES: CommunityPostCategoryOption[] = [
  { id: 'relato', label: 'Relato' },
  { id: 'duvida', label: 'Dúvida' },
  { id: 'apoio', label: 'Apoio' },
];

export const COMMUNITY_CATEGORY_LABELS: Record<CommunityPostCategory, string> = {
  relato: 'Relato',
  duvida: 'Dúvida',
  apoio: 'Apoio',
};

export function labelsForCategories(ids: CommunityPostCategory[]): string[] {
  return ids.map((id) => COMMUNITY_CATEGORY_LABELS[id]);
}
