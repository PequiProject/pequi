import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityPostDetail } from './community-post-detail';
import { MOCK_COMMUNITY_POSTS } from '../../data/mock-posts';

describe('CommunityPostDetail', () => {
  let fixture: ComponentFixture<CommunityPostDetail>;
  let component: CommunityPostDetail;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityPostDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityPostDetail);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('post', MOCK_COMMUNITY_POSTS[0]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render comments and reply buttons', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Comentários');
    expect(el.querySelector('[data-testid="comment-c1"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="reply-btn-c1"]')).toBeTruthy();
  });

  it('should emit close when back is clicked', () => {
    const spy = vi.spyOn(component.close, 'emit');
    fixture.debugElement.query(By.css('[data-testid="close-detail"]')).nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit addComment when submitting top-level comment', () => {
    const spy = vi.spyOn(component.addComment, 'emit');
    component.commentDraft.set('Obrigada pelo apoio!');
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[data-testid="submit-comment"]')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith({
      postId: '1',
      content: 'Obrigada pelo apoio!',
    });
    expect(component.commentDraft()).toBe('');
  });

  it('should emit addComment with parentCommentId when replying', () => {
    const spy = vi.spyOn(component.addComment, 'emit');
    const comment = MOCK_COMMUNITY_POSTS[0].comments[0];

    component.startReply(comment);
    component.commentDraft.set('Concordo com você!');
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[data-testid="submit-comment"]')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith({
      postId: '1',
      content: 'Concordo com você!',
      parentCommentId: 'c1',
    });
    expect(component.replyingTo()).toBeNull();
  });

  it('should show replying banner and cancel reply', () => {
    component.startReply(MOCK_COMMUNITY_POSTS[0].comments[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="replying-banner"]')).toBeTruthy();

    fixture.debugElement.query(By.css('[data-testid="cancel-reply"]')).nativeElement.click();
    fixture.detectChanges();

    expect(component.replyingTo()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="replying-banner"]')).toBeFalsy();
  });

  it('should not emit addComment for empty comment', () => {
    const spy = vi.spyOn(component.addComment, 'emit');
    component.commentDraft.set('   ');
    fixture.detectChanges();

    component.submitComment();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should show delete button only for own comments', () => {
    const post = {
      ...MOCK_COMMUNITY_POSTS[0],
      comments: [
        ...MOCK_COMMUNITY_POSTS[0].comments,
        {
          id: 'own-1',
          authorName: 'Você',
          authorInitials: 'VC',
          content: 'Meu comentário',
          timeLabel: 'Agora',
          isOwn: true,
        },
      ],
    };
    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="delete-btn-own-1"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="delete-btn-c1"]')).toBeFalsy();
  });

  it('should show delete confirmation before emitting deleteComment', () => {
    const post = {
      ...MOCK_COMMUNITY_POSTS[0],
      comments: [
        {
          id: 'own-1',
          authorName: 'Você',
          authorInitials: 'VC',
          content: 'Meu comentário',
          timeLabel: 'Agora',
          isOwn: true,
        },
      ],
    };
    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();

    const spy = vi.spyOn(component.deleteComment, 'emit');
    const el = fixture.nativeElement as HTMLElement;

    fixture.debugElement
      .query(By.css('[data-testid="delete-btn-own-1"]'))
      .nativeElement.click();
    fixture.detectChanges();

    expect(el.querySelector('[data-testid="delete-comment-dialog"]')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();

    fixture.debugElement
      .query(By.css('[data-testid="confirm-delete"]'))
      .nativeElement.click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith({
      postId: '1',
      commentId: 'own-1',
    });
    expect(el.querySelector('[data-testid="delete-comment-dialog"]')).toBeFalsy();
  });

  it('should cancel delete confirmation without emitting', () => {
    const post = {
      ...MOCK_COMMUNITY_POSTS[0],
      comments: [
        {
          id: 'own-1',
          authorName: 'Você',
          authorInitials: 'VC',
          content: 'Meu comentário',
          timeLabel: 'Agora',
          isOwn: true,
        },
      ],
    };
    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();

    const spy = vi.spyOn(component.deleteComment, 'emit');

    fixture.debugElement
      .query(By.css('[data-testid="delete-btn-own-1"]'))
      .nativeElement.click();
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('[data-testid="cancel-delete"]'))
      .nativeElement.click();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="delete-comment-dialog"]')).toBeFalsy();
  });

  it('should emit deleteComment with parentCommentId after confirming reply delete', () => {
    const post = {
      ...MOCK_COMMUNITY_POSTS[0],
      comments: [
        {
          id: 'c1',
          authorName: 'Ana P.',
          authorInitials: 'AP',
          content: 'Comentário pai',
          timeLabel: 'Há 1 hora',
          replies: [
            {
              id: 'own-reply',
              authorName: 'Você',
              authorInitials: 'VC',
              content: 'Minha resposta',
              timeLabel: 'Agora',
              isOwn: true,
            },
          ],
        },
      ],
    };
    fixture.componentRef.setInput('post', post);
    fixture.detectChanges();

    const spy = vi.spyOn(component.deleteComment, 'emit');
    fixture.debugElement
      .query(By.css('[data-testid="delete-btn-own-reply"]'))
      .nativeElement.click();
    fixture.detectChanges();

    fixture.debugElement
      .query(By.css('[data-testid="confirm-delete"]'))
      .nativeElement.click();

    expect(spy).toHaveBeenCalledWith({
      postId: '1',
      commentId: 'own-reply',
      parentCommentId: 'c1',
    });
  });

  it('should disable autocomplete on comment input', () => {
    const input = fixture.nativeElement.querySelector(
      '[data-testid="comment-input"]'
    ) as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('name')).toBe('pequi-community-comment');
  });
});
