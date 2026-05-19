import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityFilterTags } from './community-filter-tags';

describe('CommunityFilterTags', () => {
  let fixture: ComponentFixture<CommunityFilterTags>;
  let component: CommunityFilterTags;

  const tags = [
    { id: 'all' as const, label: 'Todos' },
    { id: 'relato' as const, label: 'Relatos' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityFilterTags],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityFilterTags);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tags', tags);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all filter tags', () => {
    const buttons = fixture.debugElement.queryAll(By.css('[role="tab"]'));
    expect(buttons.length).toBe(2);
  });

  it('should emit tagChange when a tag is clicked', () => {
    const spy = vi.spyOn(component.tagChange, 'emit');
    const relatoBtn = fixture.debugElement.query(
      By.css('[data-filter="relato"]')
    );
    relatoBtn.nativeElement.click();

    expect(spy).toHaveBeenCalledWith('relato');
  });
});
