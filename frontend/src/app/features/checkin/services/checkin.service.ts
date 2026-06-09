import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import type {
  CheckinCreate,
  CheckinResponse,
  SymptomOption,
  SymptomResponse,
} from '../models/checkin.models';

const NO_SYMPTOM_VALUE = 'nenhum sintoma';

type SymptomStyle = {
  selectedClass: string;
  unselectedClass: string;
};

@Injectable({
  providedIn: 'root',
})
export class CheckinService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  private readonly symptomStyleMap: Record<string, SymptomStyle> = {
    'nenhum sintoma': {
      selectedClass: 'bg-[#C0B9FF] border-[#C0B9FF] text-white',
      unselectedClass: 'bg-[#4338CA] border-[#4338CA] opacity-80 text-white',
    },
    dormencia: {
      selectedClass: 'bg-[#E9E3FF] border-[#CFC2FF] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F5F2FF] border-[#DDD3F8] text-[#44403C]',
    },
    'feridas na pele': {
      selectedClass: 'bg-[#CFF2D9] border-[#A9E2BC] text-[#2F6B45]',
      unselectedClass: 'bg-[#EEF9F1] border-[#CBEBD4] text-[#44403C]',
    },
    'pele seca': {
      selectedClass: 'bg-[#DFF1F5] border-[#BEDDE4] text-[#315C66]',
      unselectedClass: 'bg-[#EDF7F9] border-[#D2E8ED] text-[#44403C]',
    },
    formigamento: {
      selectedClass: 'bg-[#E9E3FF] border-[#CFC2FF] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F5F2FF] border-[#DDD3F8] text-[#44403C]',
    },
    'fraqueza muscular': {
      selectedClass: 'bg-[#E4F4E4] border-[#CBE6CB] text-[#446044]',
      unselectedClass: 'bg-[#F2FAF2] border-[#DCECDC] text-[#44403C]',
    },
    nodulos: {
      selectedClass: 'bg-[#E3F1F5] border-[#C9E0E7] text-[#315C66]',
      unselectedClass: 'bg-[#EFF8FA] border-[#D9E9ED] text-[#44403C]',
    },
    'problemas de visao': {
      selectedClass: 'bg-[#ECE9FF] border-[#D3CDF8] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F7F5FF] border-[#E2DCF8] text-[#44403C]',
    },
    vermelhidao: {
      selectedClass: 'bg-[#F9E6E6] border-[#EFCACA] text-[#8A4A4A]',
      unselectedClass: 'bg-[#FCF1F1] border-[#F1DADA] text-[#44403C]',
    },
    'mudanca de cor da pele': {
      selectedClass: 'bg-[#F9E6E6] border-[#EFCACA] text-[#8A4A4A]',
      unselectedClass: 'bg-[#FCF1F1] border-[#F1DADA] text-[#44403C]',
    },
    coceira: {
      selectedClass: 'bg-[#E3F1F5] border-[#C9E0E7] text-[#315C66]',
      unselectedClass: 'bg-[#EFF8FA] border-[#D9E9ED] text-[#44403C]',
    },
    'suor frio': {
      selectedClass: 'bg-[#E4F4E4] border-[#CBE6CB] text-[#446044]',
      unselectedClass: 'bg-[#F2FAF2] border-[#DCECDC] text-[#44403C]',
    },
    escamacao: {
      selectedClass: 'bg-[#E9E3FF] border-[#CFC2FF] text-[#4B3B8F]',
      unselectedClass: 'bg-[#F5F2FF] border-[#DDD3F8] text-[#44403C]',
    },
    sangramento: {
      selectedClass: 'bg-[#DFF1F5] border-[#BEDDE4] text-[#315C66]',
      unselectedClass: 'bg-[#EDF7F9] border-[#D2E8ED] text-[#44403C]',
    },
    'perda de sensibilidade na pele': {
      selectedClass: 'bg-[#F9E6E6] border-[#EFCACA] text-[#8A4A4A]',
      unselectedClass: 'bg-[#FCF1F1] border-[#F1DADA] text-[#44403C]',
    },
  };

  listSymptoms(): Observable<SymptomResponse[]> {
    return this.http.get<SymptomResponse[]>(`${this.apiUrl}/v1/symptoms`);
  }

  submit(payload: CheckinCreate): Observable<CheckinResponse> {
    return this.http.post<CheckinResponse>(`${this.apiUrl}/v1/checkins`, payload);
  }

  getCheckinHistory(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/v1/checkins`);
  }

  resolveSymptomIds(selectedNames: string[], catalog: SymptomResponse[]): string[] {
    if (!catalog.length) {
      return [];
    }

    if (selectedNames.includes(NO_SYMPTOM_VALUE)) {
      const noneSymptom = catalog.find(
        symptom => this.normalize(symptom.name) === NO_SYMPTOM_VALUE,
      );

      return noneSymptom ? [noneSymptom.id] : [];
    }

    return selectedNames
      .map(selectedName => {
        const normalizedName = this.normalize(selectedName);

        return catalog.find(
          symptom => this.normalize(symptom.name) === normalizedName,
        )?.id;
      })
      .filter((id): id is string => !!id);
  }

  buildSymptomOptions(catalog: SymptomResponse[]): SymptomOption[] {
    return catalog.map(symptom => {
      const normalizedName = this.normalize(symptom.name);
      const style = this.symptomStyleMap[normalizedName] ?? {
        selectedClass: 'bg-[#E9E3FF] border-[#CFC2FF] text-[#4B3B8F]',
        unselectedClass: 'bg-[#F5F2FF] border-[#DDD3F8] text-[#44403C]',
      };

      return {
        id: symptom.id,
        value: symptom.name,
        label: symptom.name === 'Nenhum sintoma' ? 'Nenhum sintoma hoje' : symptom.name,
        category: symptom.category,
        description: symptom.description,
        selectedClass: style.selectedClass,
        unselectedClass: style.unselectedClass,
      };
    });
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }
}