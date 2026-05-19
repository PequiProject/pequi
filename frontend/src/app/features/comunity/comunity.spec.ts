import { ComponentFixture, TestBed } from '@angular/core/testing';

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
});
