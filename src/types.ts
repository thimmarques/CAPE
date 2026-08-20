export type RiskLevel = 'low' | 'moderate' | 'high';
export type FavorabilityLevel = 'favorable' | 'warning' | 'critical'; // Favorável (>=67), Atenção (40-66), Crítico (<40)

export type UserRole = 'super_admin' | 'admin' | 'consultant' | 'evaluator';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  provider?: 'email' | 'google';
  createdAt?: string;
}

export const SUPER_ADMIN_EMAIL = 'thibasss@gmail.com';

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return email.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();
};

export interface ProfessionalProfile {
  id: string;
  name: string;
  councilRegister: string; // ex: CRP 06/123456 ou CRM 123456
  specialty: string; // ex: Psicologia Ocupacional e Saúde do Trabalho
  email: string;
  phone: string;
  signatureUrl?: string;
  consultancyName: string;
  consultancyLogoUrl?: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  roles: string[];
  headcount: number;
}

export interface AssessmentCampaign {
  id: string;
  companyId: string;
  title: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'archived';
  targetCount: number;
  completedCount: number;
}

export interface Company {
  id: string;
  corporateName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  cnpj: string;
  cnae?: string;
  economicActivity?: string; // Atividade Econômica Principal
  riskDegree?: number | string; // Grau de Risco (ex: 3)
  unit?: string; // Unidade (ex: Unidade S)
  segment?: string;
  address?: string;
  city?: string;
  state?: string;
  rhContactName?: string;
  rhContactEmail?: string;
  rhContactPhone?: string;
  employeeCount: number;
  respondedEmployeeCount?: number; // Total de colaboradores que responderam o questionário (base de cálculo efetiva)
  logoUrl?: string;
  status: 'active' | 'inactive';
  lastAssessment?: string;
  applicationPeriod?: string; // ex: Junho e julho de 2026
  referenceYear?: string; // ex: 2025/2026
  technicalReference?: string; // ex: NR-1 e Portaria MTE nº 1.419/2024
  adherenceRate?: number;
  departments: Department[];
  campaigns: AssessmentCampaign[];
}

export interface Dimension {
  id: string;
  name: string;
  description: string;
  items: number[];
}

export interface Question {
  id: number;
  text: string;
  dimensionId: string;
  isConductIndicator?: 'stability' | 'bullying' | 'sexual_harassment';
}

export interface AssessmentResponse {
  questionId: number;
  score: 1 | 2 | 3 | 4;
}

export interface RespondentPrefill {
  companyId?: string;
  departmentId?: string;
  roleName?: string;
  workShift?: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral' | 'Escala 12x36';
  tenureYears?: number;
  isAnonymous?: boolean;
}

export interface AssessmentSession {
  id: string;
  companyId: string;
  campaignId?: string;
  departmentId: string;
  departmentName: string;
  roleName: string;
  employeeIdentifier: string;
  isAnonymous: boolean;
  tenureYears?: number;
  workShift?: 'Matutino' | 'Vespertino' | 'Noturno' | 'Integral' | 'Escala 12x36';
  responses: AssessmentResponse[];
  clinicalNotes?: string;
  createdAt: string;
}

export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  averageScore: number; // 1.00 a 4.00
  favorabilityIndex: number; // 0 a 100
  favorabilityLevel: FavorabilityLevel; // Favorável | Atenção | Crítico
  riskLevel: RiskLevel;
  totalResponses: number;
  disagreementRate: number; // % 1 e 2
}

export interface DepartmentFavorabilityScore {
  dimensionId: string;
  dimensionName: string;
  favorabilityIndex: number; // 0 a 100
  favorabilityLevel: FavorabilityLevel;
  averageScore: number;
}

export interface DepartmentRiskScore {
  departmentId: string;
  departmentName: string;
  averageScore: number;
  favorabilityIndex: number; // 0 a 100
  favorabilityLevel: FavorabilityLevel;
  riskLevel: RiskLevel;
  respondentsCount: number;
  totalEmployees: number;
  adherenceRate: number;
  percentageOfTotal: number; // % da amostra total
  dimensionScores: DepartmentFavorabilityScore[];
  isSmallSample: boolean; // Amostra < 12 participantes (indicativo)
}

export interface CriticalItem {
  questionId: number;
  text: string;
  dimensionName: string;
  disagreementRate: number; // % Discordo + Discordo Fortemente
  stronglyDisagreeRate: number;
  disagreeRate: number;
  agreeRate: number;
  stronglyAgreeRate: number;
  averageScore: number;
  favorabilityIndex: number; // 0 a 100
}

export interface ConductIndicatorStats {
  title: string;
  dimension: string;
  overallFavorability?: number; // Para estabilidade
  overallRate: number; // % de ocorrência para assédio
  frequentRate?: number; // % com frequência "às vezes" ou mais
  overallAffectedCount: number;
  totalParticipants: number;
  status: FavorabilityLevel;
  distribution: {
    nunca: number;
    raramente: number;
    asVezes: number;
    frequente: number;
    sempre: number;
  };
  departmentStats: {
    departmentId: string;
    departmentName: string;
    rate: number;
    affectedCount: number;
    totalDept: number;
    status: FavorabilityLevel;
    favorabilityIndex?: number;
  }[];
  interpretiveNotes: string;
}

export interface AnalyticsReport {
  companyId: string;
  companyName: string;
  corporateName: string;
  cnpj: string;
  cnae: string;
  economicActivity: string;
  riskDegree: number | string;
  unit: string;
  referenceYear: string;
  applicationPeriod: string;
  technicalReference: string;
  technicalTeam: string;
  campaignTitle: string;
  evaluatedDate: string;
  totalEmployees: number;
  evaluatedEmployees: number;
  unansweredEmployees: number;
  unansweredRate: number;
  adherenceRate: number;
  overallScore: number; // 1.00 a 4.00
  overallFavorability: number; // 0 a 100
  overallRiskLevel: RiskLevel;
  overallFavorabilityLevel: FavorabilityLevel;
  dimensionScores: DimensionScore[];
  departmentScores: DepartmentRiskScore[];
  criticalItems: CriticalItem[];
  worstQuestions: CriticalItem[]; // As 8 piores avaliadas para intervenção
  stabilityStats: ConductIndicatorStats;
  moralHarassmentStats: ConductIndicatorStats;
  sexualHarassmentStats: ConductIndicatorStats;
  allItemStats: {
    questionId: number;
    text: string;
    dimensionId: string;
    dimensionName: string;
    avgScore: number;
    favorabilityIndex: number;
    scoreDistribution: { 1: number; 2: number; 3: number; 4: number };
  }[];
  synthesisText: string;
  technicalConclusion: string;
  actionPlanRecommendations: {
    action: string;
    dimension: string;
    responsible: string;
    deadline: string;
    indicator: string;
  }[];
}
