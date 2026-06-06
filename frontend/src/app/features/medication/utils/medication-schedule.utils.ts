export interface MedicationScheduleInfo {
  frequencyKey: string;
  label: string;
  reminderTimes: string[];
}

const FREQUENCY_LABELS: Record<string, string> = {
  dia: '1 vez ao dia',
  '12/12h': 'A cada 12 horas',
  '8/8h': 'A cada 8 horas',
  '6/6h': 'A cada 6 horas',
  semana: '1 vez por semana',
  quinzena: 'A cada 15 dias',
  mes: '1 vez por mês',
};

export function normalizeFrequency(frequency?: string): string {
  const value = frequency?.trim().toLowerCase() ?? '';
  if (!value) return 'dia';
  if (value === 'mês' || value === 'mes') return 'mes';
  if (value in FREQUENCY_LABELS) return value;
  return 'dia';
}

export function extractTimeFromFrequency(frequency?: string): string {
  const value = frequency?.trim();
  if (!value) return '08:00';

  const match = value.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
  if (!match) return '08:00';

  const [, hourRaw, minute, periodRaw] = match;
  const period = periodRaw.toUpperCase();
  let hour = Number(hourRaw);

  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour < 12) hour += 12;

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

export function buildMedicationSchedule(frequency?: string): MedicationScheduleInfo {
  const frequencyKey = normalizeFrequency(frequency);
  const baseTime = extractTimeFromFrequency(frequency);
  const reminderTimes = timesForFrequency(frequencyKey, baseTime);
  const label = formatScheduleLabel(frequencyKey, reminderTimes);

  return { frequencyKey, label, reminderTimes };
}

export interface DoseSlot {
  slotKey: string;
  time: string;
  dateKey: string;
}

const SLOT_URGENT_WINDOW_MINUTES = 120;

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

function sortReminderTimes(times: string[]): string[] {
  return [...times].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

/**
 * Primeiro horário do dia que já passou e ainda não foi marcado como tomado.
 * Permite marcar a dose depois do horário (ex.: 08:00 marcável até o fim do dia).
 */
export function getPendingDoseSlot(
  reminderTimes: string[],
  isSlotTaken: (slotKey: string) => boolean,
  now = new Date()
): DoseSlot | null {
  if (reminderTimes.length === 0) return null;

  const dateKey = formatLocalDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const time of sortReminderTimes(reminderTimes)) {
    if (timeToMinutes(time) > currentMinutes) break;

    const slotKey = `${dateKey}_${time}`;
    if (!isSlotTaken(slotKey)) {
      return { slotKey, time, dateKey };
    }
  }

  return null;
}

/** Último horário do dia já passado que foi marcado como tomado (para desmarcar). */
export function getLastTakenDoseSlotToday(
  reminderTimes: string[],
  isSlotTaken: (slotKey: string) => boolean,
  now = new Date()
): DoseSlot | null {
  if (reminderTimes.length === 0) return null;

  const dateKey = formatLocalDateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  let lastTaken: DoseSlot | null = null;

  for (const time of sortReminderTimes(reminderTimes)) {
    if (timeToMinutes(time) > currentMinutes) break;

    const slotKey = `${dateKey}_${time}`;
    if (isSlotTaken(slotKey)) {
      lastTaken = { slotKey, time, dateKey };
    }
  }

  return lastTaken;
}

/** @deprecated Use getPendingDoseSlot — mantido para testes legados. */
export function getActiveDoseSlot(reminderTimes: string[], now = new Date()): DoseSlot | null {
  return getPendingDoseSlot(reminderTimes, () => false, now);
}

/** Próximo horário do dia ainda não passado (para exibir quando não está na janela). */
export function getNextDoseTimeLabel(reminderTimes: string[], now = new Date()): string | null {
  if (reminderTimes.length === 0) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const time of reminderTimes) {
    const [hour, minute] = time.split(':').map(Number);
    if (hour * 60 + minute > currentMinutes) {
      return time;
    }
  }

  return reminderTimes[0] ?? null;
}

export function isMedicationDueNow(
  pendingSlot: DoseSlot | null,
  slotTaken: boolean,
  now = new Date()
): boolean {
  if (!pendingSlot || slotTaken) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = timeToMinutes(pendingSlot.time);
  return currentMinutes >= start && currentMinutes < start + SLOT_URGENT_WINDOW_MINUTES;
}

export function allTodayDoseSlotsTaken(
  reminderTimes: string[],
  isSlotTaken: (slotKey: string) => boolean,
  now = new Date()
): boolean {
  if (reminderTimes.length === 0) return false;

  const dateKey = formatLocalDateKey(now);
  return sortReminderTimes(reminderTimes).every((time) =>
    isSlotTaken(`${dateKey}_${time}`)
  );
}

export function buildTodayDoseSlots(reminderTimes: string[], now = new Date()): DoseSlot[] {
  const dateKey = formatLocalDateKey(now);
  return sortReminderTimes(reminderTimes).map((time) => ({
    slotKey: `${dateKey}_${time}`,
    time,
    dateKey,
  }));
}

export interface DoseSlotIntakeState {
  checked: boolean;
  canToggle: boolean;
  isDueNow: boolean;
  statusLabel: string | null;
}

export function getDoseSlotIntakeState(
  slot: DoseSlot,
  isSlotTaken: boolean,
  now = new Date()
): DoseSlotIntakeState {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotMinutes = timeToMinutes(slot.time);
  const hasPassed = slotMinutes <= currentMinutes;

  if (!hasPassed) {
    return {
      checked: false,
      canToggle: false,
      isDueNow: false,
      statusLabel: `Horário: ${slot.time}`,
    };
  }

  if (isSlotTaken) {
    return {
      checked: true,
      canToggle: true,
      isDueNow: false,
      statusLabel: 'Tomado neste horário',
    };
  }

  const isDueNow =
    currentMinutes >= slotMinutes &&
    currentMinutes < slotMinutes + SLOT_URGENT_WINDOW_MINUTES;

  return {
    checked: false,
    canToggle: true,
    isDueNow,
    statusLabel: isDueNow ? null : 'Pendente — pode marcar até o fim do dia',
  };
}

export function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timesForFrequency(key: string, baseTime: string): string[] {
  switch (key) {
    case '12/12h':
      return shiftFromBase(baseTime, [0, 12]);
    case '8/8h':
      return shiftFromBase(baseTime, [0, 8, 16]);
    case '6/6h':
      return shiftFromBase(baseTime, [0, 6, 12, 18]);
    case 'semana':
    case 'quinzena':
    case 'mes':
      return [baseTime];
    default:
      return [baseTime];
  }
}

function shiftFromBase(baseTime: string, offsetsHours: number[]): string[] {
  const [baseHour, baseMinute] = baseTime.split(':').map(Number);
  const unique = new Set<string>();
  for (const offset of offsetsHours) {
    const total = (baseHour + offset) % 24;
    unique.add(`${String(total).padStart(2, '0')}:${String(baseMinute).padStart(2, '0')}`);
  }
  return [...unique].sort();
}

function formatScheduleLabel(key: string, times: string[]): string {
  const base = FREQUENCY_LABELS[key] ?? FREQUENCY_LABELS['dia'];
  return `${base} · horários: ${times.join(', ')}`;
}
