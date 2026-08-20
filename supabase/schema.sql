-- ==============================================================================
-- SCHEMA SQL COMPLETO - PSYCHORISK ANALYTICS NR-01 (SUPABASE POSTGRESQL)
-- ==============================================================================
-- Este script cria todas as tabelas para:
-- 1. Empresas (Companies) e Departamentos
-- 2. Questionários e Respostas (Assessment Sessions & Questionnaire Templates)
-- 3. Laudos Técnicos Estruturados (Technical Reports)
-- 4. Perfis de Consultoria e Especialistas Técnicos (Consultancy Profiles)
-- 5. Perfis de Usuários e Permissões RBAC (User Profiles)
-- 6. Auditoria e Rastreabilidade Completa de Ações (Audit Logs)
-- 7. Buckets de Armazenamento para Fotos, Logos e Assinaturas (Supabase Storage)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE EMPRESAS (COMPANIES)
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    corporate_name TEXT NOT NULL,
    trade_name TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    cnae TEXT,
    economic_activity TEXT,
    risk_degree TEXT,
    unit TEXT,
    segment TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    rh_contact_name TEXT,
    rh_contact_email TEXT,
    rh_contact_phone TEXT,
    employee_count INTEGER DEFAULT 0,
    responded_employee_count INTEGER DEFAULT 0,
    logo_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_assessment TEXT,
    application_period TEXT,
    reference_year TEXT,
    technical_reference TEXT,
    departments JSONB DEFAULT '[]'::jsonb,
    campaigns JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. TABELA DE MODELOS E ESPECIFICAÇÕES DE QUESTIONÁRIOS (QUESTIONNAIRE_TEMPLATES)
CREATE TABLE IF NOT EXISTS public.questionnaire_templates (
    id TEXT PRIMARY KEY DEFAULT 'nr01-psychosocial-v1',
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    normative_reference TEXT NOT NULL,
    scale_type TEXT DEFAULT 'likert_4',
    dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    version TEXT DEFAULT '1.0',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. TABELA DE SESSÕES / RESPOSTAS INDIVIDUAIS DE QUESTIONÁRIOS (ASSESSMENT_SESSIONS)
CREATE TABLE IF NOT EXISTS public.assessment_sessions (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    campaign_id TEXT,
    department_id TEXT NOT NULL,
    department_name TEXT NOT NULL,
    role_name TEXT NOT NULL,
    employee_identifier TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    tenure_years NUMERIC,
    work_shift TEXT,
    responses JSONB NOT NULL,
    clinical_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. TABELA DE LAUDOS E RELATÓRIOS TÉCNICOS OFICIAIS (TECHNICAL_REPORTS)
CREATE TABLE IF NOT EXISTS public.technical_reports (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES public.companies(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    campaign_id TEXT,
    title TEXT NOT NULL,
    reference_year TEXT,
    application_period TEXT,
    issued_date TEXT NOT NULL,
    author_id TEXT,
    author_name TEXT,
    author_council_register TEXT,
    overall_score NUMERIC(5,2) NOT NULL,
    overall_favorability NUMERIC(5,2) NOT NULL,
    overall_risk_level TEXT NOT NULL,
    adherence_rate NUMERIC(5,2) NOT NULL,
    total_respondents INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    analytics_data JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. TABELA DE PERFIL DO CONSULTOR / RESPONSÁVEL TÉCNICO (CONSULTANCY_PROFILES)
CREATE TABLE IF NOT EXISTS public.consultancy_profiles (
    id TEXT PRIMARY KEY DEFAULT 'default-profile',
    name TEXT NOT NULL,
    council_register TEXT NOT NULL,
    specialty TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    signature_url TEXT,
    consultancy_name TEXT NOT NULL,
    consultancy_logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. TABELA DE PERFIS DE USUÁRIOS E PERMISSÕES RBAC (USER_PROFILES)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'consultant', 'evaluator')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 8. TABELA DE AUDITORIA E LOGS DE RASTREABILIDADE (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT NOT NULL,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    entity_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON public.assessment_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_department_id ON public.assessment_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.assessment_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON public.technical_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.technical_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 10. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 11. POLÍTICAS DE ACESSO (PERMISSÃO DE LEITURA E GRAVAÇÃO COM CHAVE ANON/AUTH)
-- Companies
DROP POLICY IF EXISTS "Public Read Companies" ON public.companies;
CREATE POLICY "Public Read Companies" ON public.companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Companies" ON public.companies;
CREATE POLICY "Public Insert Companies" ON public.companies FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Companies" ON public.companies;
CREATE POLICY "Public Update Companies" ON public.companies FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public Delete Companies" ON public.companies;
CREATE POLICY "Public Delete Companies" ON public.companies FOR DELETE USING (true);

-- Questionnaire Templates
DROP POLICY IF EXISTS "Public Read Templates" ON public.questionnaire_templates;
CREATE POLICY "Public Read Templates" ON public.questionnaire_templates FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Upsert Templates" ON public.questionnaire_templates;
CREATE POLICY "Public Upsert Templates" ON public.questionnaire_templates FOR ALL USING (true);

-- Assessment Sessions
DROP POLICY IF EXISTS "Public Read Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Read Sessions" ON public.assessment_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Insert Sessions" ON public.assessment_sessions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Update Sessions" ON public.assessment_sessions FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public Delete Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Delete Sessions" ON public.assessment_sessions FOR DELETE USING (true);

-- Technical Reports
DROP POLICY IF EXISTS "Public Read Reports" ON public.technical_reports;
CREATE POLICY "Public Read Reports" ON public.technical_reports FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Reports" ON public.technical_reports;
CREATE POLICY "Public Insert Reports" ON public.technical_reports FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public Update Reports" ON public.technical_reports;
CREATE POLICY "Public Update Reports" ON public.technical_reports FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Public Delete Reports" ON public.technical_reports;
CREATE POLICY "Public Delete Reports" ON public.technical_reports FOR DELETE USING (true);

-- Consultancy Profiles
DROP POLICY IF EXISTS "Public Read Profile" ON public.consultancy_profiles;
CREATE POLICY "Public Read Profile" ON public.consultancy_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Upsert Profile" ON public.consultancy_profiles;
CREATE POLICY "Public Upsert Profile" ON public.consultancy_profiles FOR ALL USING (true);

-- User Profiles
DROP POLICY IF EXISTS "Public Read Users" ON public.user_profiles;
CREATE POLICY "Public Read Users" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Upsert Users" ON public.user_profiles;
CREATE POLICY "Public Upsert Users" ON public.user_profiles FOR ALL USING (true);

-- Audit Logs
DROP POLICY IF EXISTS "Public Read Audit" ON public.audit_logs;
CREATE POLICY "Public Read Audit" ON public.audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Insert Audit" ON public.audit_logs;
CREATE POLICY "Public Insert Audit" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- 12. TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_templates_updated_at ON public.questionnaire_templates;
CREATE TRIGGER set_templates_updated_at
BEFORE UPDATE ON public.questionnaire_templates
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.technical_reports;
CREATE TRIGGER set_reports_updated_at
BEFORE UPDATE ON public.technical_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.consultancy_profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.consultancy_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 13. CONFIGURAÇÃO DE BUCKETS NO SUPABASE STORAGE (FOTOS, LOGOS, ASSINATURAS E RELATÓRIOS)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('company-assets', 'company-assets', true),
    ('user-avatars', 'user-avatars', true),
    ('signatures', 'signatures', true),
    ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para upload e leitura pública dos arquivos no Storage
DROP POLICY IF EXISTS "Allow Public Read Storage" ON storage.objects;
CREATE POLICY "Allow Public Read Storage" ON storage.objects
FOR SELECT USING (bucket_id IN ('company-assets', 'user-avatars', 'signatures', 'reports'));

DROP POLICY IF EXISTS "Allow Public Upload Storage" ON storage.objects;
CREATE POLICY "Allow Public Upload Storage" ON storage.objects
FOR INSERT WITH CHECK (bucket_id IN ('company-assets', 'user-avatars', 'signatures', 'reports'));

DROP POLICY IF EXISTS "Allow Public Update Storage" ON storage.objects;
CREATE POLICY "Allow Public Update Storage" ON storage.objects
FOR UPDATE USING (bucket_id IN ('company-assets', 'user-avatars', 'signatures', 'reports'));

DROP POLICY IF EXISTS "Allow Public Delete Storage" ON storage.objects;
CREATE POLICY "Allow Public Delete Storage" ON storage.objects
FOR DELETE USING (bucket_id IN ('company-assets', 'user-avatars', 'signatures', 'reports'));

-- 14. DADOS INICIAIS (SEED BENCHMARK PARA INICIALIZAÇÃO)
INSERT INTO public.consultancy_profiles (
    id, name, council_register, specialty, email, phone, consultancy_name
) VALUES (
    'default-profile',
    'Dr. Marcelo Silveira Fontes',
    'CRP 06/98432-1',
    'Psicologia Organizacional e Ergonomia Cognitiva (NR-01 / NR-17)',
    'marcelo.fontes@occupationalhealth.com.br',
    '(11) 98455-1200',
    'Occupational Health & Ergonomics Consultoria'
) ON CONFLICT (id) DO NOTHING;

-- 15. INICIALIZAR O SUPER ADMIN MASTER NO SISTEMA
INSERT INTO public.user_profiles (
    email, name, role
) VALUES (
    'thibasss@gmail.com',
    'Thiago Marques (Super Admin)',
    'super_admin'
) ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
