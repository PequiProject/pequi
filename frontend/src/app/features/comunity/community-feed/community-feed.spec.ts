import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { CommunityFeed } from './community-feed';
import { Comunity } from '../comunity';
import { CommunityPostPage } from '../community-post-page/community-post-page';
import { CommunityProfileService } from '../services/community-profile.service';

describe('CommunityFeed', () => {
  let component: CommunityFeed;
  let fixture: ComponentFixture<CommunityFeed>;
  let profileService: CommunityProfileService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityFeed],
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
    profileService.save('public');

    fixture = TestBed.createComponent(CommunityFeed);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render feed without post detail overlay', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="community-feed-list"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="community-post-detail"]')).toBeFalsy();
  });

  it('should navigate to post page when opening a post', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openPost('1');
    expect(navigateSpy).toHaveBeenCalledWith(['/comunity/feed', '1']);
  });

  it('should filter posts by search query', () => {
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
    const before = component.postsService.posts().length;
    component.onSubmitPost({
      title: 'Post de teste',
      description: 'Descrição',
      categories: ['relato', 'duvida'],
      authorMode: 'public',
    });
    fixture.detectChanges();

    expect(component.postsService.posts().length).toBe(before + 1);
    expect(component.showCreatePost()).toBe(false);
    expect(component.filteredPosts()[0].title).toBe('Post de teste');
  });
});
