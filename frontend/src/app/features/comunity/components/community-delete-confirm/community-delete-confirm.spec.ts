import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunityDeleteConfirm } from './community-delete-confirm';

describe('CommunityDeleteConfirm', () => {
  let fixture: ComponentFixture<CommunityDeleteConfirm>;
  let component: CommunityDeleteConfirm;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunityDeleteConfirm],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityDeleteConfirm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Excluir item?');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit cancel', () => {
    const spy = vi.spyOn(component.cancel, 'emit');
    fixture.debugElement.query(By.css('[data-testid="cancel-delete"]')).nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit confirm', () => {
    const spy = vi.spyOn(component.confirm, 'emit');
    fixture.debugElement.query(By.css('[data-testid="confirm-delete"]')).nativeElement.click();
    expect(spy).toHaveBeenCalled();
  });
});
