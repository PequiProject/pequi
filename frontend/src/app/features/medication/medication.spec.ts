import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Medication } from './medication';

describe('Medication', () => {
  let component: Medication;
  let fixture: ComponentFixture<Medication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Medication],
    }).compileComponents();

    fixture = TestBed.createComponent(Medication);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
