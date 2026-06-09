import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  Article,
  ArticleListResponse,
  ArticleTag,
  ListArticlesParams,
} from '../models/article.models';

@Injectable({ providedIn: 'root' })
export class ArticlesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/v1/articles`;

  listArticles(params: ListArticlesParams = {}): Observable<ArticleListResponse> {
    let httpParams = new HttpParams();
    if (params.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    if (params.offset != null) httpParams = httpParams.set('offset', String(params.offset));
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.tag) httpParams = httpParams.set('tag', params.tag);
    if (params.search) httpParams = httpParams.set('search', params.search);

    return this.http.get<ArticleListResponse>(this.baseUrl, { params: httpParams });
  }

  getArticle(slug: string): Observable<Article> {
    return this.http.get<Article>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  listTags(): Observable<ArticleTag[]> {
    return this.http.get<ArticleTag[]>(`${this.baseUrl}/tags`);
  }
}
