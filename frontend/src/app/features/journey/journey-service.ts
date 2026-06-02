import { Injectable, computed, signal } from '@angular/core';
import { LeprosyType, JourneyEvent } from './journey';

export interface JourneyPatient {
  id: string;
  name: string;
  leprosyType: LeprosyType;
  appStartDate: string;
  treatmentStartDate: string;
}

export interface JourneyData {
  patient: JourneyPatient;
  events: JourneyEvent[];
}

@Injectable({
  providedIn: 'root',
})
export class JourneyService {
  private readonly journeyDataState = signal<JourneyData>(
    this.buildMockJourneyData()
  );

  readonly journeyData = computed(() => this.journeyDataState());
  readonly patient = computed(() => this.journeyDataState().patient);
  readonly events = computed(() => this.journeyDataState().events);

  updateJourneyData(data: JourneyData): void {
    this.journeyDataState.set(data);
  }

  resetMock(): void {
    this.journeyDataState.set(this.buildMockJourneyData());
  }

  private buildMockJourneyData(): JourneyData {
    return {
      patient: {
        id: 'patient-pb-001',
        name: 'José da Silva',
        leprosyType: 'PB',
        appStartDate: '2026-04-03',
        treatmentStartDate: '2026-04-05',
      },
      events: [
        {
          id: 'appointment-m1-001',
          type: 'appointment',
          title: 'Primeira consulta após início do tratamento',
          description:
            'Consulta realizada para avaliação clínica inicial e reforço das orientações sobre continuidade do tratamento.',
          date: '2026-04-10',
          status: 'neutral',
          metadata: {
            consultationLocation: 'UBS Benedito Bentes',
          },
        },
        {
          id: 'clinical-update-m1-001',
          type: 'clinical-update',
          title: 'Piora registrada em lesão cutânea',
          description:
            'O paciente relatou aumento da sensibilidade e desconforto em uma das áreas acompanhadas.',
          date: '2026-04-14',
          status: 'attention',
          metadata: {
            symptomTrend: 'worsened',
          },
        },
        {
          id: 'motivational-message-m1-001',
          type: 'motivational-message',
          title: 'Continue registrando seus sintomas',
          description:
            'Mesmo em momentos de piora, manter os registros ajuda a equipe de saúde a acompanhar sua evolução com mais precisão.',
          date: '2026-04-15',
          status: 'attention',
        },
        {
          id: 'medication-summary-m1-001',
          type: 'medication-summary',
          title: 'Resumo de medicação do mês 1',
          description:
            'Foram registradas as doses tomadas durante o primeiro mês de tratamento.',
          date: '2026-05-04',
          status: 'positive',
          metadata: {
            dosesTaken: 28,
            dosesExpected: 30,
          },
        },
        {
          id: 'appointment-m2-001',
          type: 'appointment',
          title: 'Consulta de acompanhamento do segundo mês',
          description:
            'Consulta realizada para revisar resposta ao tratamento e observar evolução dos sintomas relatados no aplicativo.',
          date: '2026-05-12',
          status: 'neutral',
          metadata: {
            consultationLocation: 'Ambulatório de Dermatologia Municipal',
          },
        },
        {
          id: 'clinical-update-m2-001',
          type: 'clinical-update',
          title: 'Melhora percebida pelo paciente',
          description:
            'O paciente registrou diminuição do desconforto e melhora da sensibilidade em comparação ao início do tratamento.',
          date: '2026-05-18',
          status: 'positive',
          metadata: {
            symptomTrend: 'improved',
          },
        },
        {
          id: 'motivational-message-m2-001',
          type: 'motivational-message',
          title: 'Boa evolução neste momento',
          description:
            'Houve melhora registrada neste mês. Seguir corretamente o tratamento é importante para manter esse progresso.',
          date: '2026-05-19',
          status: 'positive',
        },
      ],
    };
  }
}