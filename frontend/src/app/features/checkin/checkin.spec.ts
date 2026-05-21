import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinComponent } from './checkin';

describe('CheckinComponent', () => {
  let component: CheckinComponent;
  let fixture: ComponentFixture<CheckinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckinComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckinComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
