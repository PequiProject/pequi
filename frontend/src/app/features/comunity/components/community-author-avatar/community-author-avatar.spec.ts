import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommunityAuthorAvatar } from './community-author-avatar';

describe('CommunityAuthorAvatar', () => {
  let fixture: ComponentFixture<CommunityAuthorAvatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityAuthorAvatar],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityAuthorAvatar);
    fixture.componentRef.setInput('initials', 'VC');
    fixture.detectChanges();
  });

  it('should show initials for public profile', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent?.trim()).toBe('VC');
    expect(el.querySelector('[data-testid="public-avatar"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="anonymous-avatar"]')).toBeFalsy();
  });

  it('should show mask icon for anonymous profile', () => {
    fixture.componentRef.setInput('anonymous', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="anonymous-avatar"]')).toBeTruthy();
    expect(el.querySelector('lucide-icon')).toBeTruthy();
    expect(el.textContent?.trim()).not.toContain('VC');
  });
});
