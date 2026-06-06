import { Injectable } from '@angular/core';

const STORAGE_KEY = 'pequi.medication_intakes';

/** slotKey = YYYY-MM-DD_HH:mm (horário previsto do dia). */
export type MedicationIntakeLog = Record<string, string[]>;

@Injectable({ providedIn: 'root' })
export class MedicationIntakeService {
  medicationKey(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  getTakenSlotKeys(medicationKey: string): string[] {
    const log = this.loadLog();
    return log[medicationKey] ?? [];
  }

  isSlotTaken(medicationKey: string, slotKey: string): boolean {
    return this.getTakenSlotKeys(medicationKey).includes(slotKey);
  }

  markSlotTaken(medicationKey: string, slotKey: string): void {
    const log = this.loadLog();
    const slots = new Set(log[medicationKey] ?? []);
    slots.add(slotKey);
    log[medicationKey] = [...slots];
    this.persist(log);
  }

  unmarkSlot(medicationKey: string, slotKey: string): void {
    const log = this.loadLog();
    const next = (log[medicationKey] ?? []).filter((key) => key !== slotKey);
    if (next.length === 0) {
      delete log[medicationKey];
    } else {
      log[medicationKey] = next;
    }
    this.persist(log);
  }

  countTakenToday(medicationKey: string): number {
    const today = formatLocalDate(new Date());
    return this.getTakenSlotKeys(medicationKey).filter((key) => key.startsWith(`${today}_`)).length;
  }

  private loadLog(): MedicationIntakeLog {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as MedicationIntakeLog;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private persist(log: MedicationIntakeLog): void {
    if (typeof localStorage === 'undefined') return;
    const pruned = this.pruneOldEntries(log);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  }

  private pruneOldEntries(log: MedicationIntakeLog): MedicationIntakeLog {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffKey = formatLocalDate(cutoff);

    const next: MedicationIntakeLog = {};
    for (const [medKey, slots] of Object.entries(log)) {
      const kept = slots.filter((slotKey) => {
        const datePart = slotKey.split('_')[0];
        return datePart >= cutoffKey;
      });
      if (kept.length > 0) {
        next[medKey] = kept;
      }
    }
    return next;
  }
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
