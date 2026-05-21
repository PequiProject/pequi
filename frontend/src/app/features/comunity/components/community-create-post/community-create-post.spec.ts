import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityCreatePost } from './community-create-post';
import { CommunityProfileService } from '../../services/community-profile.service';

describe('CommunityCreatePost', () => {
  let fixture: ComponentFixture<CommunityCreatePost>;
  let component: CommunityCreatePost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityCreatePost],
    }).compileComponents();

    TestBed.inject(CommunityProfileService).save('public');

    fixture = TestBed.createComponent(CommunityCreatePost);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close when cancel is clicked', () => {
    const spy = vi.spyOn(component.close, 'emit');
    fixture.debugElement.query(By.css('[data-testid="cancel-create-post"]')).nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit close when backdrop is clicked', () => {
    const spy = vi.spyOn(component.close, 'emit');
    fixture.debugElement.query(By.css('[data-testid="create-post-dialog"]')).nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should not close when clicking inside panel', () => {
    const spy = vi.spyOn(component.close, 'emit');
    fixture.debugElement.query(By.css('[data-testid="create-post-panel"]')).nativeElement.click();
    expect(spy).not.toHaveBeenCalled();
  });

  it('should emit submitPost with form data when valid', () => {
    const spy = vi.spyOn(component.submitPost, 'emit');

    component.title.set('Meu relato');
    component.description.set('Descrição do post');
    component.categories.set(['relato', 'apoio']);
    component.authorMode.set('anonymous');
    fixture.detectChanges();

    fixture.debugElement.query(By.css('[data-testid="submit-create-post"]')).nativeElement.click();

    expect(spy).toHaveBeenCalledWith({
      title: 'Meu relato',
      description: 'Descrição do post',
      categories: ['relato', 'apoio'],
      authorMode: 'anonymous',
    });
  });

  it('should show validation when submitting empty form', () => {
    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="title-error"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="description-error"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="category-error"]')).toBeTruthy();
  });
});
