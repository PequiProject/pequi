export type LeprosyClassification = '' | 'PB' | 'MB';

export type YesNoChoice = '' | 'sim' | 'nao';

export type ClinicalForm = '' | 'I' | 'T' | 'D' | 'V';

export type GifGrade = '' | 'grau_0' | 'grau_1' | 'grau_2';

export type SubstituteSchemeMedication =
  | 'clofazimina'
  | 'ofloxacino'
  | 'rifampicina'
  | 'minociclina'
  | 'dapsone';

export type MedicationIntolerance = 'dapsone' | 'rifampicin' | 'clofazimine';

/** Valor do select quando o paciente informa medicamento fora da lista padrão. */
export const INSTITUTED_MEDICATION_OTHER_KEY = '__outro__';

export const INSTITUTED_MEDICATION_NAME_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'Prednisona', label: 'Prednisona' },
  { value: 'AINE', label: 'AINE' },
  { value: 'Talidomida', label: 'Talidomida' },
  { value: 'Pentoxifilina', label: 'Pentoxifilina' },
  { value: INSTITUTED_MEDICATION_OTHER_KEY, label: 'Outro' },
] as const;

export const INSTITUTED_MEDICATION_UNIT_OPTIONS = [
  'mg',
  'mg/kg',
  'ml',
  'g',
  'comprimido',
  'gota',
] as const;

export const INSTITUTED_MEDICATION_FREQUENCY_OPTIONS = [
  'dia',
  '12/12h',
  '8/8h',
  '6/6h',
  'semana',
  'quinzena',
  'mês',
] as const;

export type InstitutedMedicationFormRow = {
  medicationKey?: string;
  customName?: string;
  dose?: string;
  unit?: string;
  frequency?: string;
};

export function institutedMedicationSelectValue(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  const known = INSTITUTED_MEDICATION_NAME_OPTIONS.find(
    (option) =>
      option.value !== INSTITUTED_MEDICATION_OTHER_KEY &&
      option.value.toLowerCase() === trimmed.toLowerCase()
  );
  return known?.value ?? INSTITUTED_MEDICATION_OTHER_KEY;
}

export function resolveInstitutedMedicationName(medicationKey: string, customName: string): string {
  if (medicationKey === INSTITUTED_MEDICATION_OTHER_KEY) {
    return customName.trim();
  }
  return medicationKey.trim();
}

export function isInstitutedMedicationOtherKey(key: string): boolean {
  return key === INSTITUTED_MEDICATION_OTHER_KEY;
}

export function parseInstitutedMedicationRows(
  controls: { getRawValue(): InstitutedMedicationFormRow }[]
): { name: string; dose: string; unit: string; frequency: string }[] {
  return controls
    .map((control) => {
      const item = control.getRawValue();
      return {
        name: resolveInstitutedMedicationName(item.medicationKey ?? '', item.customName ?? ''),
        dose: (item.dose ?? '').trim(),
        unit: (item.unit ?? 'mg').trim() || 'mg',
        frequency: (item.frequency ?? 'dia').trim() || 'dia',
      };
    })
    .filter((item) => item.name || item.dose);
}

export type ReactionEpisodeType =
  | ''
  | 'tipo_1'
  | 'tipo_2'
  | 'mista_t1_t2'
  | 'neurite_isolada'
  | 'tipo_1_neurite'
  | 'tipo_2_neurite'
  | 'mista_t1_t2_neurite';

export interface PatientPersonalData {
  fullName: string;
  socialName: string;
  cpf: string;
  susCard: string;
  birthDate: string;
  maritalStatus: string;
  nationality: string;
  raceColor: string;
  indigenousEthnicity: string;
  sex: string;
  wantsGenderIdentity: YesNoChoice;
  genderIdentity: string;
  genderIdentityOther: string;
  wantsSexualOrientation: YesNoChoice;
  sexualOrientation: string;
  sexualOrientationOther: string;
  address: string;
  phone: string;
  email: string;
  education: string;
  occupation: string;
  healthUnit: string;
  acsName: string;
  nurseName: string;
  doctorName: string;
  emergencyContact: string;
  bloodType: string;
  medicationAllergies: string;
}

/** Credenciais de acesso (login). Separado do e-mail de contato na caderneta. */
export interface PatientAccountData {
  loginEmail: string;
  /** Apenas mock local até integração com API de autenticação. */
  password: string;
}

export interface PatientTreatmentData {
  currentDoseMedication: string;
  diagnosisDate: string;
  cnsNumber: string;
  sinanNumber: string;
  classification: LeprosyClassification;
  treatmentStartDate: string;
  clinicalForm: ClinicalForm;
  baciloscopyDate: string;
  baciloscopyIB: string;
  diagnosticSupportExam: string;
  gifAssessment: GifGrade;
  reactionEpisodeAtDiagnosis: YesNoChoice;
  reactionEpisodeType: ReactionEpisodeType;
  reactionEpisodeDate: string;
  prednisoneMgKg: string;
  aineMgDay: string;
  thalidomideMgDay: string;
  pentoxifyllineMgDay: string;
  otherMedication: string;
  institutedMedications: {
    name: string;
    dose: string;
    unit: string;
    frequency: string;
  }[];
  otherConducts: string;
  substituteSchemeChangeDate: string;
  intoleranceDapsone: boolean;
  intoleranceRifampicin: boolean;
  intoleranceClofazimine: boolean;
  schemeClofazimina: boolean;
  schemeOfloxacino: boolean;
  schemeRifampicina: boolean;
  schemeMinociclina: boolean;
  schemeDapsone: boolean;
  pqtDischargeDate: string;
  gifAssessmentAtDischarge: GifGrade;
  reactionEpisodeAtDischarge: YesNoChoice;
  reactionEpisodeTypeAtDischarge: ReactionEpisodeType;
  reactionEpisodeDateAtDischarge: string;
  dischargePrednisoneMgKg: string;
  dischargeAineMgDay: string;
  dischargeThalidomideMgDay: string;
  dischargePentoxifyllineMgDay: string;
  dischargeOtherMedication: string;
  dischargeOtherConducts: string;
}

export interface PatientProfile {
  avatarDataUrl: string;
  account: PatientAccountData;
  personal: PatientPersonalData;
  treatment: PatientTreatmentData;
}

export const EDUCATION_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'fundamental_incompleto', label: 'Ensino fundamental incompleto' },
  { value: 'fundamental_completo', label: 'Ensino fundamental completo' },
  { value: 'medio_incompleto', label: 'Ensino médio incompleto' },
  { value: 'medio_completo', label: 'Ensino médio completo' },
  { value: 'superior_incompleto', label: 'Superior incompleto' },
  { value: 'superior_completo', label: 'Superior completo' },
  { value: 'pos_graduacao', label: 'Pós-graduação' },
] as const;

export const BLOOD_TYPE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Não informado' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
] as const;

export const MARITAL_STATUS_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União estável' },
  { value: 'separado', label: 'Separado(a)' },
  { value: 'outro', label: 'Outro' },
] as const;

export const NATIONALITY_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'brasileiro', label: 'Brasileiro(a)' },
  { value: 'estrangeiro', label: 'Estrangeiro(a)' },
] as const;

export const RACE_COLOR_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'branca', label: 'Branca' },
  { value: 'preta', label: 'Preta' },
  { value: 'parda', label: 'Parda' },
  { value: 'amarela', label: 'Amarela' },
  { value: 'indigena', label: 'Indígena' },
] as const;

export const SEX_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
] as const;

export const YES_NO_OPTIONS: readonly { value: YesNoChoice; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'sim', label: 'Sim' },
  { value: 'nao', label: 'Não' },
] as const;

export const GENDER_IDENTITY_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'homem_transexual', label: 'Homem transexual' },
  { value: 'mulher_transexual', label: 'Mulher transexual' },
  { value: 'travesti', label: 'Travesti' },
  { value: 'outra', label: 'Outra' },
] as const;

export const SEXUAL_ORIENTATION_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'heterossexual', label: 'Heterossexual' },
  { value: 'bissexual', label: 'Bissexual' },
  { value: 'homossexual', label: 'Homossexual (gay/lésbica)' },
  { value: 'outra', label: 'Outra' },
] as const;

export const INTOLERANCE_OPTIONS: readonly { key: MedicationIntolerance; label: string }[] = [
  { key: 'dapsone', label: 'Dapsona' },
  { key: 'rifampicin', label: 'Rifampicina' },
  { key: 'clofazimine', label: 'Clofazimina' },
] as const;

export const SUBSTITUTE_SCHEME_MEDICATION_OPTIONS: readonly {
  key: SubstituteSchemeMedication;
  label: string;
}[] = [
  { key: 'clofazimina', label: 'Clofazimina' },
  { key: 'ofloxacino', label: 'Ofloxacino' },
  { key: 'rifampicina', label: 'Rifampicina' },
  { key: 'minociclina', label: 'Minociclina' },
  { key: 'dapsone', label: 'Dapsona' },
] as const;

export const CLASSIFICATION_OPTIONS: readonly { value: LeprosyClassification; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'PB', label: 'PB — paucibacilar' },
  { value: 'MB', label: 'MB — multibacilar' },
] as const;

export const CLINICAL_FORM_OPTIONS: readonly { value: ClinicalForm; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'I', label: 'I — indeterminada' },
  { value: 'T', label: 'T — tuberculóide' },
  { value: 'D', label: 'D — dimorfa' },
  { value: 'V', label: 'V — virchowiana' },
] as const;

export const GIF_GRADE_OPTIONS: readonly { value: GifGrade; label: string }[] = [
  { value: '', label: 'Selecione' },
  { value: 'grau_0', label: 'Grau 0' },
  { value: 'grau_1', label: 'Grau 1' },
  { value: 'grau_2', label: 'Grau 2' },
] as const;

export const REACTION_EPISODE_TYPE_OPTIONS: readonly {
  value: ReactionEpisodeType;
  label: string;
}[] = [
  { value: '', label: 'Selecione' },
  { value: 'tipo_1', label: 'Tipo 1' },
  { value: 'tipo_2', label: 'Tipo 2' },
  { value: 'mista_t1_t2', label: 'Mista T1 + T2' },
  { value: 'neurite_isolada', label: 'Neurite isolada' },
  { value: 'tipo_1_neurite', label: 'Tipo 1 + neurite' },
  { value: 'tipo_2_neurite', label: 'Tipo 2 + neurite' },
  { value: 'mista_t1_t2_neurite', label: 'Mista T1 + T2 + neurite' },
] as const;

export const EMPTY_PERSONAL_DATA: PatientPersonalData = {
  fullName: '',
  socialName: '',
  cpf: '',
  susCard: '',
  birthDate: '',
  maritalStatus: '',
  nationality: '',
  raceColor: '',
  indigenousEthnicity: '',
  sex: '',
  wantsGenderIdentity: '',
  genderIdentity: '',
  genderIdentityOther: '',
  wantsSexualOrientation: '',
  sexualOrientation: '',
  sexualOrientationOther: '',
  address: '',
  phone: '',
  email: '',
  education: '',
  occupation: '',
  healthUnit: '',
  acsName: '',
  nurseName: '',
  doctorName: '',
  emergencyContact: '',
  bloodType: '',
  medicationAllergies: '',
};

export const EMPTY_TREATMENT_DATA: PatientTreatmentData = {
  currentDoseMedication: '',
  diagnosisDate: '',
  cnsNumber: '',
  sinanNumber: '',
  classification: '',
  treatmentStartDate: '',
  clinicalForm: '',
  baciloscopyDate: '',
  baciloscopyIB: '',
  diagnosticSupportExam: '',
  gifAssessment: '',
  reactionEpisodeAtDiagnosis: '',
  reactionEpisodeType: '',
  reactionEpisodeDate: '',
  prednisoneMgKg: '',
  aineMgDay: '',
  thalidomideMgDay: '',
  pentoxifyllineMgDay: '',
  otherMedication: '',
  institutedMedications: [],
  otherConducts: '',
  substituteSchemeChangeDate: '',
  intoleranceDapsone: false,
  intoleranceRifampicin: false,
  intoleranceClofazimine: false,
  schemeClofazimina: false,
  schemeOfloxacino: false,
  schemeRifampicina: false,
  schemeMinociclina: false,
  schemeDapsone: false,
  pqtDischargeDate: '',
  gifAssessmentAtDischarge: '',
  reactionEpisodeAtDischarge: '',
  reactionEpisodeTypeAtDischarge: '',
  reactionEpisodeDateAtDischarge: '',
  dischargePrednisoneMgKg: '',
  dischargeAineMgDay: '',
  dischargeThalidomideMgDay: '',
  dischargePentoxifyllineMgDay: '',
  dischargeOtherMedication: '',
  dischargeOtherConducts: '',
};

export const EMPTY_ACCOUNT_DATA: PatientAccountData = {
  loginEmail: '',
  password: '',
};

export const EMPTY_PATIENT_PROFILE: PatientProfile = {
  avatarDataUrl: '',
  account: { ...EMPTY_ACCOUNT_DATA },
  personal: { ...EMPTY_PERSONAL_DATA },
  treatment: { ...EMPTY_TREATMENT_DATA },
};

export const PERSONAL_FIELD_LABELS: Record<keyof PatientPersonalData, string> = {
  fullName: 'Nome completo',
  socialName: 'Nome social',
  cpf: 'CPF',
  susCard: 'Cartão SUS',
  birthDate: 'Data de nascimento',
  maritalStatus: 'Estado civil',
  nationality: 'Nacionalidade',
  raceColor: 'Raça/cor',
  indigenousEthnicity: 'Etnia indígena',
  sex: 'Sexo',
  wantsGenderIdentity: 'Informar identidade de gênero',
  genderIdentity: 'Identidade de gênero',
  genderIdentityOther: 'Identidade de gênero (outra)',
  wantsSexualOrientation: 'Informar orientação sexual',
  sexualOrientation: 'Orientação sexual',
  sexualOrientationOther: 'Orientação sexual (outra)',
  address: 'Endereço',
  phone: 'Telefone',
  email: 'E-mail',
  education: 'Escolaridade',
  occupation: 'Ocupação',
  healthUnit: 'Unidade de saúde frequentada',
  acsName: 'ACS',
  nurseName: 'Enfermeiro(a) responsável',
  doctorName: 'Médico(a) responsável',
  emergencyContact: 'Contato de emergência',
  bloodType: 'Tipo sanguíneo',
  medicationAllergies: 'Alergia a medicamentos',
};

export const TREATMENT_FIELD_LABELS: Record<keyof PatientTreatmentData, string> = {
  currentDoseMedication: 'Medicamento atual da dose',
  diagnosisDate: 'Data do diagnóstico',
  cnsNumber: 'Número do CNS',
  sinanNumber: 'Número do Sinan',
  classification: 'Classificação PB ou MB',
  treatmentStartDate: 'Início do tratamento',
  clinicalForm: 'Forma clínica',
  baciloscopyDate: 'Baciloscopia — data',
  baciloscopyIB: 'Baciloscopia — IB',
  diagnosticSupportExam: 'Outro exame de apoio diagnóstico',
  gifAssessment: 'Avaliação GIF',
  reactionEpisodeAtDiagnosis: 'Episódio reacional por ocasião do diagnóstico',
  reactionEpisodeType: 'Episódio reacional — tipo',
  reactionEpisodeDate: 'Episódio reacional — data',
  prednisoneMgKg: 'Prednisona (mg/kg)',
  aineMgDay: 'AINE (mg/dia)',
  thalidomideMgDay: 'Talidomida (mg/dia)',
  pentoxifyllineMgDay: 'Pentoxifilina (mg/dia)',
  otherMedication: 'Outro medicamento',
  institutedMedications: 'Medicamentos instituídos',
  otherConducts: 'Outras condutas',
  substituteSchemeChangeDate: 'Esquema substitutivo — data da mudança',
  intoleranceDapsone: 'Intolerância — Dapsona',
  intoleranceRifampicin: 'Intolerância — Rifampicina',
  intoleranceClofazimine: 'Intolerância — Clofazimina',
  schemeClofazimina: 'Esquema — Clofazimina',
  schemeOfloxacino: 'Esquema — Ofloxacino',
  schemeRifampicina: 'Esquema — Rifampicina',
  schemeMinociclina: 'Esquema — Minociclina',
  schemeDapsone: 'Esquema — Dapsona',
  pqtDischargeDate: 'Alta do tratamento — data',
  gifAssessmentAtDischarge: 'Classificação do GIF na alta do tratamento',
  reactionEpisodeAtDischarge: 'Episódio reacional por ocasião da alta',
  reactionEpisodeTypeAtDischarge: 'Episódio reacional na alta — tipo',
  reactionEpisodeDateAtDischarge: 'Episódio reacional na alta — data',
  dischargePrednisoneMgKg: 'Prednisona na alta (mg/kg)',
  dischargeAineMgDay: 'AINE na alta (mg/dia)',
  dischargeThalidomideMgDay: 'Talidomida na alta (mg/dia)',
  dischargePentoxifyllineMgDay: 'Pentoxifilina na alta (mg/dia)',
  dischargeOtherMedication: 'Outro medicamento na alta',
  dischargeOtherConducts: 'Outras condutas na alta',
};
