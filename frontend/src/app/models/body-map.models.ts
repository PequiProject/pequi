export type BodySide = 'left' | 'right' | 'center' | string;
export type SystemPart = 'head' | 'torso' | 'arm' | 'leg' | string;
export type FindingType = 'lesion' | 'numbness' | 'pain' | 'stain' | string;

export interface BodyArea {
  id: string;
  code: string;
  label: string;
  side: BodySide;
  system_part: SystemPart;
}

export interface BodyMapFinding {
  id: string;
  patient_id: string;
  body_area_id: string;
  body_area: BodyArea;
  finding_type: FindingType;
  intensity: number;
  image_url?: string;
  image_key?: string;
  notes?: string;
  recorded_at: string;
  created_at: string;
}

export interface BodyMapUpdatePayload {
  entries: {
    body_area_id: string;
    finding_type: string;
    intensity: number;
    image_key?: string;
    notes?: string;
    remove?: boolean;
  }[];
}