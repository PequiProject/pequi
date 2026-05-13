import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Checkin } from './checkin';

describe('Checkin', () => {
  let component: Checkin;
  let fixture: ComponentFixture<Checkin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Checkin],
    }).compileComponents();

    fixture = TestBed.createComponent(Checkin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
