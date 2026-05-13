import { Component, EventEmitter, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppShellComponent } from './app-shell-component';
import { Menu } from '../../components/menu/menu';

@Component({
  selector: 'app-menu',
  standalone: true,
  template: '',
})
class MockMenuComponent {
  @Output() collapsedChange = new EventEmitter<boolean>();
}

describe(AppShellComponent.name, () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let component: AppShellComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(AppShellComponent, {
        remove: { imports: [Menu] },
        add: { imports: [MockMenuComponent] },
      })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render app-menu', () => {
    const menu = fixture.debugElement.query(By.css('app-menu'));
    expect(menu).toBeTruthy();
  });

  it('should start with expanded content layout', () => {
    expect(component.isMenuCollapsed).toBeFalsy();

    const content = fixture.debugElement.query(
      By.css('[data-testid="shell-content"]')
    ).nativeElement as HTMLElement;

    expect(content.className).toContain('lg:ml-72');
    expect(content.className).not.toContain('lg:ml-20');
  });

  it('should update isMenuCollapsed when menu emits collapsedChange', () => {
    const menu = fixture.debugElement.query(
      By.directive(MockMenuComponent)
    ).componentInstance as MockMenuComponent;

    menu.collapsedChange.emit(true);

    expect(component.isMenuCollapsed).toBeTruthy();
  });

  it('should apply collapsed class when menu is collapsed', () => {
    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;

    component.isMenuCollapsed = true;
    fixture.detectChanges();

    const content = fixture.debugElement.query(
      By.css('[data-testid="shell-content"]')
    ).nativeElement as HTMLElement;

    expect(content.className).toContain('lg:ml-20');
    expect(content.className).not.toContain('lg:ml-72');
  });

  it('should apply expanded class when menu is expanded', () => {
    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;

    component.isMenuCollapsed = false;
    fixture.detectChanges();

    const content = fixture.debugElement.query(
      By.css('[data-testid="shell-content"]')
    ).nativeElement as HTMLElement;

    expect(content.className).toContain('lg:ml-72');
    expect(content.className).not.toContain('lg:ml-20');
  });
});