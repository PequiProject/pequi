import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoRegister } from './photo-register';

describe('PhotoRegister', () => {
  let component: PhotoRegister;
  let fixture: ComponentFixture<PhotoRegister>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoRegister],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoRegister);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
