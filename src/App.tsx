import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { CompaniesView } from './components/CompaniesView';
import { QuestionnairesView } from './components/QuestionnairesView';
import { ReportsView } from './components/ReportsView';
import { AssessmentView } from './components/AssessmentView';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { MOCK_COMPANIES, MOCK_SESSIONS, MOCK_PROFILE } from './data/mockData';
import { Company, AssessmentSession, ProfessionalProfile, RespondentPrefill } from './types';
import { dbService, getLocalCompanies, getLocalSessions, getLocalProfile } from './services/supabaseService';
import { isSupabaseConfigured } from './lib/supabase';
import { 
  LayoutDashboard, 
  Building2, Download, Menu, X, 
  Layers, LogOut, ShieldCheck, Database, Cloud, CloudOff, RefreshCw
} from 'lucide-react';

type AppView = 'dashboard' | 'companies' | 'questionnaires' | 'reports' | 'assessment';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>();
  const [respondentPrefill, setRespondentPrefill] = useState<RespondentPrefill | undefined>();
  
  // State for companies, sessions and profile (initialized with local storage / fallback)
  const [companies, setCompanies] = useState<Company[]>(getLocalCompanies);
  const [recentSessions, setRecentSessions] = useState<AssessmentSession[]>(getLocalSessions);
  const [profile, setProfile] = useState<ProfessionalProfile>(getLocalProfile);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isCloudSyncOnline, setIsCloudSyncOnline] = useState<boolean>(isSupabaseConfigured());
  
  // Modals & UI States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initial Load from Supabase (or cached storage)
  useEffect(() => {
    const loadCloudData = async () => {
      if (isSupabaseConfigured()) {
        setIsLoadingDb(true);
        try {
          const conn = await dbService.testConnection();
          setIsCloudSyncOnline(conn.connected);

          const [cloudCompanies, cloudSessions, cloudProfile] = await Promise.all([
            dbService.fetchCompanies(),
            dbService.fetchSessions(),
            dbService.fetchProfile(),
          ]);

          if (cloudCompanies && cloudCompanies.length > 0) {
            setCompanies(cloudCompanies);
          }
          if (cloudSessions && cloudSessions.length > 0) {
            setRecentSessions(cloudSessions);
          }
          if (cloudProfile) {
            setProfile(cloudProfile);
          }
        } catch (e) {
          console.error('Erro ao sincronizar com Supabase:', e);
          setIsCloudSyncOnline(false);
        } finally {
          setIsLoadingDb(false);
        }
      }
    };

    loadCloudData();
  }, []);

  const handleNavigate = (view: AppView, companyId?: string, prefill?: RespondentPrefill) => {
    if (companyId) {
      setSelectedCompanyId(companyId);
    }
    if (prefill) {
      setRespondentPrefill(prefill);
    } else if (view !== 'assessment') {
      setRespondentPrefill(undefined);
    }
    setCurrentView(view);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveCompany = async (company: Company) => {
    setCompanies(prev => {
      const idx = prev.findIndex(c => c.id === company.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = company;
        return updated;
      }
      return [company, ...prev];
    });

    // Cloud + Local Persistence
    await dbService.saveCompany(company);
  };

  const handleDeleteCompany = async (id: string) => {
    setCompanies(prev => prev.filter(c => c.id !== id));
    await dbService.deleteCompany(id);
  };

  const handleSaveSession = async (newSession: AssessmentSession) => {
    setRecentSessions(prev => [newSession, ...prev]);
    await dbService.saveSession(newSession);
  };

  const handleSaveProfile = async (updated: ProfessionalProfile) => {
    setProfile(updated);
    await dbService.saveProfile(updated);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Painel Geral de Gestão Ocupacional';
      case 'companies': return 'Gestão de Empresas & Estrutura';
      case 'questionnaires': return 'Questionário HSE-IT';
      case 'assessment': return 'Preenchimento do Questionário HSE-IT';
      case 'reports': return 'Relatórios & Laudos Executivos (PDF)';
      default: return 'PsychoRisk Analytics';
    }
  };

  return (
    <div className="flex h-screen font-sans text-[#1E293B] bg-[#F8FAFC] overflow-hidden">
      
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-[#1A392A] text-slate-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-[#2D6A4F]/40">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none" 
            onClick={() => handleNavigate('dashboard')}
          >
            <div className="w-10 h-10 bg-[#40916C] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-inner">
              P
            </div>
            <div className="flex flex-col">
              <span className="text-white font-black text-base tracking-tight leading-none">PsychoRisk</span>
              <span className="text-[#52B788] text-[10px] font-bold uppercase tracking-widest mt-1">Analytics NR-01</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          
          <button 
            onClick={() => handleNavigate('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
              currentView === 'dashboard' 
                ? 'bg-[#2D6A4F] text-white font-bold shadow-xs' 
                : 'text-slate-300 hover:bg-[#2D6A4F]/20 hover:text-white font-medium'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${currentView === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
            <span className="text-xs">Painel Geral</span>
          </button>

          <button 
            onClick={() => handleNavigate('companies')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
              currentView === 'companies' 
                ? 'bg-[#2D6A4F] text-white font-bold shadow-xs' 
                : 'text-slate-300 hover:bg-[#2D6A4F]/20 hover:text-white font-medium'
            }`}
          >
            <Building2 className={`w-5 h-5 ${currentView === 'companies' ? 'text-white' : 'text-slate-400'}`} />
            <span className="text-xs">Empresas Clientes</span>
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#142d22] text-[#52B788]">
              {companies.length}
            </span>
          </button>

          <button 
            onClick={() => handleNavigate('questionnaires')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
              currentView === 'questionnaires' || currentView === 'assessment'
                ? 'bg-[#2D6A4F] text-white font-bold shadow-xs' 
                : 'text-slate-300 hover:bg-[#2D6A4F]/20 hover:text-white font-medium'
            }`}
          >
            <Layers className={`w-5 h-5 ${currentView === 'questionnaires' || currentView === 'assessment' ? 'text-white' : 'text-slate-400'}`} />
            <span className="text-xs">Questionário HSE-IT</span>
          </button>

          <button 
            onClick={() => handleNavigate('reports')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
              currentView === 'reports' 
                ? 'bg-[#2D6A4F] text-white font-bold shadow-xs' 
                : 'text-slate-300 hover:bg-[#2D6A4F]/20 hover:text-white font-medium'
            }`}
          >
            <Download className={`w-5 h-5 ${currentView === 'reports' ? 'text-white' : 'text-slate-400'}`} />
            <span className="text-xs">Relatórios & Laudos (PDF)</span>
          </button>

          <div className="pt-2">
            <button 
              onClick={() => setIsSupabaseModalOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left transition-all text-slate-300 hover:bg-[#2D6A4F]/30 hover:text-white font-medium group border border-[#2D6A4F]/30"
              title="Configurações e Diagnóstico do Supabase"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Banco Supabase</span>
              </div>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isCloudSyncOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 group-hover:text-emerald-300">
                  {isCloudSyncOnline ? 'Online' : 'Local'}
                </span>
              </span>
            </button>
          </div>
        </nav>

        {/* Bottom Profile & Logout Footer */}
        <div className="p-3 m-3 rounded-2xl bg-[#142D22] border border-[#2D6A4F]/40 flex items-center justify-between gap-2 shadow-xs">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            title="Configurações do Perfil Profissional"
            className="flex-1 flex items-center gap-2.5 min-w-0 p-1.5 rounded-xl hover:bg-[#2D6A4F]/40 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-xs shrink-0 border border-[#52B788]/40 shadow-xs">
              {profile.name ? profile.name.charAt(0) : 'R'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate group-hover:text-[#52B788] transition-colors">
                {profile.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {profile.role || 'Responsável Técnico'}
              </div>
            </div>
          </button>

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            title="Sair do Sistema"
            className="p-2 text-slate-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all shrink-0"
            aria-label="Sair do Sistema"
          >
            <LogOut size={18} />
          </button>
        </div>

      </aside>

      {/* Main App Container */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Navigation Bar */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-xs">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {getViewTitle()}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isLoadingDb && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                <RefreshCw size={12} className="animate-spin text-emerald-600" />
                <span className="text-[11px] font-medium hidden md:inline">Sincronizando Cloud...</span>
              </div>
            )}

            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
              title="Clique para ver detalhes do banco Supabase"
            >
              {isCloudSyncOnline ? (
                <>
                  <Cloud size={14} className="text-emerald-600" />
                  <span className="font-semibold text-emerald-800 text-[11px]">Supabase Nuvem</span>
                </>
              ) : (
                <>
                  <CloudOff size={14} className="text-amber-600" />
                  <span className="font-semibold text-amber-800 text-[11px]">Armazenamento Local</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <ShieldCheck size={14} className="text-[#2D6A4F]" />
              <span className="font-semibold">Conformidade NR-01</span>
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          {currentView === 'dashboard' && (
            <Dashboard 
              companies={companies}
              recentSessions={recentSessions}
              onNavigate={handleNavigate}
              onOpenNewCompanyModal={() => {
                setCurrentView('companies');
              }}
            />
          )}

          {currentView === 'companies' && (
            <CompaniesView 
              companies={companies}
              sessions={recentSessions}
              onAddCompany={handleSaveCompany}
              onUpdateCompany={handleSaveCompany}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'questionnaires' && (
            <QuestionnairesView 
              companies={companies}
              sessions={recentSessions}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'assessment' && (
            <AssessmentView 
              companies={companies}
              selectedCompanyId={selectedCompanyId}
              sessions={recentSessions}
              initialRespondentData={respondentPrefill}
              onClearInitialData={() => setRespondentPrefill(undefined)}
              onSaveSession={handleSaveSession}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === 'reports' && (
            <ReportsView 
              companies={companies}
              sessions={recentSessions}
              profile={profile}
              selectedCompanyId={selectedCompanyId}
              onNavigate={handleNavigate}
            />
          )}
        </div>
      </main>

      {/* Specialist Profile and Settings Modal */}
      <ProfileSettingsModal 
        isOpen={isProfileModalOpen}
        profile={profile}
        onSaveProfile={handleSaveProfile}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Supabase Connection and SQL Schema Modal */}
      <SupabaseConfigModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <LogOut size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Sair do Sistema</h3>
                <p className="text-xs text-slate-500">Deseja realmente encerrar sua sessão de trabalho?</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
              Todos os dados de empresas, questionários aplicados e laudos executivos já registrados na plataforma permanecem salvos com segurança.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  handleNavigate('dashboard');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={14} /> Confirmar e Sair
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
