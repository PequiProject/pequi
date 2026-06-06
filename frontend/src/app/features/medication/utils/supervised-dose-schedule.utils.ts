function parseLocalDate(value: string): Date | null {
  const trimmed = value?.trim() ?? '';
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addCalendarMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, day);
  if (result.getDate() !== day) {
    return new Date(result.getFullYear(), result.getMonth() + 1, 0);
  }
  return result;
}

/** Próxima data de dose supervisionada (mensal). */
export function getNextSupervisedDoseDate(
  treatmentStartDate: string,
  lastSupervisedDoseDate?: string | null,
  now = new Date()
): Date | null {
  const today = startOfLocalDay(now);
  const lastTaken = lastSupervisedDoseDate?.trim()
    ? parseLocalDate(lastSupervisedDoseDate)
    : null;

  if (lastTaken) {
    let next = addCalendarMonths(startOfLocalDay(lastTaken), 1);
    while (next.getTime() < today.getTime()) {
      next = addCalendarMonths(next, 1);
    }
    return next;
  }

  const start = parseLocalDate(treatmentStartDate);
  if (!start) return null;

  let candidate = startOfLocalDay(start);
  if (today.getTime() < candidate.getTime()) {
    return candidate;
  }

  while (candidate.getTime() < today.getTime()) {
    candidate = addCalendarMonths(candidate, 1);
  }

  return candidate;
}

export function formatSupervisedDoseDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatSupervisedDoseScheduleLabel(
  treatmentStartDate: string,
  lastSupervisedDoseDate?: string | null,
  now = new Date()
): string {
  const hasStart = Boolean(treatmentStartDate?.trim());
  const hasLastDose = Boolean(lastSupervisedDoseDate?.trim());

  if (!hasStart && !hasLastDose) {
    return 'Informe a data de início em Meu tratamento para ver o próximo dia da dose.';
  }

  const next = getNextSupervisedDoseDate(
    treatmentStartDate,
    lastSupervisedDoseDate,
    now
  );
  if (!next) {
    return 'Data de início do tratamento inválida. Atualize em Meu tratamento.';
  }

  const formatted = formatSupervisedDoseDate(next);
  const isToday = startOfLocalDay(next).getTime() === startOfLocalDay(now).getTime();

  if (isToday) {
    return `Dia da dose supervisionada: hoje (${formatted})`;
  }

  return `Próximo dia da dose: ${formatted}`;
}
