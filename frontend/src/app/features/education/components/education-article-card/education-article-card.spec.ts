import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { EducationArticleCard } from './education-article-card';
import type { Article } from '../../models/article.models';

const mockArticle: Article = {
  id: '1',
  title: 'Tratamento multidroga',
  slug: 'tratamento-multidroga',
  summary: 'Entenda o esquema de tratamento.',
  content: 'Conteúdo',
  category: 'education',
  author_name: 'Equipe Pequi',
  cover_image_url: null,
  cover_image_key: null,
  is_published: true,
  published_at: '2026-05-29T15:26:42.339Z',
  reading_time_min: 4,
  view_count: 0,
  tags: [{ id: 't1', name: 'tratamento' }],
  created_at: '2026-05-29T15:26:42.339Z',
  updated_at: '2026-05-29T15:26:42.339Z',
};

describe('EducationArticleCard', () => {
  let fixture: ComponentFixture<EducationArticleCard>;
  let component: EducationArticleCard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EducationArticleCard],
    }).compileComponents();

    fixture = TestBed.createComponent(EducationArticleCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('article', mockArticle);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render article title and summary', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Tratamento multidroga');
    expect(el.textContent).toContain('Entenda o esquema de tratamento.');
  });

  it('should emit openArticle with slug on click', () => {
    const spy = vi.spyOn(component.openArticle, 'emit');
    const card = fixture.debugElement.query(By.css('[data-testid="article-card-tratamento-multidroga"]'));
    card.nativeElement.click();
    expect(spy).toHaveBeenCalledWith('tratamento-multidroga');
  });
});
