import { COMMUNITY_CATEGORY_LABELS } from '../data/community-categories';
import type {
  ApiAuthorMode,
  ApiPostCategory,
  CommentResponse,
  PostResponse,
} from '../models/community-api.models';
import type {
  CommunityAuthorMode,
  CommunityComment,
  CommunityFilterId,
  CommunityPost,
  CommunityPostCategory,
  CreatePostFormValue,
} from '../models/community.models';

const UI_TO_API_CATEGORY: Record<CommunityPostCategory, ApiPostCategory> = {
  relato: 'experience',
  duvida: 'question',
  apoio: 'support',
};

const API_TO_UI_CATEGORY: Record<ApiPostCategory, CommunityPostCategory> = {
  experience: 'relato',
  question: 'duvida',
  support: 'apoio',
  news: 'relato',
};

const FILTER_TO_API_CATEGORY: Partial<Record<CommunityFilterId, ApiPostCategory>> = {
  relato: 'experience',
  duvida: 'question',
  apoio: 'support',
};

export type CommunityMapContext = {
  currentUserAnonymousId: string | null;
  likedPostIds: ReadonlySet<string>;
  currentUsername?: string | null;
  currentUserAvatarUrl?: string | null;
};

export function filterToApiCategory(filter: CommunityFilterId): ApiPostCategory | undefined {
  return FILTER_TO_API_CATEGORY[filter];
}

export function toApiAuthorMode(mode: CommunityAuthorMode): ApiAuthorMode {
  return mode === 'anonymous' ? 'anonymous' : 'identified';
}

export function toPostCreatePayload(payload: CreatePostFormValue): {
  title: string;
  content: string;
  categories: ApiPostCategory[];
  author_mode: ApiAuthorMode;
} {
  return {
    title: payload.title.trim(),
    content: payload.description.trim(),
    categories: payload.categories.map((category) => UI_TO_API_CATEGORY[category]),
    author_mode: toApiAuthorMode(payload.authorMode),
  };
}

export function toCommentCreatePayload(
  content: string,
  authorMode: CommunityAuthorMode,
): { content: string; author_mode: ApiAuthorMode } {
  return {
    content: content.trim(),
    author_mode: toApiAuthorMode(authorMode),
  };
}

export function mapPostResponseToCommunityPost(
  post: PostResponse,
  ctx: CommunityMapContext,
  comments: CommunityComment[] = [],
): CommunityPost {
  const { categories, categoryLabels } = mapApiCategories(post.categories);
  const isOwn = ctx.currentUserAnonymousId === post.author_anonymous_id;
  const isAnonymous = post.author_mode === 'anonymous';

  return {
    id: post.id,
    authorName: authorName(post.author_mode, post.author_display_name, isOwn, ctx.currentUsername),
    authorInitials: authorInitials(
      post.author_mode,
      post.author_display_name,
      isOwn,
      ctx.currentUsername,
    ),
    authorAvatarUrl: authorAvatarUrl(isOwn, isAnonymous, ctx),
    title: post.title,
    description: post.content,
    categories,
    categoryLabels,
    timeLabel: formatTimeLabel(post.created_at),
    supportCount: post.like_count,
    isSupported: ctx.likedPostIds.has(post.id),
    commentCount: post.comment_count,
    comments,
    isAnonymous,
    isOwn,
    authorAnonymousId: post.author_anonymous_id,
  };
}

export function mapCommentResponseToCommunityComment(
  comment: CommentResponse,
  ctx: CommunityMapContext,
): CommunityComment {
  const isOwn = ctx.currentUserAnonymousId === comment.author_anonymous_id;
  const isAnonymous = comment.author_mode === 'anonymous';

  return {
    id: comment.id,
    authorName: authorName(
      comment.author_mode,
      comment.author_display_name,
      isOwn,
      ctx.currentUsername,
    ),
    authorInitials: authorInitials(
      comment.author_mode,
      comment.author_display_name,
      isOwn,
      ctx.currentUsername,
    ),
    authorAvatarUrl: authorAvatarUrl(isOwn, isAnonymous, ctx),
    content: comment.content,
    timeLabel: formatTimeLabel(comment.created_at),
    isAnonymous,
    isOwn,
    authorAnonymousId: comment.author_anonymous_id,
  };
}

function authorName(
  authorMode: ApiAuthorMode,
  displayName: string | null,
  isOwn: boolean,
  currentUsername?: string | null,
): string {
  if (authorMode === 'anonymous') {
    return isOwn ? 'Você (anônimo)' : 'Anônimo';
  }

  const resolvedName = resolveAuthorLabel(displayName, isOwn, currentUsername);
  return resolvedName || 'Membro';
}

function authorInitials(
  authorMode: ApiAuthorMode,
  displayName: string | null,
  isOwn: boolean,
  currentUsername?: string | null,
): string {
  if (authorMode === 'anonymous') {
    return 'AN';
  }

  const resolvedName = resolveAuthorLabel(displayName, isOwn, currentUsername);
  return initialsFromUsername(resolvedName || 'Membro');
}

function resolveAuthorLabel(
  displayName: string | null,
  isOwn: boolean,
  currentUsername?: string | null,
): string {
  const fromApi = displayName?.trim();
  if (fromApi) return fromApi;

  if (isOwn) {
    return currentUsername?.trim() || '';
  }

  return '';
}

function initialsFromUsername(username: string): string {
  const normalized = username.replace(/[_\-.]+/g, ' ').trim();
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}

function mapApiCategories(apiCategories: ApiPostCategory[] | undefined): {
  categories: CommunityPostCategory[];
  categoryLabels: string[];
} {
  const categories = (apiCategories ?? []).map(
    (category) => API_TO_UI_CATEGORY[category] ?? 'relato',
  );
  const uniqueCategories = [...new Set(categories)];

  return {
    categories: uniqueCategories,
    categoryLabels: uniqueCategories.map((category) => COMMUNITY_CATEGORY_LABELS[category]),
  };
}

function authorAvatarUrl(
  isOwn: boolean,
  isAnonymous: boolean,
  ctx: CommunityMapContext,
): string | null {
  if (isAnonymous || !isOwn) {
    return null;
  }

  const avatarUrl = ctx.currentUserAvatarUrl?.trim();
  return avatarUrl || null;
}

function formatTimeLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return 'Agora';
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
