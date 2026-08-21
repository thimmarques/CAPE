import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { 
  Company, 
  AssessmentSession, 
  ProfessionalProfile, 
  SavedTechnicalReport, 
  QuestionnaireTemplate,
  StorageBucketName,
  StoredFileItem
} from '../types';
import { MOCK_COMPANIES, MOCK_SESSIONS, MOCK_PROFILE } from '../data/mockData';
import { auditService } from './auditService';
import { QUESTIONS } from '../data/questions';

const LOCAL_STORAGE_KEYS = {
  COMPANIES: 'psychorisk_companies_v1',
  SESSIONS: 'psychorisk_sessions_v1',
  PROFILE: 'psychorisk_profile_v1',
  REPORTS: 'psychorisk_saved_reports_v1',
  TEMPLATES: 'psychorisk_templates_v1',
  STORAGE_FILES: 'psychorisk_storage_files_v1',
};

const DEFAULT_STORAGE_FILES: StoredFileItem[] = [
  {
    id: 'file-default-logo-1',
    bucket: 'company-assets',
    name: 'Logo Consultoria SST (Padrão)',
    url: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=400&auto=format&fit=crop&q=80',
    path: 'default_consultancy_logo.png',
    createdAt: '2025-01-10T10:00:00.000Z',
  },
  {
    id: 'file-default-sig-1',
    bucket: 'signatures',
    name: 'Assinatura Técnica Digitalizada',
    url: 'https://api.dicebear.com/7.x/initials/svg?seed=Assinatura+Tecnica',
    path: 'default_signature.svg',
    createdAt: '2025-01-15T14:30:00.000Z',
  }
];

export const getLocalStoredFiles = (): StoredFileItem[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEYS.STORAGE_FILES);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler arquivos do localStorage:', e);
  }
  return DEFAULT_STORAGE_FILES;
};

export const setLocalStoredFiles = (files: StoredFileItem[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.STORAGE_FILES, JSON.stringify(files));
  } catch (e) {
    console.error('Erro ao salvar arquivos no localStorage:', e);
  }
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

export const getLocalReports = (): SavedTechnicalReport[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEYS.REPORTS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler laudos do localStorage:', e);
  }
  return [];
};

export const setLocalReports = (reports: SavedTechnicalReport[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.error('Erro ao salvar laudos no localStorage:', e);
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

const mapDbReportToApp = (dbRow: any): SavedTechnicalReport => {
  return {
    id: dbRow.id,
    companyId: dbRow.company_id,
    companyName: dbRow.company_name,
    campaignId: dbRow.campaign_id || undefined,
    title: dbRow.title,
    referenceYear: dbRow.reference_year || '',
    applicationPeriod: dbRow.application_period || '',
    issuedDate: dbRow.issued_date,
    authorId: dbRow.author_id || undefined,
    authorName: dbRow.author_name || undefined,
    authorCouncilRegister: dbRow.author_council_register || undefined,
    overallScore: Number(dbRow.overall_score) || 0,
    overallFavorability: Number(dbRow.overall_favorability) || 0,
    overallRiskLevel: dbRow.overall_risk_level,
    adherenceRate: Number(dbRow.adherence_rate) || 0,
    totalRespondents: Number(dbRow.total_respondents) || 0,
    status: dbRow.status || 'published',
    analyticsData: dbRow.analytics_data,
    notes: dbRow.notes || undefined,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
  };
};

const mapAppReportToDb = (report: SavedTechnicalReport) => {
  return {
    id: report.id,
    company_id: report.companyId,
    company_name: report.companyName,
    campaign_id: report.campaignId || null,
    title: report.title,
    reference_year: report.referenceYear || null,
    application_period: report.applicationPeriod || null,
    issued_date: report.issuedDate,
    author_id: report.authorId || null,
    author_name: report.authorName || null,
    author_council_register: report.authorCouncilRegister || null,
    overall_score: report.overallScore,
    overall_favorability: report.overallFavorability,
    overall_risk_level: report.overallRiskLevel,
    adherence_rate: report.adherenceRate,
    total_respondents: report.totalRespondents,
    status: report.status,
    analytics_data: report.analyticsData,
    notes: report.notes || null,
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
    const current = getLocalCompanies();
    const isNew = !current.some(c => c.id === company.id);

    // 1. Always update local storage
    const idx = current.findIndex(c => c.id === company.id);
    let updated: Company[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = company;
    } else {
      updated = [company, ...current];
    }
    setLocalCompanies(updated);

    // Register Audit Log
    await auditService.logActivity({
      action: isNew ? 'CREATE_COMPANY' : 'UPDATE_COMPANY',
      entityType: 'company',
      entityId: company.id,
      entityName: company.tradeName,
      details: {
        cnpj: company.cnpj,
        departmentsCount: company.departments?.length || 0,
        employeeCount: company.employeeCount,
      }
    });

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
    const current = getLocalCompanies();
    const target = current.find(c => c.id === id);

    // 1. Remove from local
    setLocalCompanies(current.filter(c => c.id !== id));

    // Register Audit Log
    await auditService.logActivity({
      action: 'DELETE_COMPANY',
      entityType: 'company',
      entityId: id,
      entityName: target?.tradeName || id,
    });

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

    // Register Audit Log
    await auditService.logActivity({
      action: 'SUBMIT_ASSESSMENT',
      entityType: 'assessment',
      entityId: session.id,
      entityName: `Questionário - Setor ${session.departmentName}`,
      details: {
        companyId: session.companyId,
        department: session.departmentName,
        role: session.roleName,
        answersCount: session.responses?.length || 0,
      }
    });

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

  // REPORTS (TECHNICAL REPORTS NR-01)
  async fetchReports(companyId?: string): Promise<SavedTechnicalReport[]> {
    const client = getSupabaseClient();
    if (!client) {
      const local = getLocalReports();
      return companyId ? local.filter(r => r.companyId === companyId) : local;
    }

    try {
      let query = client
        .from('technical_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const reports = data.map(mapDbReportToApp);
        setLocalReports(reports);
        return reports;
      }
    } catch (e) {
      console.error('Erro ao buscar laudos do Supabase:', e);
    }

    const local = getLocalReports();
    return companyId ? local.filter(r => r.companyId === companyId) : local;
  },

  async saveReport(report: SavedTechnicalReport): Promise<boolean> {
    // 1. Save locally
    const current = getLocalReports();
    const updated = [report, ...current.filter(r => r.id !== report.id)];
    setLocalReports(updated);

    // Register Audit Log
    await auditService.logActivity({
      action: 'GENERATE_REPORT',
      entityType: 'report',
      entityId: report.id,
      entityName: report.title,
      details: {
        companyId: report.companyId,
        companyName: report.companyName,
        overallScore: report.overallScore,
        overallRiskLevel: report.overallRiskLevel,
        status: report.status,
      }
    });

    // 2. Save to Supabase
    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const dbPayload = mapAppReportToDb(report);
      const { error } = await client
        .from('technical_reports')
        .upsert(dbPayload, { onConflict: 'id' });

      if (error) {
        console.error('Erro ao salvar laudo no Supabase:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exceção ao salvar laudo no Supabase:', e);
      return false;
    }
  },

  async deleteReport(id: string): Promise<boolean> {
    const current = getLocalReports();
    setLocalReports(current.filter(r => r.id !== id));

    const client = getSupabaseClient();
    if (!client) return true;

    try {
      const { error } = await client
        .from('technical_reports')
        .delete()
        .eq('id', id);

      return !error;
    } catch (e) {
      console.error('Exceção ao deletar laudo no Supabase:', e);
      return false;
    }
  },

  // PROFILE (CONSULTANCY PROFILE / RESPONSÁVEL TÉCNICO)
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

    // Register Audit Log
    await auditService.logActivity({
      action: 'UPDATE_PROFILE',
      entityType: 'profile',
      entityId: profile.id,
      entityName: profile.name,
      details: {
        councilRegister: profile.councilRegister,
        consultancyName: profile.consultancyName,
      }
    });

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

  // STORAGE / UPLOAD & EXCLUSÃO DE ARQUIVOS (LOGOS, ASSINATURAS, DOCUMENTOS)
  async listUploadedFiles(bucket?: StorageBucketName): Promise<StoredFileItem[]> {
    const local = getLocalStoredFiles();
    return bucket ? local.filter(f => f.bucket === bucket) : local;
  },

  async uploadImage(
    bucket: StorageBucketName,
    file: File | Blob,
    pathName: string
  ): Promise<{ publicUrl: string | null; fileItem?: StoredFileItem; error?: string }> {
    const client = getSupabaseClient();
    const fileName = file instanceof File ? file.name : `${pathName}.png`;
    const fileSize = file instanceof File ? file.size : undefined;
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Se Supabase estiver conectado, envia para o bucket do Storage
    if (client && isSupabaseConfigured()) {
      try {
        const fileExt = file instanceof File && file.name.includes('.') ? file.name.split('.').pop() : 'png';
        const cleanPath = `${pathName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.${fileExt}`;

        const { data, error } = await client.storage
          .from(bucket)
          .upload(cleanPath, file, {
            upsert: true,
            contentType: file.type || 'image/png',
          });

        if (error) {
          console.error(`Erro no upload para o Supabase Storage (${bucket}):`, error.message);
          return {
            publicUrl: null,
            error: `Erro no Supabase Storage: "${error.message}". Verifique se o bucket "${bucket}" foi criado e configurado como PÚBLICO (Public Bucket) no menu Storage do Supabase.`
          };
        } else if (data?.path) {
          const { data: { publicUrl } } = client.storage.from(bucket).getPublicUrl(data.path);
          
          const newFileItem: StoredFileItem = {
            id: fileId,
            bucket,
            name: fileName,
            url: publicUrl,
            path: data.path,
            sizeBytes: fileSize,
            createdAt: new Date().toISOString(),
          };

          // Salva no registro de arquivos
          const currentFiles = getLocalStoredFiles();
          setLocalStoredFiles([newFileItem, ...currentFiles.filter(f => f.url !== publicUrl)]);

          await auditService.logActivity({
            action: bucket === 'signatures' ? 'UPLOAD_SIGNATURE' : 'UPLOAD_LOGO',
            entityType: 'storage',
            entityId: cleanPath,
            entityName: `${bucket}/${cleanPath}`,
            details: { bucket, path: cleanPath, publicUrl, fileName, fileSize }
          });

          return { publicUrl, fileItem: newFileItem };
        }
      } catch (err: any) {
        console.error('Exceção no upload para o Supabase Storage:', err);
      }
    }

    // Fallback: conversão para Data URL (Base64)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Url = reader.result as string;
        
        const newFileItem: StoredFileItem = {
          id: fileId,
          bucket,
          name: fileName,
          url: base64Url,
          path: pathName,
          sizeBytes: fileSize,
          createdAt: new Date().toISOString(),
        };

        const currentFiles = getLocalStoredFiles();
        setLocalStoredFiles([newFileItem, ...currentFiles.filter(f => f.name !== fileName)]);

        await auditService.logActivity({
          action: bucket === 'signatures' ? 'UPLOAD_SIGNATURE' : 'UPLOAD_LOGO',
          entityType: 'storage',
          entityId: pathName,
          entityName: `${bucket}/${pathName} (Local Base64)`,
          details: { bucket, fallback: true, fileName }
        });

        resolve({ publicUrl: base64Url, fileItem: newFileItem });
      };
      reader.onerror = () => {
        resolve({ publicUrl: null, error: 'Falha ao converter imagem para base64.' });
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Exclui permanentemente uma imagem/arquivo do Storage e do catálogo local
   */
  async deleteImage(
    bucket: StorageBucketName,
    fileIdOrUrlOrPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentFiles = getLocalStoredFiles();
      const targetFile = currentFiles.find(
        f => f.id === fileIdOrUrlOrPath || f.url === fileIdOrUrlOrPath || f.path === fileIdOrUrlOrPath
      );

      const filePath = targetFile?.path || (
        fileIdOrUrlOrPath.includes('/') ? fileIdOrUrlOrPath.split('/').pop() : fileIdOrUrlOrPath
      );

      // 1. Deletar do Supabase Storage se conectado
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured() && filePath) {
        try {
          const { error } = await client.storage
            .from(bucket)
            .remove([filePath]);

          if (error) {
            console.warn(`Erro ao excluir arquivo do Supabase Storage (${bucket}/${filePath}):`, error.message);
          }
        } catch (storageErr) {
          console.warn('Exceção ao remover arquivo do Supabase Storage:', storageErr);
        }
      }

      // 2. Remover do catálogo local
      const updatedFiles = currentFiles.filter(
        f => f.id !== fileIdOrUrlOrPath && f.url !== fileIdOrUrlOrPath && f.path !== fileIdOrUrlOrPath
      );
      setLocalStoredFiles(updatedFiles);

      // 3. Registrar Log de Auditoria
      await auditService.logActivity({
        action: 'DELETE_STORAGE_FILE',
        entityType: 'storage',
        entityId: targetFile?.id || fileIdOrUrlOrPath,
        entityName: targetFile?.name || `${bucket}/${filePath}`,
        details: {
          bucket,
          path: filePath,
          url: targetFile?.url,
          fileName: targetFile?.name
        }
      });

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao deletar imagem:', err);
      return { success: false, error: err?.message || 'Falha ao excluir a imagem.' };
    }
  }
};
