import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityFab } from './community-fab';

describe('CommunityFab', () => {
  let fixture: ComponentFixture<CommunityFab>;
  let component: CommunityFab;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityFab],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityFab);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit createPost on click', () => {
    const spy = vi.spyOn(component.createPost, 'emit');
    fixture.debugElement.query(By.css('[data-testid="create-post-fab"]')).nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });
});
