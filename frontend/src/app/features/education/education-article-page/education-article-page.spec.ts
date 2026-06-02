import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { EducationArticlePage } from './education-article-page';
import { Education } from '../education';
import type { Article } from '../models/article.models';

const mockArticle: Article = {
  id: '1',
  title: 'Cuidados diários',
  slug: 'cuidados-diarios',
  summary: 'Rotina de cuidados.',
  content: 'Texto completo do artigo para leitura.',
  category: 'education',
  author_name: 'Equipe Pequi',
  cover_image_url: null,
  cover_image_key: null,
  is_published: true,
  published_at: '2026-05-29T15:26:42.339Z',
  reading_time_min: 3,
  view_count: 1,
  tags: [{ id: 't1', name: 'cuidados' }],
  created_at: '2026-05-29T15:26:42.339Z',
  updated_at: '2026-05-29T15:26:42.339Z',
};

describe('EducationArticlePage', () => {
  let fixture: ComponentFixture<EducationArticlePage>;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EducationArticlePage, HttpClientTestingModule],
      providers: [
        provideRouter([
          { path: 'education', component: Education },
          { path: 'education/:slug', component: EducationArticlePage },
        ]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ slug: 'cuidados-diarios' })),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    fixture = TestBed.createComponent(EducationArticlePage);
    fixture.detectChanges();

    const req = httpMock.expectOne('http://localhost:8000/v1/articles/cuidados-diarios');
    req.flush(mockArticle);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should render article reader content', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="article-title"]')?.textContent).toContain('Cuidados diários');
    expect(el.querySelector('[data-testid="article-content"]')?.textContent).toContain(
      'Texto completo do artigo para leitura.'
    );
  });

  it('should navigate back to education list', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    fixture.componentInstance.back();
    expect(navigateSpy).toHaveBeenCalledWith(['/education']);
  });
});
