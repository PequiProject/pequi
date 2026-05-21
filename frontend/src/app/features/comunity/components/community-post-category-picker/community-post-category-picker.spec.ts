import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityPostCategoryPicker } from './community-post-category-picker';

describe('CommunityPostCategoryPicker', () => {
  let fixture: ComponentFixture<CommunityPostCategoryPicker>;
  let component: CommunityPostCategoryPicker;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityPostCategoryPicker],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityPostCategoryPicker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add category when toggled on', () => {
    const spy = vi.spyOn(component.categoriesChange, 'emit');
    fixture.debugElement.query(By.css('[data-category="relato"]')).nativeElement.click();
    expect(spy).toHaveBeenCalledWith(['relato']);
  });

  it('should remove category when toggled off', () => {
    fixture.componentRef.setInput('selected', ['relato', 'duvida']);
    fixture.detectChanges();

    const spy = vi.spyOn(component.categoriesChange, 'emit');
    fixture.debugElement.query(By.css('[data-category="relato"]')).nativeElement.click();
    expect(spy).toHaveBeenCalledWith(['duvida']);
  });
});
