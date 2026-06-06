export type ArticleCategory = 'education' | 'news' | 'guidelines' | 'faq';

export interface ArticleTag {
  id: string;
  name: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: ArticleCategory;
  author_name: string;
  cover_image_url: string | null;
  cover_image_key: string | null;
  is_published: boolean;
  published_at: string | null;
  reading_time_min: number | null;
  view_count: number;
  tags: ArticleTag[];
  created_at: string;
  updated_at: string;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
}

export interface EducationFilterTag {
  id: string;
  label: string;
}

export interface ListArticlesParams {
  limit?: number;
  offset?: number;
  category?: ArticleCategory;
  tag?: string;
  search?: string;
}
