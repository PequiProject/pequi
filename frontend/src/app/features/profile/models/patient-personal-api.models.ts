export interface PatientPersonalRecordApi {
  social_name: string;
  cpf: string;
  sus_card: string;
  birth_date: string | null;
  marital_status: string;
  nationality: string;
  race_color: string;
  indigenous_ethnicity: string;
  sex: string;
  wants_gender_identity: string;
  gender_identity: string;
  gender_identity_other: string;
  wants_sexual_orientation: string;
  sexual_orientation: string;
  sexual_orientation_other: string;
  address: string;
  phone: string;
  email: string;
  education: string;
  occupation: string;
  health_unit: string;
  acs_name: string;
  nurse_name: string;
  doctor_name: string;
  emergency_contact: string;
  blood_type: string;
  medication_allergies: string;
}

export interface ChangePasswordApi {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
