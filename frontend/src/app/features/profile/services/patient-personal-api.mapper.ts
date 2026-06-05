import type { PatientPersonalData } from '../models/patient-profile.models';
import type { PatientPersonalRecordApi } from '../models/patient-personal-api.models';

function toApiDate(value: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function fromApiDate(value: string | null | undefined): string {
  return value ?? '';
}

export function personalDataToApiRecord(
  data: PatientPersonalData,
  fullName: string
): PatientPersonalRecordApi {
  return {
    social_name: data.socialName,
    cpf: data.cpf,
    sus_card: data.susCard,
    birth_date: toApiDate(data.birthDate),
    marital_status: data.maritalStatus,
    nationality: data.nationality,
    race_color: data.raceColor,
    indigenous_ethnicity: data.indigenousEthnicity,
    sex: data.sex,
    wants_gender_identity: data.wantsGenderIdentity,
    gender_identity: data.genderIdentity,
    gender_identity_other: data.genderIdentityOther,
    wants_sexual_orientation: data.wantsSexualOrientation,
    sexual_orientation: data.sexualOrientation,
    sexual_orientation_other: data.sexualOrientationOther,
    address: data.address,
    phone: data.phone,
    email: data.email,
    education: data.education,
    occupation: data.occupation,
    health_unit: data.healthUnit,
    acs_name: data.acsName,
    nurse_name: data.nurseName,
    doctor_name: data.doctorName,
    emergency_contact: data.emergencyContact,
    blood_type: data.bloodType,
    medication_allergies: data.medicationAllergies,
  };
}

export function apiRecordToPersonalData(
  api: PatientPersonalRecordApi,
  fullName: string
): PatientPersonalData {
  return {
    fullName,
    socialName: api.social_name ?? '',
    cpf: api.cpf ?? '',
    susCard: api.sus_card ?? '',
    birthDate: fromApiDate(api.birth_date),
    maritalStatus: api.marital_status ?? '',
    nationality: api.nationality ?? '',
    raceColor: api.race_color ?? '',
    indigenousEthnicity: api.indigenous_ethnicity ?? '',
    sex: api.sex ?? '',
    wantsGenderIdentity: (api.wants_gender_identity ?? '') as PatientPersonalData['wantsGenderIdentity'],
    genderIdentity: api.gender_identity ?? '',
    genderIdentityOther: api.gender_identity_other ?? '',
    wantsSexualOrientation: (api.wants_sexual_orientation ?? '') as PatientPersonalData['wantsSexualOrientation'],
    sexualOrientation: api.sexual_orientation ?? '',
    sexualOrientationOther: api.sexual_orientation_other ?? '',
    address: api.address ?? '',
    phone: api.phone ?? '',
    email: api.email ?? '',
    education: api.education ?? '',
    occupation: api.occupation ?? '',
    healthUnit: api.health_unit ?? '',
    acsName: api.acs_name ?? '',
    nurseName: api.nurse_name ?? '',
    doctorName: api.doctor_name ?? '',
    emergencyContact: api.emergency_contact ?? '',
    bloodType: api.blood_type ?? '',
    medicationAllergies: api.medication_allergies ?? '',
  };
}
