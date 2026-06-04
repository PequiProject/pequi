import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../environments/environment';
import { CommunityPostsService } from './community-posts.service';

describe('CommunityPostsService', () => {
  let service: CommunityPostsService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CommunityPostsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load posts from API', () => {
    service.loadPosts('all').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/v1/community/posts?limit=50&offset=0`);
    expect(req.request.method).toBe('GET');
    req.flush({
      items: [
        {
          id: 'post-1',
          author_anonymous_id: 'anon-1',
          author_mode: 'identified',
          author_display_name: 'Maria',
          title: 'Meu relato',
          content: 'Conteúdo do relato publicado',
          categories: ['experience'],
          is_pinned: false,
          is_moderated: false,
          like_count: 2,
          comment_count: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      total: 1,
    });

    expect(service.posts().length).toBe(1);
    expect(service.posts()[0].title).toBe('Meu relato');
    expect(service.posts()[0].categories).toEqual(['relato']);
  });

  it('should create post with author mode mapped to API', () => {
    let createdId = '';
    service
      .createPost({
        title: 'Dúvida anônima',
        description: 'Texto com mais de dez caracteres',
        categories: ['duvida'],
        authorMode: 'anonymous',
      })
      .subscribe((post) => {
        createdId = post.id;
      });

    const req = httpMock.expectOne(`${apiUrl}/v1/community/posts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      title: 'Dúvida anônima',
      content: 'Texto com mais de dez caracteres',
      categories: ['question'],
      author_mode: 'anonymous',
    });
    req.flush({
      id: 'post-new',
      author_anonymous_id: 'anon-user',
      author_mode: 'anonymous',
      author_display_name: null,
      title: 'Dúvida anônima',
      content: 'Texto com mais de dez caracteres',
      categories: ['question'],
      is_pinned: false,
      is_moderated: false,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(createdId).toBe('post-new');
    expect(service.currentUserAnonymousId()).toBe('anon-user');
    expect(service.posts()[0].authorName).toBe('Você (anônimo)');
    expect(service.posts()[0].isOwn).toBe(true);
  });

  it('should create identified post with author display name', () => {
    let createdName = '';
    service
      .createPost({
        title: 'Relato público',
        description: 'Texto com mais de dez caracteres',
        categories: ['relato'],
        authorMode: 'public',
      })
      .subscribe((post) => {
        createdName = post.authorName;
      });

    const req = httpMock.expectOne(`${apiUrl}/v1/community/posts`);
    req.flush({
      id: 'post-public',
      author_anonymous_id: 'anon-user',
      author_mode: 'identified',
      author_display_name: 'mariasilva',
      title: 'Relato público',
      content: 'Texto com mais de dez caracteres',
      categories: ['experience'],
      is_pinned: false,
      is_moderated: false,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(createdName).toBe('mariasilva');
    expect(service.posts()[0].authorInitials).toBe('MA');
    expect(service.posts()[0].isAnonymous).toBe(false);
  });

  it('should send multiple categories when creating post', () => {
    service
      .createPost({
        title: 'Relato e apoio',
        description: 'Texto com mais de dez caracteres',
        categories: ['relato', 'apoio'],
        authorMode: 'public',
      })
      .subscribe();

    const req = httpMock.expectOne(`${apiUrl}/v1/community/posts`);
    expect(req.request.body.categories).toEqual(['experience', 'support']);
    req.flush({
      id: 'post-multi',
      author_anonymous_id: 'anon-user',
      author_mode: 'identified',
      author_display_name: 'mariasilva',
      title: 'Relato e apoio',
      content: 'Texto com mais de dez caracteres',
      categories: ['experience', 'support'],
      is_pinned: false,
      is_moderated: false,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(service.posts()[0].categories).toEqual(['relato', 'apoio']);
    expect(service.posts()[0].categoryLabels).toEqual(['Relato', 'Apoio']);
  });

  it('should add comment with author mode', () => {
    service.posts.set([
      {
        id: 'post-1',
        authorName: 'Maria',
        authorInitials: 'MA',
        title: 'Título',
        description: 'Conteúdo',
        categories: ['relato'],
        categoryLabels: ['Relato'],
        timeLabel: 'Agora',
        supportCount: 0,
        isSupported: false,
        commentCount: 0,
        comments: [],
      },
    ]);

    service
      .addComment({
        postId: 'post-1',
        content: 'Força!',
        authorMode: 'public',
      })
      .subscribe();

    const req = httpMock.expectOne(`${apiUrl}/v1/community/posts/post-1/comments`);
    expect(req.request.body).toEqual({
      content: 'Força!',
      author_mode: 'identified',
    });
    req.flush({
      id: 'comment-1',
      post_id: 'post-1',
      author_anonymous_id: 'anon-user',
      author_mode: 'identified',
      author_display_name: 'João',
      content: 'Força!',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(service.getPostById('post-1')?.comments.length).toBe(1);
    expect(service.getPostById('post-1')?.commentCount).toBe(1);
  });

  it('should toggle like on and off', () => {
    service.posts.set([
      {
        id: 'post-1',
        authorName: 'Maria',
        authorInitials: 'MA',
        title: 'Título',
        description: 'Conteúdo',
        categories: ['relato'],
        categoryLabels: ['Relato'],
        timeLabel: 'Agora',
        supportCount: 0,
        isSupported: false,
        commentCount: 0,
        comments: [],
      },
    ]);

    service.toggleSupport('post-1').subscribe();
    const likeReq = httpMock.expectOne(`${apiUrl}/v1/community/posts/post-1/like`);
    likeReq.flush({ liked: true, like_count: 1 });
    expect(service.getPostById('post-1')?.isSupported).toBe(true);

    service.toggleSupport('post-1').subscribe();
    const unlikeReq = httpMock.expectOne(`${apiUrl}/v1/community/posts/post-1/like`);
    unlikeReq.flush({ liked: false, like_count: 0 });
    expect(service.getPostById('post-1')?.isSupported).toBe(false);
  });

  it('should delete own comment', () => {
    service.posts.set([
      {
        id: 'post-1',
        authorName: 'Maria',
        authorInitials: 'MA',
        title: 'Título',
        description: 'Conteúdo',
        categories: ['relato'],
        categoryLabels: ['Relato'],
        timeLabel: 'Agora',
        supportCount: 0,
        isSupported: false,
        commentCount: 1,
        comments: [
          {
            id: 'comment-1',
            authorName: 'Você',
            authorInitials: 'VC',
            content: 'Comentário temporário',
            timeLabel: 'Agora',
            isOwn: true,
          },
        ],
      },
    ]);

    service.deleteComment({ postId: 'post-1', commentId: 'comment-1' }).subscribe();

    const req = httpMock.expectOne(`${apiUrl}/v1/community/posts/post-1/comments/comment-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({
      id: 'comment-1',
      post_id: 'post-1',
      author_anonymous_id: 'anon-user',
      author_mode: 'identified',
      author_display_name: 'João',
      content: 'Comentário temporário',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(service.getPostById('post-1')?.comments.length).toBe(0);
    expect(service.getPostById('post-1')?.commentCount).toBe(0);
  });

  it('should delete own post', () => {
    service.posts.set([
      {
        id: 'post-1',
        authorName: 'Você',
        authorInitials: 'VC',
        title: 'Temporário',
        description: 'Apagar',
        categories: ['apoio'],
        categoryLabels: ['Apoio'],
        timeLabel: 'Agora',
        supportCount: 0,
        isSupported: false,
        commentCount: 0,
        comments: [],
        isOwn: true,
      },
    ]);

    service.deletePost('post-1').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/v1/community/posts/post-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({
      id: 'post-1',
      author_anonymous_id: 'anon-user',
      author_mode: 'identified',
      author_display_name: 'João',
      title: 'Temporário',
      content: 'Apagar',
      categories: ['support'],
      is_pinned: false,
      is_moderated: false,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    expect(service.getPostById('post-1')).toBeUndefined();
  });
});
