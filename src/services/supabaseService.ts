import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { Company, AssessmentSession, ProfessionalProfile } from '../types';
import { MOCK_COMPANIES, MOCK_SESSIONS, MOCK_PROFILE } from '../data/mockData';

const LOCAL_STORAGE_KEYS = {
  COMPANIES: 'psychorisk_companies_v1',
  SESSIONS: 'psychorisk_sessions_v1',
  PROFILE: 'psychorisk_profile_v1',
};

// ==========================================
// HELPERS: Local Storage Fallback & Cache
// ==========================================

export const getLocalCompanies = (): Company[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANIES);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler empresas do localStorage:', e);
  }
  return MOCK_COMPANIES;
};

export const setLocalCompanies = (companies: Company[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  } catch (e) {
    console.error('Erro ao salvar empresas no localStorage:', e);
  }
};

export const getLocalSessions = (): AssessmentSession[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEYS.SESSIONS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler sessões do localStorage:', e);
  }
  return MOCK_SESSIONS;
};

export const setLocalSessions = (sessions: AssessmentSession[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Erro ao salvar sessões no localStorage:', e);
  }
};

export const getLocalProfile = (): ProfessionalProfile => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILE);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler perfil do localStorage:', e);
  }
  return MOCK_PROFILE;
};

export const setLocalProfile = (profile: ProfessionalProfile): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Erro ao salvar perfil no localStorage:', e);
  }
};

// ==========================================
// DATA CONVERTERS
// ==========================================

const mapDbCompanyToApp = (dbRow: any): Company => {
  return {
    id: dbRow.id,
    corporateName: dbRow.corporate_name,
    tradeName: dbRow.trade_name,
    cnpj: dbRow.cnpj,
    cnae: dbRow.cnae || '',
    economicActivity: dbRow.economic_activity || '',
    riskDegree: dbRow.risk_degree || '',
    unit: dbRow.unit || '',
    segment: dbRow.segment || '',
    address: dbRow.address || '',
    city: dbRow.city || '',
    state: dbRow.state || '',
    rhContactName: dbRow.rh_contact_name || '',
    rhContactEmail: dbRow.rh_contact_email || '',
    rhContactPhone: dbRow.rh_contact_phone || '',
    employeeCount: Number(dbRow.employee_count) || 0,
    respondedEmployeeCount: Number(dbRow.responded_employee_count) || 0,
    logoUrl: dbRow.logo_url || '',
    status: dbRow.status || 'active',
    lastAssessment: dbRow.last_assessment || '',
    applicationPeriod: dbRow.application_period || '',
    referenceYear: dbRow.reference_year || '',
    technicalReference: dbRow.technical_reference || '',
    departments: Array.isArray(dbRow.departments) ? dbRow.departments : [],
    campaigns: Array.isArray(dbRow.campaigns) ? dbRow.campaigns : [],
  };
};

const mapAppCompanyToDb = (company: Company) => {
  return {
    id: company.id,
    corporate_name: company.corporateName,
    trade_name: company.tradeName,
    cnpj: company.cnpj,
    cnae: company.cnae || null,
    economic_activity: company.economicActivity || null,
    risk_degree: company.riskDegree ? String(company.riskDegree) : null,
    unit: company.unit || null,
    segment: company.segment || null,
    address: company.address || null,
    city: company.city || null,
    state: company.state || null,
    rh_contact_name: company.rhContactName || null,
    rh_contact_email: company.rhContactEmail || null,
    rh_contact_phone: company.rhContactPhone || null,
    employee_count: company.employeeCount,
    responded_employee_count: company.respondedEmployeeCount || 0,
    logo_url: company.logoUrl || null,
    status: company.status,
    last_assessment: company.lastAssessment || null,
    application_period: company.applicationPeriod || null,
    reference_year: company.referenceYear || null,
    technical_reference: company.technicalReference || null,
    departments: company.departments || [],
    campaigns: company.campaigns || [],
  };
};

const mapDbSessionToApp = (dbRow: any): AssessmentSession => {
  return {
    id: dbRow.id,
    companyId: dbRow.company_id,
    campaignId: dbRow.campaign_id || undefined,
    departmentId: dbRow.department_id,
    departmentName: dbRow.department_name,
    roleName: dbRow.role_name,
    employeeIdentifier: dbRow.employee_identifier,
    isAnonymous: dbRow.is_anonymous ?? true,
    tenureYears: dbRow.tenure_years != null ? Number(dbRow.tenure_years) : undefined,
    workShift: dbRow.work_shift || undefined,
    responses: Array.isArray(dbRow.responses) ? dbRow.responses : [],
    clinicalNotes: dbRow.clinical_notes || undefined,
    createdAt: dbRow.created_at,
  };
};

const mapAppSessionToDb = (session: AssessmentSession) => {
  return {
    id: session.id,
    company_id: session.companyId,
    campaign_id: session.campaignId || null,
    department_id: session.departmentId,
    department_name: session.departmentName,
    role_name: session.roleName,
    employee_identifier: session.employeeIdentifier,
    is_anonymous: session.isAnonymous,
    tenure_years: session.tenureYears ?? null,
    work_shift: session.workShift || null,
    responses: session.responses,
    clinical_notes: session.clinicalNotes || null,
    created_at: session.createdAt,
  };
};

const mapDbProfileToApp = (dbRow: any): ProfessionalProfile => {
  return {
    id: dbRow.id,
    name: dbRow.name,
    councilRegister: dbRow.council_register,
    specialty: dbRow.specialty,
    email: dbRow.email,
    phone: dbRow.phone,
    signatureUrl: dbRow.signature_url || undefined,
    consultancyName: dbRow.consultancy_name,
    consultancyLogoUrl: dbRow.consultancy_logo_url || undefined,
  };
};

const mapAppProfileToDb = (profile: ProfessionalProfile) => {
  return {
    id: profile.id || 'default-profile',
    name: profile.name,
    council_register: profile.councilRegister,
    specialty: profile.specialty,
    email: profile.email,
    phone: profile.phone,
    signature_url: profile.signatureUrl || null,
    consultancy_name: profile.consultancyName,
    consultancy_logo_url: profile.consultancyLogoUrl || null,
  };
};

// ==========================================
// SUPABASE SERVICE CRUD OPERATIONS
// ==========================================

export const dbService = {
  // Test connection status and returns diagnostic info
  async testConnection(): Promise<{ connected: boolean; message: string; latencyMs?: number }> {
    if (!isSupabaseConfigured()) {
      return { 
        connected: false, 
        message: 'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.' 
      };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { connected: false, message: 'Cliente Supabase indisponível.' };
    }

    try {
      const startTime = performance.now();
      const { error } = await client.from('companies').select('id').limit(1);
      const latencyMs = Math.round(performance.now() - startTime);

      if (error) {
        return { 
          connected: false, 
          message: `Erro ao conectar: ${error.message} (Código: ${error.code || 'Desconhecido'}). Certifique-se de ter executado o script schema.sql no Supabase.` 
        };
      }

      return { 
        connected: true, 
        message: 'Conexão ativa com o banco de dados Supabase.',
        latencyMs 
      };
    } catch (err: any) {
      return { 
        connected: false, 
        message: `Falha na requisição ao Supabase: ${err?.message || 'Erro de rede'}` 
      };
    }
  },

  // COMPANIES
  async fetchCompanies(): Promise<Company[]> {
    const client = getSupabaseClient();
    if (!client) {
      return getLocalCompanies();
    }

    try {
      const { data, error } = await client
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao buscar empresas do Supabase, usando cache local:', error.message);
        return getLocalCompanies();
      }

      if (data && data.length > 0) {
        const companies = data.map(mapDbCompanyToApp);
        setLocalCompanies(companies);
        return companies;
      }

      // If Supabase table is empty, seed with initial mock companies
      const initialCompanies = getLocalCompanies();
      if (initialCompanies.length > 0) {
        for (const company of initialCompanies) {
          await client.from('companies').insert(mapAppCompanyToDb(company));
        }
      }
      return initialCompanies;
    } catch (e) {
      console.error('Exceção ao buscar empresas:', e);
      return getLocalCompanies();
    }
  },

  async saveCompany(company: Company): Promise<boolean> {
    // 1. Always update local storage
    const current = getLocalCompanies();
    const idx = current.findIndex(c => c.id === company.id);
    let updated: Company[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = company;
    } else {
      updated = [company, ...current];
    }
    setLocalCompanies(updated);

    // 2. Sync with Supabase if online
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const dbPayload = mapAppCompanyToDb(company);
      const { error } = await client
        .from('companies')
        .upsert(dbPayload, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao sincronizar empresa no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exceção ao salvar empresa no Supabase:', e);
      return false;
    }
  },

  async deleteCompany(id: string): Promise<boolean> {
    // 1. Remove from local
    const current = getLocalCompanies().filter(c => c.id !== id);
    setLocalCompanies(current);

    // 2. Remove from Supabase
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const { error } = await client
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar empresa no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exceção ao deletar empresa no Supabase:', e);
      return false;
    }
  },

  // SESSIONS (QUESTIONNAIRE RESPONSES)
  async fetchSessions(companyId?: string): Promise<AssessmentSession[]> {
    const client = getSupabaseClient();
    if (!client) {
      const all = getLocalSessions();
      return companyId ? all.filter(s => s.companyId === companyId) : all;
    }

    try {
      let query = client
        .from('assessment_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao buscar sessões do Supabase, usando local:', error.message);
        const all = getLocalSessions();
        return companyId ? all.filter(s => s.companyId === companyId) : all;
      }

      if (data) {
        const sessions = data.map(mapDbSessionToApp);
        // Update local cache
        const local = getLocalSessions();
        const merged = [
          ...sessions,
          ...local.filter(l => !sessions.some(s => s.id === l.id))
        ];
        setLocalSessions(merged);
        return sessions;
      }

      return getLocalSessions();
    } catch (e) {
      console.error('Exceção ao buscar sessões:', e);
      return getLocalSessions();
    }
  },

  async saveSession(session: AssessmentSession): Promise<boolean> {
    // 1. Save locally
    const current = getLocalSessions();
    const updated = [session, ...current.filter(s => s.id !== session.id)];
    setLocalSessions(updated);

    // 2. Save to Supabase
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const dbPayload = mapAppSessionToDb(session);
      const { error } = await client
        .from('assessment_sessions')
        .upsert(dbPayload, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar sessão no Supabase:', error.message);
        return false;
      }

      // Also update responded employee count in company table if needed
      const countRes = await client
        .from('assessment_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', session.companyId);

      if (countRes.count !== null) {
        await client
          .from('companies')
          .update({ 
            responded_employee_count: countRes.count,
            last_assessment: new Date().toISOString()
          })
          .eq('id', session.companyId);
      }

      return true;
    } catch (e) {
      console.error('Exceção ao salvar sessão no Supabase:', e);
      return false;
    }
  },

  // PROFILE
  async fetchProfile(): Promise<ProfessionalProfile> {
    const client = getSupabaseClient();
    if (!client) {
      return getLocalProfile();
    }

    try {
      const { data, error } = await client
        .from('consultancy_profiles')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao buscar perfil do Supabase, usando local:', error.message);
        return getLocalProfile();
      }

      if (data) {
        const profile = mapDbProfileToApp(data);
        setLocalProfile(profile);
        return profile;
      }

      // If empty in cloud, save local profile as seed
      const local = getLocalProfile();
      await client.from('consultancy_profiles').insert(mapAppProfileToDb(local));
      return local;
    } catch (e) {
      console.error('Exceção ao buscar perfil:', e);
      return getLocalProfile();
    }
  },

  async saveProfile(profile: ProfessionalProfile): Promise<boolean> {
    setLocalProfile(profile);
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const dbPayload = mapAppProfileToDb(profile);
      const { error } = await client
        .from('consultancy_profiles')
        .upsert(dbPayload, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar perfil no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exceção ao salvar perfil no Supabase:', e);
      return false;
    }
  },
};
