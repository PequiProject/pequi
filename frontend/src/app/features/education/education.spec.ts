import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';

import { Education } from './education';
import { EducationArticlePage } from './education-article-page/education-article-page';
import type { Article, ArticleListResponse } from './models/article.models';

const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Cuidados diários',
    slug: 'cuidados-diarios',
    summary: 'Rotina de cuidados com a pele.',
    content: 'Conteúdo completo.',
    category: 'education',
    author_name: 'Equipe Pequi',
    cover_image_url: null,
    cover_image_key: null,
    is_published: true,
    published_at: '2026-05-29T15:26:42.339Z',
    reading_time_min: 3,
    view_count: 2,
    tags: [{ id: 't1', name: 'cuidados' }],
    created_at: '2026-05-29T15:26:42.339Z',
    updated_at: '2026-05-29T15:26:42.339Z',
  },
  {
    id: '2',
    title: 'Adesão ao tratamento',
    slug: 'adesao-ao-tratamento',
    summary: 'Como manter a adesão medicamentosa.',
    content: 'Conteúdo sobre adesão.',
    category: 'education',
    author_name: 'Equipe Pequi',
    cover_image_url: null,
    cover_image_key: null,
    is_published: true,
    published_at: '2026-05-29T15:26:42.339Z',
    reading_time_min: 5,
    view_count: 0,
    tags: [{ id: 't2', name: 'tratamento' }],
    created_at: '2026-05-29T15:26:42.339Z',
    updated_at: '2026-05-29T15:26:42.339Z',
  },
];

describe('Education', () => {
  let component: Education;
  let fixture: ComponentFixture<Education>;
  let httpMock: HttpTestingController;
  let router: Router;

  function flushInitialRequests(list: ArticleListResponse = { items: mockArticles, total: 2 }): void {
    const tagsReq = httpMock.expectOne('http://localhost:8000/v1/articles/tags');
    tagsReq.flush([
      { id: 't1', name: 'cuidados' },
      { id: 't2', name: 'tratamento' },
    ]);

    const listReq = httpMock.expectOne(
      (r) => r.url === 'http://localhost:8000/v1/articles' && r.params.get('category') === 'education'
    );
    listReq.flush(list);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Education, HttpClientTestingModule],
      providers: [
        provideRouter([
          { path: 'education', component: Education },
          { path: 'education/:slug', component: EducationArticlePage },
        ]),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(Education);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushInitialRequests();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render search bar and filter tags', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="community-search"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="education-filter-tags"]')).toBeTruthy();
  });

  it('should list recommended education articles', () => {
    const list = fixture.nativeElement.querySelector('[data-testid="education-article-list"]');
    expect(list).toBeTruthy();
    expect(component.articles().length).toBe(2);
  });

  it('should navigate to article page when opening content', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.openArticle('cuidados-diarios');
    expect(navigateSpy).toHaveBeenCalledWith(['/education', 'cuidados-diarios']);
  });

  it('should reload articles when filter changes', () => {
    component.onFilterChange('cuidados');
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) =>
        r.url === 'http://localhost:8000/v1/articles' &&
        r.params.get('tag') === 'cuidados' &&
        r.params.get('category') === 'education'
    );
    req.flush({ items: [mockArticles[0]], total: 1 });
    fixture.detectChanges();

    expect(component.articles().length).toBe(1);
    expect(component.articles()[0].slug).toBe('cuidados-diarios');
  });

  it('should reload articles on debounced search', async () => {
    component.onSearchChange('adesão');
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) =>
        r.url === 'http://localhost:8000/v1/articles' &&
        r.params.get('search') === 'adesão'
    );
    req.flush({ items: [mockArticles[1]], total: 1 });
    fixture.detectChanges();

    expect(component.articles().length).toBe(1);
    expect(component.articles()[0].slug).toBe('adesao-ao-tratamento');
  });

  it('should show empty state when no articles match', () => {
    component.onFilterChange('inexistente');
    fixture.detectChanges();

    const req = httpMock.expectOne((r) => r.params.get('tag') === 'inexistente');
    req.flush({ items: [], total: 0 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="education-empty"]')).toBeTruthy();
  });

  it('should open article from card click', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const card = fixture.debugElement.query(By.css('[data-testid="article-card-cuidados-diarios"]'));
    card.nativeElement.click();
    expect(navigateSpy).toHaveBeenCalledWith(['/education', 'cuidados-diarios']);
  });
});
