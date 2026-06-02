import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { EducationFilterTags } from './education-filter-tags';

describe('EducationFilterTags', () => {
  let fixture: ComponentFixture<EducationFilterTags>;
  let component: EducationFilterTags;

  const tags = [
    { id: 'all', label: 'Todos' },
    { id: 'cuidados', label: 'Cuidados' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EducationFilterTags],
    }).compileComponents();

    fixture = TestBed.createComponent(EducationFilterTags);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tags', tags);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render filter tags', () => {
    const buttons = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(buttons.length).toBe(2);
  });

  it('should emit tagChange when clicked', () => {
    const spy = vi.spyOn(component.tagChange, 'emit');
    const cuidadosBtn = fixture.debugElement.query(By.css('[data-filter="cuidados"]'));
    cuidadosBtn.nativeElement.click();
    expect(spy).toHaveBeenCalledWith('cuidados');
  });
});
