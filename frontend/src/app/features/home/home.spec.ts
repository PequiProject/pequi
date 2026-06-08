import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/services/auth-service';
import { HealthAppointmentService } from '../appointments/services/health-appointment.service';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let httpMock: HttpTestingController;

  function flushFeaturedArticleRequest(items: unknown[] = []): void {
    const req = httpMock.expectOne(
      (r) => r.url.includes('/v1/articles') && r.params.get('category') === 'education',
    );
    req.flush({ items, total: items.length });
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { isAuthenticated: () => false },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    flushFeaturedArticleRequest();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows placeholder when no next appointment is registered', () => {
    expect(component.nextAppointmentCard().value).toBe('Próxima consulta ainda não registrada');
    expect(component.nextAppointmentCard().hasNext).toBe(false);
  });

  it('renders featured education article from API', () => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushFeaturedArticleRequest([
      {
        id: '1',
        title: 'Cuidados diários',
        slug: 'cuidados-diarios',
        summary: 'Resumo do artigo.',
        content: 'Conteúdo.',
        category: 'education',
        author_name: 'Equipe Pequi',
        cover_image_url: null,
        cover_image_key: null,
        is_published: true,
        published_at: '2026-05-01T10:00:00Z',
        reading_time_min: 5,
        view_count: 0,
        tags: [{ id: 't1', name: 'Cuidados' }],
        created_at: '2026-05-01T10:00:00Z',
        updated_at: '2026-05-01T10:00:00Z',
      },
    ]);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('[data-testid="home-featured-article"]');
    expect(section).toBeTruthy();
    expect(section.textContent).toContain('Leitura da semana');
    expect(section.textContent).toContain('Cuidados diários');
    expect(section.textContent).toContain('Resumo do artigo.');
  });

  it('shows next scheduled appointment from service', () => {
    const appointmentService = TestBed.inject(HealthAppointmentService);
    appointmentService.saveFromDraftLocal({
      appointmentDate: '2026-06-27',
      appointmentTime: '15:30',
      location: 'UBS Centro',
      type: 'consulta',
      professional: '',
      notes: '',
      performed: false,
      followUp: {
        conduct: '',
        guidanceReceived: '',
        nextAppointmentDate: '',
        doseMedicationChanged: null,
        updateDoseFromConsultation: false,
        doseSchemeClofazimina: false,
        doseSchemeOfloxacino: false,
        doseSchemeRifampicina: false,
        doseSchemeMinociclina: false,
        doseSchemeDapsone: false,
        updateInstitutedMedsFromConsultation: false,
        hadMedicationChange: null,
        registerSupervisedDose: false,
        registerNeurologicalAssessment: false,
        selectedMedicationId: '',
        otherMedicationName: '',
        medicationChangeDescription: '',
        institutedPrednisoneMgKg: '',
        institutedAineMgDay: '',
        institutedThalidomideMgDay: '',
        institutedPentoxifyllineMgDay: '',
        institutedOtherMedication: '',
        institutedMedications: [],
        supervisedDoseNotes: '',
      },
      neurologicalAssessment: {
        assessmentDate: '',
        gifEye: '',
        gifHand: '',
        gifFoot: '',
        highestGif: '',
        ompSum: '',
        conduct: '',
        ubs: '',
        reference: '',
      },
    });
    fixture.detectChanges();
    expect(component.nextAppointmentCard().hasNext).toBe(true);
    expect(component.nextAppointmentCard().value).toContain('2026');
    expect(component.nextAppointmentCard().title).toBe('15:30');
  });
});
