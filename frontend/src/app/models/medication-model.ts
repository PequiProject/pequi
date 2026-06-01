export type DosageUnit = 'unit' | 'mg' | 'ml';
export type FrequencyType = 'daily' | 'weekly' | 'specific-days';

export interface MedicationModel {
  id: string;
  name: string;
  dosageValue: number | null;
  dosageUnit: DosageUnit;
  frequencyType: FrequencyType;
  weekDays?: number[]; // 0=Dom, 1=Seg ... 6=Sab
  time?: string | null; // HH:mm
  checked?: boolean;
}