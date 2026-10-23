import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ConductRisks {
  moralHarassmentReported?: boolean;
  moralHarassmentPercentage?: number;
  sexualHarassmentReported?: boolean;
  sexualHarassmentPercentage?: number;
  discriminationReported?: boolean;
  discriminationPercentage?: number;
  notes?: string;
}

export interface RawResponses {
  [questionId: string]: {
    questionText: string;
    dimension: string;
    score: number; // 1 a 4 ou 1 a 5
  };
}

export interface AssessmentPayload {
  companyId: string;
  companyName: string;
  companyCnpj?: string;
  departmentId?: string;
  departmentName: string;
  sampleSize: number;
  evaluatorId?: string;
  evaluatorName: string;
  evaluatorEmail: string;
  overallFavorabilityRate: number;
  riskLevel: RiskLevel;
  rawResponses: RawResponses;
  conductRisks?: ConductRisks;
  categoryAverages?: Record<string, number>;
  individualParticipantSessions?: any[];
}

export interface AssessmentData extends AssessmentPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'DRAFT' | 'COMPLETED' | 'ARCHIVED';
}

const LOCAL_STORAGE_SNAPSHOTS_KEY = 'psychorisk_assessments_snapshots_v1';

export const assessmentSnapshotService = {
  /**
   * RF09: Grava o snapshot com integridade no Supabase (com contingência local garantida)
   */
  async saveAssessment(payload: AssessmentPayload): Promise<{ success: boolean; data?: AssessmentData; error?: string }> {
    const client = getSupabaseClient();
    const fallbackId = `snap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const formattedPayload = {
      company_id: payload.companyId,
      company_name: payload.companyName,
      company_cnpj: payload.companyCnpj || '',
      department_id: payload.departmentId || null,
      department_name: payload.departmentName,
      sample_size: payload.sampleSize,
      evaluator_id: payload.evaluatorId || null,
      evaluator_name: payload.evaluatorName,
      evaluator_email: payload.evaluatorEmail,
      overall_favorability_rate: payload.overallFavorabilityRate,
      risk_level: payload.riskLevel,
      raw_responses: payload.rawResponses,
      conduct_risks: payload.conductRisks || {},
      category_averages: payload.categoryAverages || {},
      status: 'COMPLETED',
      created_at: nowIso,
      updated_at: nowIso,
    };

    let persistedRecord: AssessmentData = {
      id: fallbackId,
      ...payload,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: 'COMPLETED',
    };

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('assessments')
          .insert(formattedPayload)
          .select()
          .single();

        if (error) {
          console.warn('Erro ao persistir na tabela assessments do Supabase:', error.message);
        } else if (data) {
          persistedRecord = {
            id: data.id,
            companyId: data.company_id,
            companyName: data.company_name,
            companyCnpj: data.company_cnpj,
            departmentId: data.department_id,
            departmentName: data.department_name,
            sampleSize: data.sample_size,
            evaluatorId: data.evaluator_id,
            evaluatorName: data.evaluator_name,
            evaluatorEmail: data.evaluator_email,
            overallFavorabilityRate: Number(data.overall_favorability_rate),
            riskLevel: data.risk_level as RiskLevel,
            rawResponses: data.raw_responses,
            conductRisks: data.conduct_risks,
            categoryAverages: data.category_averages,
            status: data.status,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          };
        }
      } catch (err: any) {
        console.error('Falha ao comunicar com Supabase:', err);
      }
    }

    // Persistência redundante em storage local
    this.saveLocalBackup(persistedRecord);

    return {
      success: true,
      data: persistedRecord,
    };
  },

  /**
   * Salva no storage local para histórico de contingência
   */
  saveLocalBackup(record: AssessmentData): void {
    try {
      const existingRaw = localStorage.getItem(LOCAL_STORAGE_SNAPSHOTS_KEY);
      const list: AssessmentData[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [record, ...list.filter(item => item.id !== record.id)];
      localStorage.setItem(LOCAL_STORAGE_SNAPSHOTS_KEY, JSON.stringify(updated.slice(0, 50)));
    } catch (e) {
      console.error('Erro ao gravar backup local:', e);
    }
  },

  /**
   * Obtém backups locais
   */
  getLocalBackups(): AssessmentData[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SNAPSHOTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
};
