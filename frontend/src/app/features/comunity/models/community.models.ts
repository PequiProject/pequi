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
  content: string;
  timeLabel: string;
  isSupportMessage?: boolean;
  /** True when the comment was authored by the current user in this session. */
  isOwn?: boolean;
  replies?: CommunityComment[];
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorInitials: string;
  title: string;
  description: string;
  category: CommunityPostCategory;
  categoryLabel: string;
  timeLabel: string;
  supportCount: number;
  isSupported: boolean;
  commentCount: number;
  comments: CommunityComment[];
}
