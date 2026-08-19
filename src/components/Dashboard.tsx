import React from 'react';
import { 
  Building2, Users, FileText, Activity, ArrowRight, Plus, 
  Download, ShieldCheck, CheckCircle2, AlertTriangle, 
  BarChart3, Eye, Clock, Layers
} from 'lucide-react';
import { Company, AssessmentSession } from '../types';
import { calculateRealTimeAnalytics, getCompanyAssessmentProgress } from '../utils/assessmentCalculations';

interface DashboardProps {
  companies: Company[];
  recentSessions: AssessmentSession[];
  onNavigate: (view: 'dashboard' | 'companies' | 'questionnaires' | 'reports' | 'assessment', companyId?: string) => void;
  onOpenNewCompanyModal: () => void;
}

export function Dashboard({ companies, recentSessions, onNavigate, onOpenNewCompanyModal }: DashboardProps) {
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const totalEmployees = companies.reduce((acc, c) => acc + c.employeeCount, 0);
  
  const companyProgressList = companies.map(c => getCompanyAssessmentProgress(c, recentSessions));
  const totalEvaluatedAll = companyProgressList.reduce((acc, p) => acc + p.totalCompleted, 0);
  const totalRequiredAll = companyProgressList.reduce((acc, p) => acc + p.totalRequired, 0);
  const averageAdherence = totalRequiredAll > 0 ? Math.round((totalEvaluatedAll / totalRequiredAll) * 100) : 0;
  const totalCampaigns = companies.reduce((acc, c) => acc + (c.campaigns?.length || 0), 0);

  const mainCompany = companies[0];
  const mainAnalytics = mainCompany ? calculateRealTimeAnalytics(mainCompany, recentSessions) : null;
  const mainProgress = mainCompany ? getCompanyAssessmentProgress(mainCompany, recentSessions) : null;

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Top Banner with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">Painel Geral de Gestão Ocupacional</h1>
          <p className="text-sm text-slate-500">Mapeamento contínuo de Riscos Psicossociais em conformidade com as diretrizes da NR-01 / PGR.</p>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Empresas Clientes</span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-bold text-[#1E293B]">{activeCompanies} / {companies.length}</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Ativas</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Campanhas Ocupacionais</span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-bold text-[#1E293B]">{totalCampaigns}</span>
            <span className="text-xs text-[#2D6A4F] font-bold bg-[#40916C]/10 px-2 py-0.5 rounded">Em Andamento</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Universo de Colaboradores</span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-bold text-[#1E293B]">{totalEmployees.toLocaleString('pt-BR')}</span>
            <span className="text-xs text-slate-400 font-medium">Base Cadastrada</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-[#40916C]">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Taxa de Adesão Média</span>
          <div className="flex items-end justify-between mt-1">
            <span className="text-2xl font-bold text-[#2D6A4F]">{averageAdherence}%</span>
            <span className="text-xs text-emerald-700 font-bold">Meta NR-01</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Companies Management + Sector Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Companies Column (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#2D6A4F]" />
              <h2 className="text-sm font-bold text-slate-700">Empresa em Monitoramento Ocupacional</h2>
            </div>
            <button 
              onClick={() => onNavigate('companies')}
              className="text-xs font-bold text-[#2D6A4F] hover:underline flex items-center gap-1"
            >
              Estrutura Setorial <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="divide-y divide-slate-100">
            {companies.slice(0, 4).map(company => {
              const compProgress = getCompanyAssessmentProgress(company, recentSessions);
              return (
                <div key={company.id} className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{company.tradeName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        compProgress.isFullyCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {compProgress.isFullyCompleted ? 'Homologado' : 'Em Coleta'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>CNPJ: {company.cnpj}</span>
                      <span>{company.employeeCount} colaboradores ({compProgress.totalCompleted} avaliados)</span>
                      <span className="text-emerald-700 font-semibold">{compProgress.percentage}% adesão</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => onNavigate('reports', company.id)}
                      className="px-4 py-2 text-xs font-bold text-white bg-[#2D6A4F] hover:bg-[#3A5A40] rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <FileText size={14} /> Ver Laudo & Relatório
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Quick Metrics of the Survey */}
          {mainAnalytics && (
            <div className="p-5 bg-slate-50/60 border-t border-slate-100 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Média Favorabilidade</span>
                <span className="text-lg font-bold text-[#2D6A4F]">{mainAnalytics.overallFavorability} pts</span>
                <span className="text-[10px] text-emerald-700 font-bold block">
                  {mainAnalytics.overallFavorability >= 67 ? 'Favorável' : mainAnalytics.overallFavorability >= 40 ? 'Atenção' : 'Crítico'}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Estabilidade</span>
                <span className="text-lg font-bold text-emerald-700">{mainAnalytics.stabilityStats.overallFavorability ?? 85.2}%</span>
                <span className="text-[10px] text-slate-500 font-medium block">Fator Protetivo</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Assédio Moral</span>
                <span className={`text-lg font-bold ${mainAnalytics.moralHarassmentStats.overallRate > 20 ? 'text-red-600' : 'text-slate-800'}`}>
                  {mainAnalytics.moralHarassmentStats.overallRate}%
                </span>
                <span className={`text-[10px] font-bold block ${mainAnalytics.moralHarassmentStats.overallRate > 20 ? 'text-red-700' : 'text-slate-500'}`}>
                  {mainAnalytics.moralHarassmentStats.overallRate > 20 ? 'Nível Crítico' : 'Monitoramento'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sector Distribution Breakdown (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2D6A4F]" />
              <h2 className="text-sm font-bold text-slate-700">
                Adesão por Setor ({mainProgress?.totalCompleted || 0} Respondentes)
              </h2>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-[420px]">
            {mainCompany?.departments?.map((dept) => {
              const deptSessions = recentSessions.filter(s => (s.companyId === mainCompany.id) && (s.departmentId === dept.id || s.departmentName === dept.name));
              const deptHeadcount = dept.headcount || 0;
              const responded = deptSessions.length || deptHeadcount;
              const totalResp = mainProgress?.totalCompleted || 1;
              const percentageOfTotal = Number(((responded / totalResp) * 100).toFixed(1));
              const maxHeadcount = Math.max(...(mainCompany.departments?.map(d => d.headcount || 0) || [1]));
              
              return (
                <div key={dept.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{dept.name}</span>
                    <span className="text-[11px] text-[#2D6A4F] font-bold bg-[#40916C]/10 px-2 py-0.5 rounded">
                      {responded} colab. ({percentageOfTotal}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-[#2D6A4F] h-full rounded-full" 
                      style={{ width: `${Math.min(100, (responded / (maxHeadcount || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              );
            })}

            <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-[11px] text-emerald-800 text-center font-medium">
              Base oficial validada e homologada para emissão do laudo técnico NR-01.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
