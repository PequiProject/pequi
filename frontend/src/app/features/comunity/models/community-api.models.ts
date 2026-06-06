export type ApiPostCategory = 'experience' | 'question' | 'support' | 'news';
export type ApiAuthorMode = 'anonymous' | 'identified';

export interface PostCreateRequest {
  title: string;
  content: string;
  categories: ApiPostCategory[];
  author_mode: ApiAuthorMode;
}

export interface CommentCreateRequest {
  content: string;
  author_mode: ApiAuthorMode;
}

export interface PostResponse {
  id: string;
  author_anonymous_id: string;
  author_mode: ApiAuthorMode;
  author_display_name: string | null;
  title: string;
  content: string;
  categories: ApiPostCategory[];
  is_pinned: boolean;
  is_moderated: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentResponse {
  id: string;
  post_id: string;
  author_anonymous_id: string;
  author_mode: ApiAuthorMode;
  author_display_name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PostListResponse {
  items: PostResponse[];
  total: number;
}

export interface CommentListResponse {
  items: CommentResponse[];
  total: number;
}

export interface LikeResponse {
  liked: boolean;
  like_count: number;
}
