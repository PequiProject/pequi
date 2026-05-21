import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { CommunitySearchBar } from './community-search-bar';

describe('CommunitySearchBar', () => {
  let fixture: ComponentFixture<CommunitySearchBar>;
  let component: CommunitySearchBar;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommunitySearchBar],
    }).compileComponents();

    fixture = TestBed.createComponent(CommunitySearchBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render search input with placeholder', () => {
    const input = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.placeholder).toContain('Buscar na comunidade');
  });

  it('should emit searchChange on input', () => {
    const spy = vi.spyOn(component.searchChange, 'emit');
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = 'tratamento';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('tratamento');
  });
});
