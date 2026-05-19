import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { Comunity } from './comunity';

describe('Comunity', () => {
  let component: Comunity;
  let fixture: ComponentFixture<Comunity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Comunity],
    }).compileComponents();

    fixture = TestBed.createComponent(Comunity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error when entering without profile', () => {
    fixture.detectChanges();
    const enterBtn = fixture.debugElement.query(By.css('[data-testid="enter-community"]'));
    enterBtn.nativeElement.click();
    fixture.detectChanges();

    expect(component.showProfileError()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="profile-error"]')).toBeTruthy();
  });

  it('should enter with public profile', () => {
    component.selectProfile('public');
    fixture.detectChanges();

    const enterBtn = fixture.debugElement.query(By.css('[data-testid="enter-community"]'));
    enterBtn.nativeElement.click();
    fixture.detectChanges();

    expect(component.hasEntered()).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="community-entered"]')).toBeTruthy();
  });

  it('should enter with anonymous profile', () => {
    component.selectProfile('anonymous');
    fixture.detectChanges();

    const enterBtn = fixture.debugElement.query(By.css('[data-testid="enter-community"]'));
    enterBtn.nativeElement.click();
    fixture.detectChanges();

    expect(component.hasEntered()).toBe(true);
    expect(component.selectedProfileLabel()).toContain('anônimo');
  });

  it('should return to profile selection when changing profile', () => {
    component.selectProfile('public');
    component.enter();
    fixture.detectChanges();

    const changeBtn = fixture.debugElement.query(By.css('[data-testid="change-profile"]'));
    changeBtn.nativeElement.click();
    fixture.detectChanges();

    expect(component.hasEntered()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="profile-option"]')).toBeTruthy();
    expect(component.selectedProfile()).toBe('public');
  });
});
