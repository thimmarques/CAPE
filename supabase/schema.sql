-- ==============================================================================
-- SCHEMA SQL - PSYCHORISK ANALYTICS NR-01 (SUPABASE POSTGRESQL)
-- ==============================================================================
-- Execute este script no "SQL Editor" do seu painel Supabase para criar as tabelas
-- e configurar o Super Administrador Master.

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

-- 3. TABELA DE SESSÕES / RESPOSTAS DE QUESTIONÁRIOS (ASSESSMENT_SESSIONS)
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

-- 4. TABELA DE PERFIL DO CONSULTOR / LAUDO (CONSULTANCY_PROFILES)
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

-- 5. TABELA DE PERFIS DE USUÁRIOS E PERMISSÕES (USER_PROFILES)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'consultant', 'evaluator')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON public.assessment_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_department_id ON public.assessment_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.assessment_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 7. HABILITAÇÃO DE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS DE ACESSO (PERMISSÃO DE LEITURA E GRAVAÇÃO COM CHAVE ANON/AUTH)
DROP POLICY IF EXISTS "Public Read Companies" ON public.companies;
CREATE POLICY "Public Read Companies" ON public.companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Companies" ON public.companies;
CREATE POLICY "Public Insert Companies" ON public.companies FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Companies" ON public.companies;
CREATE POLICY "Public Update Companies" ON public.companies FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Companies" ON public.companies;
CREATE POLICY "Public Delete Companies" ON public.companies FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Read Sessions" ON public.assessment_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Insert Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Insert Sessions" ON public.assessment_sessions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Update Sessions" ON public.assessment_sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Delete Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Delete Sessions" ON public.assessment_sessions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Profile" ON public.consultancy_profiles;
CREATE POLICY "Public Read Profile" ON public.consultancy_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Upsert Profile" ON public.consultancy_profiles;
CREATE POLICY "Public Upsert Profile" ON public.consultancy_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Users" ON public.user_profiles;
CREATE POLICY "Public Read Users" ON public.user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Upsert Users" ON public.user_profiles;
CREATE POLICY "Public Upsert Users" ON public.user_profiles FOR ALL USING (true);

-- 9. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
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

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.consultancy_profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.consultancy_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. DADOS INICIAIS (SEED BENCHMARK PARA INICIALIZAÇÃO)
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

-- 11. INICIALIZAR O SUPER ADMIN MASTER NO SISTEMA
INSERT INTO public.user_profiles (
    email, name, role
) VALUES (
    'thibasss@gmail.com',
    'Thiago Marques (Super Admin)',
    'super_admin'
) ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
