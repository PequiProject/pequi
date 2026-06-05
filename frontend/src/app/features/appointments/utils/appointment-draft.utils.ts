import {
  EMPTY_APPOINTMENT_DRAFT,
  EMPTY_FOLLOW_UP_DRAFT,
  EMPTY_NEUROLOGICAL_ASSESSMENT_DRAFT,
  type HealthAppointment,
  type HealthAppointmentDraft,
} from '../models/health-appointment.models';

/** Converte consulta salva em rascunho para edição/conclusão no wizard. */
export function appointmentToDraft(appointment: HealthAppointment): HealthAppointmentDraft {
  return {
    appointmentDate: appointment.appointmentDate,
    appointmentTime: appointment.appointmentTime,
    location: appointment.location,
    type: appointment.type,
    professional: appointment.professional ?? '',
    notes: appointment.notes ?? '',
    performed: appointment.performed ? true : false,
    followUp: { ...EMPTY_FOLLOW_UP_DRAFT },
    neurologicalAssessment: { ...EMPTY_NEUROLOGICAL_ASSESSMENT_DRAFT },
  };
}

export function partialDraftFromNextInfo(info: {
  dateIso: string;
  time?: string;
  location?: string;
  appointmentType?: string;
}): HealthAppointmentDraft {
  return {
    ...EMPTY_APPOINTMENT_DRAFT,
    appointmentDate: info.dateIso,
    appointmentTime: info.time ?? '',
    location: info.location ?? '',
    type: (info.appointmentType as HealthAppointmentDraft['type']) || '',
  };
}
