import React, { useState, useEffect } from 'react';
import { 
  Database, CheckCircle2, AlertCircle, RefreshCw, 
  Copy, Check, Code2, ExternalLink, X, ShieldCheck, Terminal,
  KeyRound, Globe, Save, Trash2, CheckCircle, Lock, Crown
} from 'lucide-react';
import { dbService } from '../services/supabaseService';
import { 
  isSupabaseConfigured, 
  getStoredSupabaseConfig, 
  saveCustomSupabaseConfig, 
  clearCustomSupabaseConfig 
} from '../lib/supabase';
import { SUPER_ADMIN_EMAIL } from '../types';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
  isSuperAdmin?: boolean;
  currentUserEmail?: string;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfigUpdated,
  isSuperAdmin = true,
  currentUserEmail = '',
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; message: string; latencyMs?: number } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'credentials' | 'vercel' | 'sql' | 'guide'>('status');

  const [inputUrl, setInputUrl] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  const canAccessConfig = isSuperAdmin || currentUserEmail.toLowerCase().trim() === SUPER_ADMIN_EMAIL.toLowerCase();

  const loadCurrentCredentials = () => {
    const config = getStoredSupabaseConfig();
    setInputUrl(config.url || '');
    setInputKey(config.anonKey || '');
  };

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const res = await dbService.testConnection();
      setStatus(res);
    } catch (e: any) {
      setStatus({ connected: false, message: e?.message || 'Erro ao testar conexão.' });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrentCredentials();
      checkConnection();
    }
  }, [isOpen]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      alert('Por favor, informe tanto a URL quanto a Chave Anon.');
      return;
    }

    saveCustomSupabaseConfig(inputUrl.trim(), inputKey.trim());
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2500);
    
    // Automatically re-test connection and notify parent
    await checkConnection();
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const handleClearCredentials = async () => {
    if (confirm('Deseja remover as chaves configuradas manualmente e restaurar padrão?')) {
      clearCustomSupabaseConfig();
      loadCurrentCredentials();
      await checkConnection();
      if (onConfigUpdated) {
        onConfigUpdated();
      }
    }
  };

  if (!isOpen) return null;

  if (!canAccessConfig) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Acesso Restrito ao Administrador Geral</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              As configurações do banco de dados e credenciais do Supabase são de acesso exclusivo do <strong>Super Admin Master</strong> ({SUPER_ADMIN_EMAIL}).
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 text-left space-y-1">
            <div className="font-bold text-slate-700 flex items-center gap-1">
              <Crown size={12} className="text-amber-500" /> Nível de Acesso Atual
            </div>
            <div>Usuário: {currentUserEmail || 'Não identificado'}</div>
            <div>Permissão: Administrador Operacional / Consultor</div>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const currentConfig = getStoredSupabaseConfig();

  const sqlSchemaText = `-- ==============================================================================
-- SCHEMA SQL - PSYCHORISK ANALYTICS NR-01 (SUPABASE POSTGRESQL)
-- ==============================================================================
-- Cole este script no "SQL Editor" do seu painel Supabase e clique em "RUN".

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE EMPRESAS
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

-- 2. TABELA DE SESSÕES / RESPOSTAS DO QUESTIONÁRIO
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

-- 3. TABELA DE PERFIL DO CONSULTOR
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

-- 4. TABELA DE USUÁRIOS E PERMISSÕES (RBAC)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'consultant', 'evaluator')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON public.assessment_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_department_id ON public.assessment_sessions(department_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.assessment_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- 6. SEGURANÇA RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultancy_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS (Permitir SELECT, INSERT, UPDATE, DELETE para anon/authenticated)
DROP POLICY IF EXISTS "Public Read Companies" ON public.companies;
CREATE POLICY "Public Read Companies" ON public.companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Write Companies" ON public.companies;
CREATE POLICY "Public Write Companies" ON public.companies FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Read Sessions" ON public.assessment_sessions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Write Sessions" ON public.assessment_sessions;
CREATE POLICY "Public Write Sessions" ON public.assessment_sessions FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Profile" ON public.consultancy_profiles;
CREATE POLICY "Public Read Profile" ON public.consultancy_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Write Profile" ON public.consultancy_profiles;
CREATE POLICY "Public Write Profile" ON public.consultancy_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Public Read Users" ON public.user_profiles;
CREATE POLICY "Public Read Users" ON public.user_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Write Users" ON public.user_profiles;
CREATE POLICY "Public Write Users" ON public.user_profiles FOR ALL USING (true);

-- 7. SEED DO SUPER ADMIN MASTER
INSERT INTO public.user_profiles (
    email, name, role
) VALUES (
    'thibasss@gmail.com',
    'Thiago Marques (Super Admin)',
    'super_admin'
) ON CONFLICT (email) DO UPDATE SET role = 'super_admin';`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold">Integração Supabase PostgreSQL</h2>
              <p className="text-xs text-slate-400">Banco de Dados em Nuvem e Persistência do Sistema</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={16} />
            Status da Conexão
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'credentials'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound size={16} />
            Inserir Chaves (Navegador)
          </button>
          <button
            onClick={() => setActiveTab('vercel')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'vercel'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ExternalLink size={16} />
            Publicar no Vercel
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 size={16} />
            Script SQL (Schema)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal size={16} />
            Passo a Passo
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {activeTab === 'status' && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                status?.connected 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                  : isSupabaseConfigured()
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}>
                {isChecking ? (
                  <RefreshCw className="animate-spin text-slate-600 mt-0.5 shrink-0" size={20} />
                ) : status?.connected ? (
                  <CheckCircle2 className="text-emerald-600 mt-0.5 shrink-0" size={20} />
                ) : (
                  <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={20} />
                )}

                <div className="flex-1 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {isChecking 
                        ? 'Verificando conexão...' 
                        : status?.connected 
                        ? 'Conexão Ativa com o Supabase' 
                        : isSupabaseConfigured()
                        ? 'Chaves Detectadas (Aguardando Criação das Tabelas no Supabase)'
                        : 'Modo Local / Offline (Sem Conexão Cloud)'}
                    </span>
                    {status?.latencyMs !== undefined && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                        Latência: {status.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {status?.message || 'Aguardando teste de conexão.'}
                  </p>
                </div>
              </div>

              {/* Status Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Project URL</span>
                    {currentConfig.url && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Definida</span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 truncate">
                    {currentConfig.url || 'Não configurada (insira na aba Chaves)'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Anon Public Key</span>
                    {currentConfig.anonKey && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Definida</span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 truncate">
                    {currentConfig.anonKey 
                      ? `${currentConfig.anonKey.substring(0, 16)}... (Oculta por Segurança)` 
                      : 'Não configurada (insira na aba Chaves)'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={checkConnection}
                  disabled={isChecking}
                  className="px-4 py-2.5 bg-[#2D6A4F] hover:bg-[#1f4a37] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={15} className={isChecking ? 'animate-spin' : ''} />
                  {isChecking ? 'Testando...' : 'Re-testar Conexão'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('credentials')}
                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <KeyRound size={15} />
                    Editar / Inserir Chaves
                  </button>

                  <button
                    onClick={() => setActiveTab('sql')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                  >
                    <Code2 size={15} />
                    Ver Script SQL
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <strong className="block font-bold">Configuração Direta das Chaves de Conexão:</strong>
                <p className="text-[11px] leading-relaxed">
                  Você pode colar sua <strong>Project URL</strong> e sua <strong>anon public key</strong> diretamente abaixo. O sistema salva com segurança no seu navegador e conecta imediatamente ao Supabase.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Globe size={14} className="text-slate-500" />
                    Supabase Project URL (VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://exemplo-id.supabase.co"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Disponível no Supabase em: Project Settings &gt; Data API &gt; Project URL.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <KeyRound size={14} className="text-slate-500" />
                    Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
                  </label>
                  <textarea
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    rows={3}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono resize-none"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Disponível no Supabase em: Project Settings &gt; Data API &gt; Project API keys &gt; anon public.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClearCredentials}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Limpar Chaves
                </button>

                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                    isSavedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#2D6A4F] hover:bg-[#1f4a37] text-white'
                  }`}
                >
                  {isSavedSuccess ? <CheckCircle size={15} /> : <Save size={15} />}
                  {isSavedSuccess ? 'Chaves Salvas e Testadas!' : 'Salvar e Conectar ao Supabase'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ExternalLink size={16} />
                  Por que no Vercel precisa configurar as Environment Variables?
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  O Vercel compila a aplicação no servidor dele quando você envia para o GitHub. Para que o site em produção acesse o Supabase automaticamente para todos os usuários, adicione as 2 variáveis no painel da Vercel.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs">Passo a Passo no Vercel (2 Minutos):</h4>
                <ol className="space-y-3 list-decimal pl-4">
                  <li className="space-y-1">
                    <strong>Acessar o Projeto no Vercel:</strong>
                    <p className="text-slate-600">Acesse <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-1">vercel.com/dashboard <ExternalLink size={12} /></a> e clique no seu projeto.</p>
                  </li>

                  <li className="space-y-1.5">
                    <strong>Ir em Settings &gt; Environment Variables:</strong>
                    <p className="text-slate-600">Adicione as duas variáveis abaixo:</p>
                    <div className="space-y-2 pt-1 font-mono text-[11px]">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 font-sans block text-[10px]">Key 1:</span>
                          <span className="font-bold text-slate-800 select-all">VITE_SUPABASE_URL</span>
                        </div>
                        <span className="text-slate-500 text-[10px] font-sans">URL do seu Supabase</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-slate-500 font-sans block text-[10px]">Key 2:</span>
                          <span className="font-bold text-slate-800 select-all">VITE_SUPABASE_ANON_KEY</span>
                        </div>
                        <span className="text-slate-500 text-[10px] font-sans">Chave Anon Public</span>
                      </div>
                    </div>
                  </li>

                  <li className="space-y-1">
                    <strong>Fazer um Redeploy no Vercel:</strong>
                    <p className="text-slate-600">
                      Vá na aba <strong>Deployments</strong> do Vercel, clique nos <strong>3 pontinhos (...)</strong> ao lado do último deploy e selecione <strong>Redeploy</strong>.
                    </p>
                  </li>
                </ol>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px]">
                💡 <strong>Dica Rápida:</strong> Enquanto você não faz o redeploy no Vercel, você pode simplesmente abrir o site no Vercel, clicar em <strong>"Banco Supabase" &gt; "Inserir Chaves"</strong> e salvar direto pelo seu navegador!
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Script de Criação de Tabelas (PostgreSQL)</h3>
                  <p className="text-[11px] text-slate-500">Copie o código abaixo e execute no <strong>SQL Editor</strong> do Supabase.</p>
                </div>
                <button
                  onClick={handleCopySql}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                    copiedSql 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-[#2D6A4F] hover:bg-[#1f4a37] text-white'
                  }`}
                >
                  {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                  {copiedSql ? 'Copiado com Sucesso!' : 'Copiar Script SQL'}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-72 leading-relaxed border border-slate-800">
                  {sqlSchemaText}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3.5 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                <strong className="block font-bold">Guia Rápido de Configuração (3 Passos):</strong>
                <p className="text-[11px]">Siga as etapas abaixo para vincular seu projeto Supabase em menos de 2 minutos.</p>
              </div>

              <ol className="space-y-3 list-decimal pl-4 text-slate-700">
                <li className="space-y-1">
                  <strong>Criar ou Acessar Projeto no Supabase:</strong>
                  <p className="text-slate-600">Acesse <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-1">supabase.com/dashboard <ExternalLink size={12} /></a> e crie um novo projeto (ou use um existente).</p>
                </li>

                <li className="space-y-1">
                  <strong>Executar o Script SQL:</strong>
                  <p className="text-slate-600">Vá na aba <strong>SQL Editor</strong> no menu lateral esquerdo do Supabase, clique em <em>New Query</em>, cole o conteúdo da aba <strong>Script SQL</strong> e clique em <strong>Run</strong>.</p>
                </li>

                <li className="space-y-1">
                  <strong>Copiar as Chaves de Conexão:</strong>
                  <p className="text-slate-600">No painel do Supabase, acesse <strong>Project Settings &gt; API</strong> e adicione as variáveis de ambiente:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600 font-mono text-[11px] pt-1">
                    <li>VITE_SUPABASE_URL (URL do projeto)</li>
                    <li>VITE_SUPABASE_ANON_KEY (chave pública anon)</li>
                  </ul>
                </li>
              </ol>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 text-[11px]">
            PsychoRisk Analytics • Arquitetura Híbrida Cloud + Offline
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
