// menu.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Menu } from './menu';
import { Home } from '../../features/home/home';
import { Journey } from '../../features/journey/journey';
import { Checkin } from '../../features/checkin/checkin';
import { Education } from '../../features/education/education';
import { Comunity } from '../../features/comunity/comunity';


describe(Menu.name, () => {
  let fixture: ComponentFixture<Menu>;
  let component: Menu;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menu],
      providers: [
        provideRouter([
          { path: 'home', component: Home },
          { path: 'journey', component: Journey },
          { path: 'checkin', component: Checkin },
          { path: 'education', component: Education },
          { path: 'comunity', component: Comunity },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Menu);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

it('should render all menu items in desktop and mobile nav', () => {
  const navs = fixture.debugElement.queryAll(By.css('nav'));
  const desktopLinks = navs[0].queryAll(By.css('a'));
  const mobileLinks = navs[1].queryAll(By.css('a'));

  expect(desktopLinks.length).toBe(component.navItems.length);
  expect(mobileLinks.length).toBe(component.navItems.length);
});

  it('should start expanded', () => {
    expect(component.isCollapsed()).toBeFalsy();

    const aside = fixture.debugElement.query(By.css('aside')).nativeElement as HTMLElement;
    expect(aside.className).toContain('w-72');
    expect(aside.className).not.toContain('w-20');
  });

  it('should collapse sidebar on toggle button click', () => {
    const button = fixture.debugElement.query(By.css('aside button'));
    button.triggerEventHandler('click');

    fixture.detectChanges();

    expect(component.isCollapsed()).toBeTruthy();

    const aside = fixture.debugElement.query(By.css('aside')).nativeElement as HTMLElement;
    expect(aside.className).toContain('w-20');
  });

  it('should emit collapsedChange when toggled', () => {
    const emitSpy = vi.spyOn(component.collapsedChange, 'emit');

    component.toggleSidebar();
    expect(emitSpy).toHaveBeenCalledWith(true);

    component.toggleSidebar();
    expect(emitSpy).toHaveBeenCalledWith(false);
  });

  it('should update accessibility attributes on toggle button', () => {
    const button = fixture.debugElement.query(By.css('aside button')).nativeElement as HTMLButtonElement;

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Recolher menu lateral');

    component.toggleSidebar();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Expandir menu lateral');
  });

  it('should return route in trackByRoute', () => {
    const item = component.navItems[0];
    expect(component.trackByRoute(0, item)).toBe('/home');
  });
});
