import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { CommunityFeed } from './community-feed';
import { Comunity } from '../comunity';
import { CommunityPostPage } from '../community-post-page/community-post-page';
import { CommunityProfileService } from '../services/community-profile.service';

describe('CommunityFeed', () => {
  let component: CommunityFeed;
  let fixture: ComponentFixture<CommunityFeed>;
  let profileService: CommunityProfileService;
  let router: Router;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityFeed, HttpClientTestingModule],
      providers: [
        provideRouter([
          { path: 'comunity', component: Comunity },
          { path: 'comunity/feed', component: CommunityFeed },
          { path: 'comunity/feed/:postId', component: CommunityPostPage },
        ]),
      ],
    }).compileComponents();

    profileService = TestBed.inject(CommunityProfileService);
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    profileService.save('public');

    fixture = TestBed.createComponent(CommunityFeed);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock
      .expectOne(`${environment.apiUrl}/v1/community/posts?limit=50&offset=0`)
      .flush({ items: [], total: 0 });
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render feed without post detail overlay', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="empty-feed"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="community-post-detail"]')).toBeFalsy();
  });

  it('should navigate to post page when opening a post', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openPost('post-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/comunity/feed', 'post-1']);
  });

  it('should filter posts by search query', () => {
    component.postsService.posts.set([
      {
        id: '1',
        authorName: 'Ana',
        authorInitials: 'AN',
        title: 'Formigamento',
        description: 'Relato sobre formigamento',
        categories: ['relato'],
        categoryLabels: ['Relato'],
        timeLabel: 'Agora',
        supportCount: 0,
        isSupported: false,
        commentCount: 0,
        comments: [],
      },
      {
        id: '2',
        authorName: 'João',
        authorInitials: 'JO',
        title: 'Outro tema',
        description: 'Sem relação',
        categories: ['apoio'],
        categoryLabels: ['Apoio'],
        timeLabel: 'Agora',
        supportCount: 0,
        isSupported: false,
        commentCount: 0,
        comments: [],
      },
    ]);
    component.onSearchChange('formigamento');
    fixture.detectChanges();
    expect(component.filteredPosts().length).toBe(1);
  });

  it('should redirect to onboarding when no profile', () => {
    profileService.clear();
    const navigateSpy = vi.spyOn(router, 'navigate');
    TestBed.createComponent(CommunityFeed);
    expect(navigateSpy).toHaveBeenCalledWith(['/comunity']);
  });

  it('should open create post dialog from fab', () => {
    component.onCreatePost();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="create-post-dialog"]')).toBeTruthy();
  });

  it('should add post to feed on submit', () => {
    component.onSubmitPost({
      title: 'Post de teste',
      description: 'Descrição com mais de dez caracteres',
      categories: ['relato'],
      authorMode: 'public',
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/v1/community/posts`);
    req.flush({
      id: 'new-post',
      author_anonymous_id: 'anon-1',
      author_mode: 'identified',
      author_display_name: 'Teste',
      title: 'Post de teste',
      content: 'Descrição com mais de dez caracteres',
      categories: ['experience'],
      is_pinned: false,
      is_moderated: false,
      like_count: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    fixture.detectChanges();

    expect(component.postsService.posts().length).toBe(1);
    expect(component.showCreatePost()).toBe(false);
    expect(component.filteredPosts()[0].title).toBe('Post de teste');
  });
});
