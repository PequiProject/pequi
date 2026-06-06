import type { HealthAppointment } from '../models/health-appointment.models';

export interface NextAppointmentInfo {
  source: 'scheduled' | 'follow_up_hint';
  appointmentId?: string;
  dateIso: string;
  time?: string;
  location?: string;
  appointmentType?: string;
}

export function resolveNextAppointment(
  appointments: readonly HealthAppointment[]
): NextAppointmentInfo | null {
  const today = toLocalIsoDate(new Date());
  const scheduled: NextAppointmentInfo[] = [];
  const hints: NextAppointmentInfo[] = [];

  for (const apt of appointments) {
    if (!apt.performed && apt.status === 'scheduled') {
      scheduled.push({
        source: 'scheduled',
        appointmentId: apt.id,
        dateIso: apt.appointmentDate,
        time: apt.appointmentTime?.trim() || undefined,
        location: apt.location,
        appointmentType: apt.type,
      });
      continue;
    }

    const hintDate = apt.followUp?.nextAppointmentDate?.trim();
    if (hintDate && hintDate >= today) {
      hints.push({
        source: 'follow_up_hint',
        dateIso: hintDate,
      });
    }
  }

  if (scheduled.length > 0) {
    scheduled.sort(compareNext);
    return scheduled[0] ?? null;
  }

  if (hints.length > 0) {
    hints.sort(compareNext);
    return hints[0] ?? null;
  }

  return null;
}

export function formatAppointmentDatePt(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function compareNext(a: NextAppointmentInfo, b: NextAppointmentInfo): number {
  const byDate = a.dateIso.localeCompare(b.dateIso);
  if (byDate !== 0) {
    return byDate;
  }
  return (a.time ?? '99:99').localeCompare(b.time ?? '99:99');
}

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
