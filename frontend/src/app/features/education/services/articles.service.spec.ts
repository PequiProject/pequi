import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { environment } from '../../../../environments/environment';
import { ArticlesService } from './articles.service';
import type { Article, ArticleListResponse } from '../models/article.models';

const mockArticle: Article = {
  id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  title: 'Cuidados com a pele',
  slug: 'cuidados-com-a-pele',
  summary: 'Resumo do artigo educativo sobre cuidados.',
  content: 'Conteúdo completo do artigo.',
  category: 'education',
  author_name: 'Equipe Pequi',
  cover_image_url: null,
  cover_image_key: null,
  is_published: true,
  published_at: '2026-05-29T15:26:42.339Z',
  reading_time_min: 5,
  view_count: 10,
  tags: [{ id: 'tag-1', name: 'cuidados' }],
  created_at: '2026-05-29T15:26:42.339Z',
  updated_at: '2026-05-29T15:26:42.339Z',
};

describe('ArticlesService', () => {
  const baseUrl = `${environment.apiUrl}/v1/articles`;
  let service: ArticlesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ArticlesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should list articles with query params', () => {
    const response: ArticleListResponse = { items: [mockArticle], total: 1 };

    service
      .listArticles({ category: 'education', tag: 'cuidados', search: 'pele', limit: 20 })
      .subscribe((data) => expect(data).toEqual(response));

    const req = httpMock.expectOne(
      (r) =>
        r.url === baseUrl &&
        r.params.get('category') === 'education' &&
        r.params.get('tag') === 'cuidados' &&
        r.params.get('search') === 'pele' &&
        r.params.get('limit') === '20'
    );
    req.flush(response);
  });

  it('should get article by slug', () => {
    service.getArticle('cuidados-com-a-pele').subscribe((data) => expect(data).toEqual(mockArticle));

    const req = httpMock.expectOne(`${baseUrl}/cuidados-com-a-pele`);
    req.flush(mockArticle);
  });

  it('should list tags', () => {
    const tags = [{ id: 'tag-1', name: 'cuidados' }];

    service.listTags().subscribe((data) => expect(data).toEqual(tags));

    const req = httpMock.expectOne(`${baseUrl}/tags`);
    req.flush(tags);
  });
});
