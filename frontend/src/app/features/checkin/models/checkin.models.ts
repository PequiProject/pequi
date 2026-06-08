export interface SymptomResponse {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

export interface CheckinCreate {
  mood: string;
  symptom_intensity: number;
  symptom_ids: string[];
  general_notes: string | null;
}

export interface CheckinResponse {
  id: string;
  mood: string;
  symptom_intensity: number;
  symptom_ids: string[];
  general_notes: string | null;
  created_at: string;
}

export type SymptomOption = {
  id: string;
  value: string;
  label: string;
  category: string;
  description: string | null;
  selectedClass: string;
  unselectedClass: string;
};