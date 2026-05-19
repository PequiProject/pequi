import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityPostCard } from './community-post-card';
import { MOCK_COMMUNITY_POSTS } from '../../data/mock-posts';

describe('CommunityPostCard', () => {
  let fixture: ComponentFixture<CommunityPostCard>;
  let component: CommunityPostCard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityPostCard],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityPostCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('post', MOCK_COMMUNITY_POSTS[0]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title, description and category', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Primeira semana de tratamento');
    expect(el.textContent).toContain('Estou no início do tratamento');
    expect(el.textContent).toContain('Relato');
    expect(el.querySelector('[class*="bg-[#CAF9DC]"]')).toBeTruthy();
  });

  it('should show support count next to heart', () => {
    const count = fixture.nativeElement.querySelector('[data-testid="support-count"]');
    expect(count?.textContent?.trim()).toBe('12');
  });

  it('should mark support button as pressed and fill heart when supported', () => {
    fixture.componentRef.setInput('post', { ...MOCK_COMMUNITY_POSTS[1] });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('[data-testid="support-btn"]') as HTMLButtonElement;
    const heart = btn.querySelector('.heart-filled');

    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.className).toContain('text-[#4338CA]');
    expect(heart).toBeTruthy();
  });

  it('should emit support on Apoiar click', () => {
    const spy = vi.spyOn(component.support, 'emit');
    fixture.debugElement.query(By.css('[data-testid="support-btn"]')).nativeElement.click();
    expect(spy).toHaveBeenCalledWith('1');
  });

  it('should emit comment on Comentar click', () => {
    const spy = vi.spyOn(component.comment, 'emit');
    fixture.debugElement.query(By.css('[data-testid="comment-btn"]')).nativeElement.click();
    expect(spy).toHaveBeenCalledWith('1');
  });

  it('should show delete button for own posts', () => {
    fixture.componentRef.setInput('post', { ...MOCK_COMMUNITY_POSTS[0], isOwn: true });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="delete-post-btn"]')).toBeTruthy();
  });

  it('should emit deletePost when delete is clicked', () => {
    fixture.componentRef.setInput('post', { ...MOCK_COMMUNITY_POSTS[0], isOwn: true });
    fixture.detectChanges();
    const spy = vi.spyOn(component.deletePost, 'emit');
    fixture.debugElement.query(By.css('[data-testid="delete-post-btn"]')).nativeElement.click();
    expect(spy).toHaveBeenCalledWith('1');
  });
});
