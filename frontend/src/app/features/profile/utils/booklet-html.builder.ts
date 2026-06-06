import type { PatientBookletData } from '../models/patient-booklet.models';
import type { PatientPersonalData, PatientTreatmentData } from '../models/patient-profile.models';
import { BOOKLET_OPTION_HELPERS, formatBookletDate } from './booklet-export-data.utils';
import { SUBSTITUTE_SCHEME_MEDICATION_OPTIONS } from '../models/patient-profile.models';

const PURPLE = '#5b3a7a';
const PURPLE_DARK = '#45285c';
const PURPLE_LIGHT = '#f3edf8';
const PURPLE_BORDER = '#c9b8d9';
const TEXT_MUTED = '#5c4d68';

function esc(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function display(value: string): string {
  const trimmed = value?.trim();
  return trimmed ? esc(trimmed) : '<span class="empty-val">—</span>';
}

function field(label: string, value: string): string {
  return `
    <div class="field">
      <div class="field-label">${esc(label)}</div>
      <div class="field-value">${display(value)}</div>
    </div>`;
}

function fieldInline(label: string, value: string): string {
  return `<div class="field-inline"><span class="field-label">${esc(label)}</span><span class="field-value inline">${display(value)}</span></div>`;
}

function check(checked: boolean, label: string): string {
  return `<label class="check-item"><span class="check-box${checked ? ' checked' : ''}"></span><span>${esc(label)}</span></label>`;
}

function checkGroup(items: string): string {
  return `<div class="check-group">${items}</div>`;
}

function section(title: string, body: string, extraClass = ''): string {
  return `
  <section class="booklet-section ${extraClass}">
    <header class="section-head">
      <h2>${esc(title)}</h2>
    </header>
    <div class="section-body">${body}</div>
  </section>`;
}

function disclaimerBlock(): string {
  return `
  <aside class="legal-notice" role="note">
    <div class="legal-icon" aria-hidden="true">!</div>
    <div class="legal-text">
      <strong>Aviso importante</strong>
      <p>
        Este documento <strong>não é um documento oficial médico</strong> e não substitui
        qualquer registro emitido pelo SUS ou por profissional de saúde habilitado.
      </p>
      <p>
        Trata-se de uma <strong>cópia informativa</strong> das informações que você registrou no
        aplicativo <strong>Pequi</strong>, gerada automaticamente para consulta.
        Em caso de dúvida clínica, procure sua unidade de saúde.
      </p>
    </div>
  </aside>`;
}

function printHint(): string {
  return `
  <div class="print-hint no-print">
    <strong>Como salvar em PDF:</strong>
    use <em>Arquivo → Imprimir → Salvar como PDF</em> (ou Ctrl+P) na janela que abrir.
  </div>`;
}

function documentHeader(generated: string, patientName: string): string {
  return `
  <header class="doc-header">
    <div class="doc-brand">
      <span class="doc-app">Pequi</span>
      <span class="doc-tag">Exportação de cartilha</span>
    </div>
    <h1>Caderneta de Saúde da Pessoa com Hanseníase</h1>
    <p class="doc-subtitle">Síntese dos dados registrados no aplicativo</p>
    <div class="doc-meta">
      <span>${patientName ? `Paciente: <strong>${esc(patientName)}</strong> · ` : ''}Gerado em ${esc(generated)}</span>
    </div>
  </header>`;
}

function documentFooter(): string {
  return `
  <footer class="doc-footer">
    <p>Exportado do aplicativo <strong>Pequi</strong> · Documento informativo — não oficial</p>
  </footer>`;
}

function personalSection(p: PatientPersonalData): string {
  const nationalityBr = p.nationality === 'brasileira';
  const nationalityForeign = p.nationality === 'estrangeira';
  const genderYes = p.wantsGenderIdentity === 'sim';
  const orientationYes = p.wantsSexualOrientation === 'sim';

  const body = `
    <div class="field-grid two-col">
      ${field('Nome completo', p.fullName)}
      ${field('Nome social', p.socialName)}
      ${field('Número do CPF', p.cpf)}
      ${field('Número do Cartão SUS', p.susCard)}
      ${field('Data de nascimento', formatBookletDate(p.birthDate))}
      ${field('Estado civil', BOOKLET_OPTION_HELPERS.maritalStatus(p.maritalStatus))}
    </div>
    <div class="subsection">
      <p class="subsection-title">Nacionalidade</p>
      ${checkGroup(`${check(nationalityBr, 'Brasileiro(a)')} ${check(nationalityForeign, 'Estrangeiro(a)')}`)}
    </div>
    <div class="subsection">
      <p class="subsection-title">Raça/cor</p>
      ${checkGroup(`
        ${check(p.raceColor === 'branca', 'Branca')}
        ${check(p.raceColor === 'preta', 'Preta')}
        ${check(p.raceColor === 'parda', 'Parda')}
        ${check(p.raceColor === 'amarela', 'Amarela')}
        ${check(p.raceColor === 'indigena', 'Indígena')}
      `)}
      ${p.raceColor === 'indigena' ? field('Se indígena, qual etnia?', p.indigenousEthnicity) : ''}
    </div>
    <div class="subsection">
      <p class="subsection-title">Sexo</p>
      ${checkGroup(`${check(p.sex === 'feminino', 'Feminino')} ${check(p.sex === 'masculino', 'Masculino')}`)}
    </div>
    <div class="subsection">
      <p class="subsection-title">Identidade de gênero</p>
      <p class="hint-line">Deseja informar? <strong>${genderYes ? 'Sim' : 'Não'}</strong></p>
      ${
        genderYes
          ? checkGroup(`
        ${check(p.genderIdentity === 'homem_transexual', 'Homem transexual')}
        ${check(p.genderIdentity === 'mulher_transexual', 'Mulher transexual')}
        ${check(p.genderIdentity === 'travesti', 'Travesti')}
        ${check(p.genderIdentity === 'outra', `Outra: ${p.genderIdentityOther || '—'}`)}
      `)
          : ''
      }
    </div>
    <div class="subsection">
      <p class="subsection-title">Orientação sexual</p>
      <p class="hint-line">Deseja informar? <strong>${orientationYes ? 'Sim' : 'Não'}</strong></p>
      ${
        orientationYes
          ? checkGroup(`
        ${check(p.sexualOrientation === 'heterossexual', 'Heterossexual')}
        ${check(p.sexualOrientation === 'bissexual', 'Bissexual')}
        ${check(p.sexualOrientation === 'homossexual', 'Homossexual (gay/lésbica)')}
        ${check(p.sexualOrientation === 'outra', `Outra: ${p.sexualOrientationOther || '—'}`)}
      `)
          : ''
      }
    </div>
    <div class="divider"></div>
    <div class="field-grid">
      ${field('Endereço', p.address)}
      ${field('Telefone celular', p.phone)}
      ${field('e-mail', p.email)}
      ${field('Escolaridade', BOOKLET_OPTION_HELPERS.education(p.education))}
      ${field('Ocupação', p.occupation)}
    </div>
    <div class="panel tinted">
      <p class="panel-title">Unidade e equipe de saúde</p>
      ${field('Unidade de Atenção Primária', p.healthUnit)}
      <div class="field-grid three-col">
        ${field('ACS', p.acsName)}
        ${field('Enfermeiro(a)', p.nurseName)}
        ${field('Médico(a)', p.doctorName)}
      </div>
    </div>
    <div class="panel">
      <p class="panel-title">Emergência e informações clínicas gerais</p>
      ${field('Em situação de emergência, ligar para', p.emergencyContact)}
      <div class="field-grid two-col">
        ${field('Tipo sanguíneo', p.bloodType)}
        ${field('Alergia a medicamento?', p.medicationAllergies)}
      </div>
    </div>`;

  return section('Dados pessoais', body);
}

function clinicalRegisterSection(t: PatientTreatmentData): string {
  const body = `
    <div class="registry-box">
      <div class="registry-row highlight">
        <span class="registry-label">DIAGNÓSTICO</span>
        <span class="registry-value">${display(formatBookletDate(t.diagnosisDate))}</span>
      </div>
      <div class="registry-grid">
        <div class="registry-cell">${fieldInline('Nº CNS', t.cnsNumber)}</div>
        <div class="registry-cell">${fieldInline('Nº Sinan', t.sinanNumber)}</div>
        <div class="registry-cell">
          <span class="registry-label">Classificação</span>
          ${checkGroup(`${check(t.classification === 'PB', 'PB')} ${check(t.classification === 'MB', 'MB')}`)}
        </div>
        <div class="registry-cell">
          <span class="registry-label">Início do tratamento</span>
          <span class="registry-value">${display(formatBookletDate(t.treatmentStartDate))}</span>
        </div>
      </div>
      <div class="registry-grid three">
        <div class="registry-cell">
          <span class="registry-label">Forma clínica</span>
          ${checkGroup(`
            ${check(t.clinicalForm === 'I', 'I')}
            ${check(t.clinicalForm === 'T', 'T')}
            ${check(t.clinicalForm === 'D', 'D')}
            ${check(t.clinicalForm === 'V', 'V')}
          `)}
        </div>
        <div class="registry-cell">
          <span class="registry-label">Baciloscopia</span>
          ${fieldInline('Data', formatBookletDate(t.baciloscopyDate))}
          ${fieldInline('IB', t.baciloscopyIB)}
          ${field('Exame de apoio', t.diagnosticSupportExam)}
        </div>
        <div class="registry-cell">
          <span class="registry-label">Avaliação GIF</span>
          ${checkGroup(`
            ${check(t.gifAssessment === 'grau_0', 'Grau 0')}
            ${check(t.gifAssessment === 'grau_1', 'Grau 1')}
            ${check(t.gifAssessment === 'grau_2', 'Grau 2')}
          `)}
        </div>
      </div>
    </div>`;

  return section('Registro clínico', body, 'section-registry');
}

function reactionSection(t: PatientTreatmentData): string {
  const meds = [
    ['Prednisona', t.prednisoneMgKg, 'mg/kg'],
    ['AINE', t.aineMgDay, 'mg/dia'],
    ['Talidomida', t.thalidomideMgDay, 'mg/dia'],
    ['Pentoxifilina', t.pentoxifyllineMgDay, 'mg/dia'],
  ] as const;

  const institutedRows =
    t.institutedMedications.length > 0
      ? t.institutedMedications
          .map(
            (m) =>
              `<li><strong>${esc(m.name)}</strong> — ${esc(m.dose)} ${esc(m.unit)} / ${esc(m.frequency)}</li>`
          )
          .join('')
      : meds
          .filter(([, dose]) => dose.trim())
          .map(([name, dose, unit]) => `<li><strong>${esc(name)}</strong>: ${esc(dose)} ${esc(unit)}</li>`)
          .join('');

  const body = `
    <div class="panel">
      <p class="panel-question">Episódio reacional por ocasião do diagnóstico</p>
      ${checkGroup(`
        ${check(t.reactionEpisodeAtDiagnosis === 'sim', 'Sim')}
        ${check(t.reactionEpisodeAtDiagnosis === 'nao', 'Não')}
      `)}
      ${
        t.reactionEpisodeAtDiagnosis === 'sim'
          ? `
        <div class="field-grid two-col nested">
          ${field('Tipo do episódio', BOOKLET_OPTION_HELPERS.reactionType(t.reactionEpisodeType))}
          ${field('Data', formatBookletDate(t.reactionEpisodeDate))}
        </div>`
          : ''
      }
      <p class="panel-title">Medicamentos instituídos</p>
      <ul class="med-list">${institutedRows || '<li class="empty-val">Nenhum registrado</li>'}</ul>
      ${field('Outro medicamento', t.otherMedication)}
      ${field('Outras condutas', t.otherConducts)}
    </div>`;

  return section('Episódio reacional e medicamentos', body);
}

function supervisedDoseSection(data: PatientBookletData): string {
  const rows = data.supervisedDoses;
  const tableRows = Array.from({ length: 12 }, (_, index) => {
    const row = rows[index];
    return `<tr>
      <td class="dose-num">Dose ${index + 1}</td>
      <td>
        ${row ? `<span class="med-name">${esc(row.medicationName)}</span>` : '<span class="empty-val">—</span>'}
        <div class="dose-date">${row ? esc(formatBookletDate(row.dateIso)) : '—'}</div>
      </td>
      <td>${row?.schedulingDateIso ? esc(formatBookletDate(row.schedulingDateIso)) : '<span class="empty-val">—</span>'}</td>
    </tr>`;
  }).join('');

  const body = `
    <p class="section-lead">Poliquimioterapia ou esquema substitutivo — registro de doses supervisionadas e aprazamentos.</p>
    <table class="data-table dose-table">
      <thead>
        <tr>
          <th scope="col">Nº</th>
          <th scope="col">Dose supervisionada (medicamento e data)</th>
          <th scope="col">Aprazamento</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    ${rows.length === 0 ? '<p class="empty-note">Nenhuma dose supervisionada registrada no Pequi.</p>' : ''}`;

  return section('Dose supervisionada e aprazamento', body);
}

function substituteSchemeSection(t: PatientTreatmentData): string {
  const checks = SUBSTITUTE_SCHEME_MEDICATION_OPTIONS.map((opt) => {
    const key = opt.key;
    const checked =
      (key === 'clofazimina' && t.schemeClofazimina) ||
      (key === 'ofloxacino' && t.schemeOfloxacino) ||
      (key === 'rifampicina' && t.schemeRifampicina) ||
      (key === 'minociclina' && t.schemeMinociclina) ||
      (key === 'dapsone' && t.schemeDapsone);
    return check(checked, opt.label);
  }).join('');

  const body = `
    <div class="scheme-banner">Esquema substitutivo</div>
    ${field('Data da mudança de esquema', formatBookletDate(t.substituteSchemeChangeDate))}
    <div class="subsection">
      <p class="subsection-title">Intolerância</p>
      ${checkGroup(`
        ${check(t.intoleranceDapsone, 'Dapsona')}
        ${check(t.intoleranceRifampicin, 'Rifampicina')}
        ${check(t.intoleranceClofazimine, 'Clofazimina')}
      `)}
    </div>
    <div class="subsection">
      <p class="subsection-title">Esquema medicamentoso</p>
      ${checkGroup(checks)}
      ${field('Medicamento da dose mensal (atual)', t.currentDoseMedication)}
    </div>`;

  return section('Esquema substitutivo', body);
}

function ansSection(data: PatientBookletData): string {
  if (data.neurologicalAssessments.length === 0) {
    return section(
      'Avaliação Neurológica Simplificada (ANS)',
      '<p class="empty-note">Nenhuma avaliação neurológica registrada no Pequi.</p>'
    );
  }

  return data.neurologicalAssessments
    .map((row, index) => {
      const body = `
        <p class="ans-context">${esc(row.contextLabel)}</p>
        <div class="ans-grid">
          <div class="ans-panel">
            <span class="ans-side-label">Avaliação</span>
            ${field('Data', formatBookletDate(row.assessmentDate))}
            ${field('GIF — Olho', row.gifEye)}
            ${field('GIF — Mão', row.gifHand)}
            ${field('GIF — Pé', row.gifFoot)}
          </div>
          <div class="ans-panel">
            ${field('Maior GIF', row.highestGif)}
            ${field('Soma OMP', row.ompSum)}
            ${field('Conduta', row.conduct)}
            ${field('UBS', row.ubs)}
            ${field('Referência', row.reference)}
          </div>
        </div>`;
      const title =
        data.neurologicalAssessments.length > 1
          ? `Avaliação Neurológica Simplificada (ANS) — ${index + 1}`
          : 'Avaliação Neurológica Simplificada (ANS)';
      return section(title, body, 'section-ans');
    })
    .join('');
}

function appointmentsSection(data: PatientBookletData): string {
  const rows = data.appointments;
  const body =
    rows.length > 0
      ? `
    <table class="data-table agenda-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Hora</th>
          <th>Local</th>
          <th>Consulta / exame</th>
          <th>Profissional</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
          <td>${esc(formatBookletDate(r.dateIso))}</td>
          <td>${esc(r.time)}</td>
          <td>${esc(r.location)}</td>
          <td>${esc(r.typeLabel)}</td>
          <td>${esc(r.professional)}</td>
          <td><span class="status-pill ${r.statusLabel === 'Realizada' ? 'done' : 'pending'}">${esc(r.statusLabel)}</span></td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>`
      : '<p class="empty-note">Nenhuma consulta ou exame registrado no Pequi.</p>';

  return section('Agenda de consultas e exames', body);
}

function dischargeSection(t: PatientTreatmentData): string {
  const body = `
    <div class="panel">
      <p class="panel-title">Alta do tratamento da PQT / esquema substitutivo</p>
      ${field('Data da alta', formatBookletDate(t.pqtDischargeDate))}
      <div class="subsection">
        <p class="subsection-title">Classificação do GIF na alta</p>
        ${checkGroup(`
          ${check(t.gifAssessmentAtDischarge === 'grau_0', 'GIF 0')}
          ${check(t.gifAssessmentAtDischarge === 'grau_1', 'GIF 1')}
          ${check(t.gifAssessmentAtDischarge === 'grau_2', 'GIF 2')}
        `)}
      </div>
      <div class="subsection">
        <p class="panel-question">Episódio reacional por ocasião da alta</p>
        ${checkGroup(`
          ${check(t.reactionEpisodeAtDischarge === 'sim', 'Sim')}
          ${check(t.reactionEpisodeAtDischarge === 'nao', 'Não')}
        `)}
        ${
          t.reactionEpisodeAtDischarge === 'sim'
            ? `<div class="field-grid two-col nested">
          ${field('Tipo', BOOKLET_OPTION_HELPERS.reactionType(t.reactionEpisodeTypeAtDischarge))}
          ${field('Data', formatBookletDate(t.reactionEpisodeDateAtDischarge))}
        </div>`
            : ''
        }
      </div>
      <div class="field-grid two-col">
        ${field('Prednisona (alta)', t.dischargePrednisoneMgKg)}
        ${field('AINE (alta)', t.dischargeAineMgDay)}
        ${field('Talidomida (alta)', t.dischargeThalidomideMgDay)}
        ${field('Pentoxifilina (alta)', t.dischargePentoxifyllineMgDay)}
        ${field('Outro medicamento', t.dischargeOtherMedication)}
        ${field('Outras condutas', t.dischargeOtherConducts)}
      </div>
    </div>`;

  return section('Alta do tratamento', body);
}

function bookletStyles(): string {
  return `
    :root {
      --purple: ${PURPLE};
      --purple-dark: ${PURPLE_DARK};
      --purple-light: ${PURPLE_LIGHT};
      --purple-border: ${PURPLE_BORDER};
      --text-muted: ${TEXT_MUTED};
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
      color: var(--purple-dark);
      margin: 0;
      background: #faf8fc;
      font-size: 13px;
      line-height: 1.5;
    }
    .document {
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 4px 24px rgba(91, 58, 122, 0.08);
    }
    .doc-inner { padding: 20px 24px 32px; }

    .print-hint {
      background: linear-gradient(135deg, #eef2ff 0%, #f3edf8 100%);
      border-bottom: 1px solid var(--purple-border);
      padding: 12px 24px;
      font-size: 12px;
      color: var(--purple-dark);
    }

    .legal-notice {
      display: flex;
      gap: 14px;
      background: #fff8e6;
      border: 1.5px solid #e8c96a;
      border-left: 5px solid #d4a017;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .legal-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #d4a017;
      color: #fff;
      font-weight: 800;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .legal-text { flex: 1; font-size: 12px; color: #4a3f20; line-height: 1.55; }
    .legal-text strong { color: #3d3418; }
    .legal-text p { margin: 0 0 8px; }
    .legal-text p:last-child { margin-bottom: 0; }

    .doc-header {
      text-align: center;
      padding-bottom: 20px;
      margin-bottom: 8px;
      border-bottom: 3px double var(--purple);
    }
    .doc-brand {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .doc-app {
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--purple);
      background: var(--purple-light);
      padding: 4px 12px;
      border-radius: 999px;
    }
    .doc-tag {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .doc-header h1 {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 800;
      color: var(--purple);
      line-height: 1.25;
      text-transform: none;
    }
    .doc-subtitle {
      margin: 0 0 10px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .doc-meta {
      font-size: 12px;
      color: var(--text-muted);
    }

    .booklet-section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .section-head {
      margin-bottom: 12px;
    }
    .section-head h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: #fff;
      background: var(--purple);
      padding: 8px 14px;
      border-radius: 6px 6px 0 0;
      letter-spacing: 0.02em;
    }
    .section-body {
      border: 1.5px solid var(--purple-border);
      border-top: none;
      border-radius: 0 0 8px 8px;
      padding: 16px;
      background: #fff;
    }
    .section-lead {
      margin: 0 0 12px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .field { margin-bottom: 12px; }
    .field-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--purple);
      margin-bottom: 3px;
    }
    .field-value {
      font-size: 14px;
      color: var(--purple-dark);
      padding: 6px 0 4px;
      border-bottom: 1.5px solid var(--purple-border);
      min-height: 1.6em;
    }
    .field-value.inline { display: inline-block; min-width: 80px; margin-left: 6px; }
    .field-inline { margin-bottom: 8px; }
    .empty-val { color: #9ca3af; font-style: italic; }

    .field-grid { display: grid; gap: 4px 16px; }
    .field-grid.two-col { grid-template-columns: 1fr 1fr; }
    .field-grid.three-col { grid-template-columns: 1fr 1fr 1fr; }
    .field-grid.nested { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--purple-border); }

    .subsection { margin: 14px 0; }
    .subsection-title {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 700;
      color: var(--purple);
    }
    .hint-line { margin: 0 0 8px; font-size: 12px; color: var(--text-muted); }

    .check-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
    }
    .check-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      cursor: default;
    }
    .check-box {
      width: 14px;
      height: 14px;
      border: 1.5px solid var(--purple);
      border-radius: 3px;
      flex-shrink: 0;
      position: relative;
      background: #fff;
    }
    .check-box.checked::after {
      content: "";
      position: absolute;
      left: 3px;
      top: 0px;
      width: 5px;
      height: 9px;
      border: solid var(--purple);
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .panel {
      border: 1px solid var(--purple-border);
      border-radius: 6px;
      padding: 12px 14px;
      margin-top: 12px;
      background: #fdfcfe;
    }
    .panel.tinted { background: var(--purple-light); }
    .panel-title {
      margin: 0 0 10px;
      font-weight: 700;
      font-size: 12px;
      color: var(--purple);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .panel-question {
      margin: 0 0 8px;
      font-weight: 600;
      font-size: 13px;
    }
    .divider {
      height: 1px;
      background: var(--purple-border);
      margin: 16px 0;
    }

    .registry-box {
      border: 2px solid var(--purple);
      border-radius: 6px;
      overflow: hidden;
    }
    .registry-row.highlight {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: var(--purple-light);
      border-bottom: 1px solid var(--purple-border);
    }
    .registry-label {
      font-weight: 800;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--purple);
    }
    .registry-value { font-size: 15px; font-weight: 600; }
    .registry-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .registry-grid.three { grid-template-columns: 1fr 1fr 1fr; }
    .registry-cell {
      padding: 12px 14px;
      border-top: 1px solid var(--purple-border);
      border-right: 1px solid var(--purple-border);
    }
    .registry-cell:nth-child(2n) { border-right: none; }
    .registry-grid.three .registry-cell:nth-child(2n) { border-right: 1px solid var(--purple-border); }
    .registry-grid.three .registry-cell:last-child { border-right: none; }

    .scheme-banner {
      text-align: center;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--purple);
      border: 1.5px solid var(--purple);
      padding: 10px;
      margin-bottom: 14px;
      border-radius: 4px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .data-table th {
      background: var(--purple);
      color: #fff;
      font-weight: 700;
      text-align: left;
      padding: 10px 8px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .data-table td {
      border: 1px solid var(--purple-border);
      padding: 10px 8px;
      vertical-align: top;
    }
    .data-table tbody tr:nth-child(even) { background: var(--purple-light); }
    .dose-num { font-weight: 700; color: var(--purple); white-space: nowrap; width: 56px; }
    .med-name { font-weight: 600; display: block; }
    .dose-date { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-pill.done { background: #dcfce7; color: #166534; }
    .status-pill.pending { background: #fef3c7; color: #92400e; }

    .ans-context {
      margin: 0 0 12px;
      font-size: 12px;
      color: var(--text-muted);
      font-style: italic;
    }
    .ans-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .ans-panel {
      border: 1px solid var(--purple-border);
      border-radius: 6px;
      padding: 12px;
      background: var(--purple-light);
    }

    .med-list {
      margin: 0;
      padding-left: 18px;
    }
    .med-list li { margin-bottom: 4px; }

    .empty-note {
      margin: 0;
      padding: 16px;
      text-align: center;
      font-style: italic;
      color: var(--text-muted);
      background: var(--purple-light);
      border-radius: 6px;
    }

    .doc-footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 2px solid var(--purple-border);
      text-align: center;
      font-size: 11px;
      color: var(--text-muted);
    }
    .doc-footer strong { color: var(--purple); }

    @media print {
      body { background: #fff; }
      .document { box-shadow: none; max-width: none; }
      .doc-inner { padding: 10mm 12mm; }
      .no-print { display: none !important; }
      .booklet-section { page-break-inside: avoid; }
      .legal-notice { break-inside: avoid; }
    }
    @media (max-width: 640px) {
      .field-grid.two-col,
      .field-grid.three-col,
      .registry-grid,
      .registry-grid.three,
      .ans-grid { grid-template-columns: 1fr; }
      .agenda-table { font-size: 10px; }
    }
  `;
}

export function buildBookletHtml(data: PatientBookletData): string {
  const generated = formatBookletDate(data.generatedAt.slice(0, 10));
  const patientName = data.personal.fullName || data.personal.socialName;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cartilha — Pequi</title>
  <style>${bookletStyles()}</style>
</head>
<body>
  <div class="document">
    ${printHint()}
    <div class="doc-inner">
      ${documentHeader(generated, patientName)}
      ${disclaimerBlock()}
      ${personalSection(data.personal)}
      ${clinicalRegisterSection(data.treatment)}
      ${reactionSection(data.treatment)}
      ${supervisedDoseSection(data)}
      ${substituteSchemeSection(data.treatment)}
      ${ansSection(data)}
      ${appointmentsSection(data)}
      ${dischargeSection(data.treatment)}
      ${disclaimerBlock()}
      ${documentFooter()}
    </div>
  </div>
</body>
</html>`;
}
