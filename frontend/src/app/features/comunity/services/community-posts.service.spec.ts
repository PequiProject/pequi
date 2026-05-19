import { TestBed } from '@angular/core/testing';

import { CommunityPostsService } from './community-posts.service';
import { CommunityProfileService } from './community-profile.service';

describe('CommunityPostsService', () => {
  let service: CommunityPostsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    TestBed.inject(CommunityProfileService).save('public');
    service = TestBed.inject(CommunityPostsService);
  });

  it('should add top-level comment', () => {
    const post = service.getPostById('3')!;
    const before = post.commentCount;

    service.addComment({ postId: '3', content: 'Força!' });

    const updated = service.getPostById('3')!;
    expect(updated.commentCount).toBe(before + 1);
    expect(updated.comments.some((c) => c.content === 'Força!')).toBe(true);
  });

  it('should add reply to existing comment', () => {
    service.addComment({
      postId: '1',
      content: 'Resposta de teste',
      parentCommentId: 'c1',
    });

    const post = service.getPostById('1')!;
    const parent = post.comments.find((c) => c.id === 'c1');
    expect(parent?.replies?.some((r) => r.content === 'Resposta de teste')).toBe(true);
  });

  it('should delete own top-level comment', () => {
    service.addComment({ postId: '3', content: 'Comentário temporário' });
    const created = service.getPostById('3')!.comments.at(-1)!;
    const before = service.getPostById('3')!.commentCount;

    service.deleteComment({ postId: '3', commentId: created.id });

    const updated = service.getPostById('3')!;
    expect(updated.comments.some((c) => c.id === created.id)).toBe(false);
    expect(updated.commentCount).toBe(before - 1);
  });

  it('should delete own reply', () => {
    service.addComment({
      postId: '1',
      content: 'Resposta para apagar',
      parentCommentId: 'c1',
    });
    const parent = service.getPostById('1')!.comments.find((c) => c.id === 'c1')!;
    const reply = parent.replies!.at(-1)!;
    const before = service.getPostById('1')!.commentCount;

    service.deleteComment({ postId: '1', commentId: reply.id, parentCommentId: 'c1' });

    const updatedParent = service.getPostById('1')!.comments.find((c) => c.id === 'c1')!;
    expect(updatedParent?.replies?.some((r) => r.id === reply.id)).toBe(false);
    expect(service.getPostById('1')!.commentCount).toBe(before - 1);
  });

  it('should not delete comments that are not own', () => {
    const before = service.getPostById('1')!.comments.length;

    service.deleteComment({ postId: '1', commentId: 'c1' });

    expect(service.getPostById('1')!.comments.length).toBe(before);
  });
});
