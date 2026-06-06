import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/services/auth-service';
import { HealthAppointmentService } from '../appointments/services/health-appointment.service';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows placeholder when no next appointment is registered', () => {
    expect(component.nextAppointmentCard().value).toBe('Próxima consulta ainda não registrada');
    expect(component.nextAppointmentCard().hasNext).toBe(false);
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
