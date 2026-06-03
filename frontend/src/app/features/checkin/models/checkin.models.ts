export interface SymptomResponse {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface CheckinCreate {
  mood: string;
  symptom_intensity: number;
  symptom_ids: string[];
  general_notes?: string | null;
}

export interface CheckinResponse {
  id: string;
  patient_id: string;
  mood: string;
  symptom_intensity: number;
  symptom_ids: string[];
  general_notes: string | null;
  checked_in_at: string;
  created_at: string;
}
