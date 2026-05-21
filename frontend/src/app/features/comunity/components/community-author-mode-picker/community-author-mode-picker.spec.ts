import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityAuthorModePicker } from './community-author-mode-picker';

describe('CommunityAuthorModePicker', () => {
  let fixture: ComponentFixture<CommunityAuthorModePicker>;
  let component: CommunityAuthorModePicker;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityAuthorModePicker],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityAuthorModePicker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show Publicando como label', () => {
    expect(fixture.nativeElement.textContent).toContain('Publicando como');
  });

  it('should emit modeChange when anonymous is selected', () => {
    const spy = vi.spyOn(component.modeChange, 'emit');
    fixture.debugElement.query(By.css('[data-mode="anonymous"]')).nativeElement.click();
    expect(spy).toHaveBeenCalledWith('anonymous');
  });
});
