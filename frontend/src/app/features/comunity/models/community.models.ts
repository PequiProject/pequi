export type CommunityFilterId = 'all' | 'relato' | 'duvida' | 'apoio';

export type CommunityPostCategory = 'relato' | 'duvida' | 'apoio';

export interface CommunityFilterTag {
  id: CommunityFilterId;
  label: string;
}

export interface CommunityComment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl?: string | null;
  content: string;
  timeLabel: string;
  /** Stable anonymous identifier — used to detect own content. */
  authorAnonymousId?: string;
  /** True when published with anonymous profile. */
  isAnonymous?: boolean;
  /** True when the comment was authored by the current user in this session. */
  isOwn?: boolean;
  replies?: CommunityComment[];
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorInitials: string;
  authorAvatarUrl?: string | null;
  title: string;
  description: string;
  categories: CommunityPostCategory[];
  categoryLabels: string[];
  timeLabel: string;
  supportCount: number;
  isSupported: boolean;
  commentCount: number;
  comments: CommunityComment[];
  /** Stable anonymous identifier — used to detect own content. */
  authorAnonymousId?: string;
  /** True when published with anonymous profile. */
  isAnonymous?: boolean;
  /** True when the post was authored by the current user in this session. */
  isOwn?: boolean;
}

export type CommunityAuthorMode = 'public' | 'anonymous';

export type CreatePostFormValue = {
  title: string;
  description: string;
  categories: CommunityPostCategory[];
  authorMode: CommunityAuthorMode;
};
