import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { Comunity } from './comunity';
import { CommunityFeed } from './community-feed/community-feed';
import { CommunityProfileService } from './services/community-profile.service';

describe('Comunity', () => {
  let component: Comunity;
  let fixture: ComponentFixture<Comunity>;
  let profileService: CommunityProfileService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Comunity],
      providers: [
        provideRouter([
          { path: 'comunity', component: Comunity },
          { path: 'comunity/feed', component: CommunityFeed },
        ]),
      ],
    }).compileComponents();

    profileService = TestBed.inject(CommunityProfileService);
    profileService.clear();
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(Comunity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error when entering without profile', () => {
    fixture.detectChanges();
    fixture.debugElement.query(By.css('[data-testid="enter-community"]')).nativeElement.click();
    fixture.detectChanges();

    expect(component.showProfileError()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="profile-error"]')).toBeTruthy();
  });

  it('should navigate to feed after entering with profile', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.selectProfile('public');
    fixture.detectChanges();

    component.enter();
    await fixture.whenStable();

    expect(profileService.hasProfile()).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith(['/comunity/feed']);
  });

  it('should redirect to feed when profile already saved', () => {
    profileService.save('anonymous');
    const navigateSpy = vi.spyOn(router, 'navigate');

    TestBed.createComponent(Comunity);
    expect(navigateSpy).toHaveBeenCalledWith(['/comunity/feed']);
  });

  it('should only show onboarding content', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="enter-community"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="community-feed-list"]')).toBeFalsy();
  });
});
