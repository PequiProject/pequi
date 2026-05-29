// menu.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { Menu } from './menu';
import { HomeComponent } from '../../features/home/home';
import { Journey } from '../../features/journey/journey';
import { CheckinComponent } from '../../features/checkin/checkin';
import { Education } from '../../features/education/education';
import { Comunity } from '../../features/comunity/comunity';
import { CommunityFeed } from '../../features/comunity/community-feed/community-feed';
import { CommunityPostPage } from '../../features/comunity/community-post-page/community-post-page';


describe(Menu.name, () => {
  let fixture: ComponentFixture<Menu>;
  let component: Menu;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Menu],
      providers: [
        provideRouter([
          { path: 'home', component: HomeComponent },
          { path: 'journey', component: Journey },
          { path: 'checkin', component: CheckinComponent },
          { path: 'education', component: Education },
          { path: 'comunity', component: Comunity },
          { path: 'comunity/feed', component: CommunityFeed },
          { path: 'comunity/feed/:postId', component: CommunityPostPage },
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

  it('should render brand logo next to Pequi', () => {
    const logo = fixture.debugElement.query(By.css('[data-testid="menu-logo"]'))
      ?.nativeElement as HTMLImageElement;

    expect(logo).toBeTruthy();
    expect(logo.getAttribute('src')).toContain('logo-purple.svg');
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
    const emitSpy = vi.spyOn(component.menuCollapsedChange, 'emit');

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

  it('should keep Comunidade active on feed route', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/comunity/feed');
    fixture.detectChanges();

    const communityItem = component.navItems.find((i) => i.route === '/comunity')!;
    const communityLink = fixture.debugElement
      .queryAll(By.css('nav a'))
      .find((el) => el.nativeElement.getAttribute('href')?.includes('/comunity'));
    expect(communityLink?.nativeElement.className).toContain('bg-[#E0E7FF]');
  });
});
