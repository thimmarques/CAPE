import { Company, ProfessionalProfile, AssessmentSession } from '../types';
import { QUESTIONS } from './questions';

export const MOCK_PROFILE: ProfessionalProfile = {
  id: 'prof-1',
  name: 'Equipe Técnica XXXX | Psicologia Ocupacional',
  councilRegister: 'CRP 06/XXXXX',
  specialty: 'Psicologia Ocupacional, Ergonomia e Avaliação de Riscos Psicossociais (NR-01)',
  email: 'contato@psicorisk-analytics.com.br',
  phone: '(11) 3288-9000',
  signatureUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=80',
  consultancyName: 'Consultoria Especializada em Saúde Ocupacional & Psicologia do Trabalho',
  consultancyLogoUrl: ''
};

export const MOCK_COMPANIES: Company[] = [
  {
    id: 'c-pltda',
    corporateName: 'P Ltda.',
    tradeName: 'P Ltda.',
    cnpj: '00.000.000/0001-00',
    cnae: '11.11-1-11 - Fabricação de embalagens de material plástico',
    economicActivity: 'Fabricação de Embalagens de Material Plástico',
    riskDegree: 3,
    unit: 'Unidade S',
    segment: 'Fabricação de Embalagens de Material Plástico',
    address: 'Av. das Indústrias, 1000 - Distrito Industrial',
    city: 'Sorocaba',
    state: 'SP',
    rhContactName: 'Gerência de Gente, Gestão e SESMT',
    rhContactEmail: 'rh.sesmt@pltda.com.br',
    rhContactPhone: '(15) 3200-1000',
    employeeCount: 160,
    respondedEmployeeCount: 144,
    status: 'active',
    lastAssessment: '2026-07-31',
    applicationPeriod: 'Junho e julho de 2026',
    referenceYear: '2025/2026',
    technicalReference: 'NR-1 e Portaria MTE nº 1.419/2024',
    adherenceRate: 90,
    departments: [
      { 
        id: 'dp-prod', 
        companyId: 'c-pltda', 
        name: 'Produção', 
        headcount: 94, 
        roles: ['Operador de Máquinas', 'Auxiliar de Produção', 'Técnico de Processo', 'Líder de Linha'] 
      },
      { 
        id: 'dp-oper', 
        companyId: 'c-pltda', 
        name: 'Operacional / Logística', 
        headcount: 11, 
        roles: ['Operador de Empilhadeira', 'Conferente', 'Auxiliar de Expedição'] 
      },
      { 
        id: 'dp-transp', 
        companyId: 'c-pltda', 
        name: 'Transporte', 
        headcount: 11, 
        roles: ['Motorista Operacional', 'Motorista de Distribuição', 'Encarregado de Frota'] 
      },
      { 
        id: 'dp-adm', 
        companyId: 'c-pltda', 
        name: 'Administrativo', 
        headcount: 11, 
        roles: ['Analista Administrativo', 'Assistente Financeiro', 'Faturista', 'Analista de RH'] 
      },
      { 
        id: 'dp-manut', 
        companyId: 'c-pltda', 
        name: 'Manutenção', 
        headcount: 10, 
        roles: ['Mecânico Industrial', 'Eletricista de Manutenção', 'Técnico de Manutenção'] 
      },
      { 
        id: 'dp-qual', 
        companyId: 'c-pltda', 
        name: 'Qualidade', 
        headcount: 7, 
        roles: ['Inspetor de Qualidade', 'Analista de Laboratório', 'Auditor de Qualidade'] 
      },
    ],
    campaigns: [
      {
        id: 'camp-p1',
        companyId: 'c-pltda',
        title: 'Censo e Análise de Riscos Psicossociais NR-01 - 2026',
        startDate: '2026-06-01',
        endDate: '2026-07-31',
        status: 'completed',
        targetCount: 160,
        completedCount: 144,
      }
    ]
  }
];

// Generate exact 144 completed sessions corresponding to the 6 sectors in the model report
function generateExactRealSessions(): AssessmentSession[] {
  const sessions: AssessmentSession[] = [];
  const company = MOCK_COMPANIES[0];

  company.departments.forEach(dept => {
    for (let i = 1; i <= dept.headcount; i++) {
      const responses = QUESTIONS.map(q => {
        let score: 1 | 2 | 3 | 4 = 3;
        
        // Autonomy and Control specific items
        if (q.id === 8) { // Autonomia na forma e na ordem das tarefas (média 3.56, favorabilidade 64)
          score = (i % 3 === 0 ? 2 : (i % 5 === 0 ? 3 : 4)) as 1|2|3|4;
        } else if (q.id === 9) { // Controle sobre o ritmo de trabalho (média 3.47, favorabilidade 62)
          score = (i % 3 === 0 ? 2 : (i % 4 === 0 ? 3 : 4)) as 1|2|3|4;
        } else if (q.id === 13) { // Feedback construtivo da liderança (média 3.16, favorabilidade 54)
          score = (i % 2 === 0 ? 2 : (i % 4 === 0 ? 1 : 4)) as 1|2|3|4;
        } else if (q.id === 17) { // Trabalho reconhecido e valorizado (média 3.53, favorabilidade 63)
          score = (i % 3 === 0 ? 2 : (i % 7 === 0 ? 3 : 4)) as 1|2|3|4;
        } else if (q.id === 30) { // Expressar opiniões sem medo de represália (média 3.60, favorabilidade 65)
          score = (i % 3 === 0 ? 2 : (i % 6 === 0 ? 3 : 4)) as 1|2|3|4;
        } else if (q.id === 31) { // Opiniões consideradas pela gestão (média 3.45, favorabilidade 61)
          score = (i % 3 === 0 ? 2 : (i % 5 === 0 ? 1 : 4)) as 1|2|3|4;
        } else if (q.id === 35) { // Conhece os canais para relatar problemas (média 3.65, favorabilidade 66)
          score = (i % 4 === 0 ? 2 : 4) as 1|2|3|4;
        } else if (q.id === 36) { // Ações de promoção de bem-estar (média 3.27, favorabilidade 57)
          score = (i % 2 === 0 ? 2 : (i % 5 === 0 ? 1 : 3)) as 1|2|3|4;
        } else if (q.id === 32) { // Estabilidade no emprego (Favorabilidade geral 85.2)
          score = (i % 7 === 0 ? 2 : 4) as 1|2|3|4;
        } else if (q.id === 37) { // Assédio Moral
          // Exact distribution per sector:
          // Produção: 31 de 94 (33.0%)
          // Operacional/Logística: 2 de 11 (18.2%)
          // Transporte: 0 de 11 (0.0%)
          // Administrativo: 2 de 11 (18.2%)
          // Manutenção: 5 de 10 (50.0%)
          // Qualidade: 3 de 7 (42.9%)
          if (dept.name === 'Produção') {
            score = (i <= 31 ? (i <= 3 ? 1 : 2) : 4) as 1|2|3|4;
          } else if (dept.name === 'Operacional / Logística') {
            score = (i <= 2 ? 2 : 4) as 1|2|3|4;
          } else if (dept.name === 'Transporte') {
            score = 4;
          } else if (dept.name === 'Administrativo') {
            score = (i <= 2 ? 2 : 4) as 1|2|3|4;
          } else if (dept.name === 'Manutenção') {
            score = (i <= 5 ? 2 : 4) as 1|2|3|4;
          } else if (dept.name === 'Qualidade') {
            score = (i <= 3 ? 2 : 4) as 1|2|3|4;
          }
        } else if (q.id === 38) { // Assédio Sexual
          // Exact distribution per sector:
          // Produção: 5 de 94 (5.3%)
          // Operacional/Logística: 1 de 11 (9.1%)
          // Transporte: 0 de 11 (0.0%)
          // Administrativo: 0 de 11 (0.0%)
          // Manutenção: 2 de 10 (20.0%)
          // Qualidade: 1 de 7 (14.3%)
          if (dept.name === 'Produção') {
            score = (i <= 5 ? 2 : 4) as 1|2|3|4;
          } else if (dept.name === 'Operacional / Logística') {
            score = (i <= 1 ? 2 : 4) as 1|2|3|4;
          } else if (dept.name === 'Transporte' || dept.name === 'Administrativo') {
            score = 4;
          } else if (dept.name === 'Manutenção') {
            score = (i <= 2 ? 2 : 4) as 1|2|3|4;
          } else if (dept.name === 'Qualidade') {
            score = (i <= 1 ? 2 : 4) as 1|2|3|4;
          }
        } else {
          score = (i % 6 === 0 ? 3 : 4) as 1|2|3|4;
        }

        return { questionId: q.id, score };
      });

      const role = dept.roles[i % dept.roles.length] || 'Colaborador';
      sessions.push({
        id: `sess-pltda-${dept.id}-${i}`,
        companyId: 'c-pltda',
        campaignId: 'camp-p1',
        departmentId: dept.id,
        departmentName: dept.name,
        roleName: role,
        employeeIdentifier: `Colaborador #${String(i).padStart(2, '0')} (${dept.name})`,
        isAnonymous: true,
        workShift: 'Integral',
        tenureYears: (i % 5) + 1,
        responses,
        createdAt: '2026-07-28T14:00:00.000Z'
      });
    }
  });

  return sessions;
}

export const MOCK_SESSIONS: AssessmentSession[] = generateExactRealSessions();
