import React, { useState } from 'react';
import { Company, ProfessionalProfile, AssessmentSession } from '../types';
import { 
  FileText, Download, Printer, Search, Building2, 
  Calendar, CheckCircle2, AlertTriangle, ArrowRight, Eye, ShieldCheck, Filter,
  Lock, Clock, Play
} from 'lucide-react';
import { ExecutiveReportView } from './ExecutiveReportView';
import { getCompanyAssessmentProgress, calculateRealTimeAnalytics } from '../utils/assessmentCalculations';

interface ReportsViewProps {
  companies: Company[];
  sessions?: AssessmentSession[];
  profile: ProfessionalProfile;
  selectedCompanyId?: string;
  onNavigate?: (view: 'dashboard' | 'companies' | 'questionnaires' | 'reports' | 'assessment', companyId?: string) => void;
  onUpdateProfile?: (updated: ProfessionalProfile) => void;
}

export function ReportsView({ companies, sessions = [], profile, selectedCompanyId: initialCompanyId, onNavigate, onUpdateProfile }: ReportsViewProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(initialCompanyId || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingReportCompany, setViewingReportCompany] = useState<Company | null>(() => {
    if (initialCompanyId && initialCompanyId !== 'all') {
      const match = companies.find(c => c.id === initialCompanyId);
      return match || null;
    }
    return null;
  });
  const [autoPrintReport, setAutoPrintReport] = useState<boolean>(false);

  const reportList = companies.map((c) => {
    const progress = getCompanyAssessmentProgress(c, sessions);
    const analytics = calculateRealTimeAnalytics(c, sessions);

    return {
      id: `rep-${c.id}`,
      company: c,
      title: `Laudo Técnico Ocupacional NR-01 (${c.tradeName})`,
      campaignTitle: c.campaigns?.[0]?.title || 'Censo Psicossocial NR-01',
      issuedDate: c.lastAssessment || new Date().toLocaleDateString('pt-BR'),
      progress,
      analytics,
      isFullyCompleted: progress.isFullyCompleted
    };
  });

  const filteredReports = reportList.filter(r => {
    const matchesCompany = selectedCompanyId === 'all' || r.company.id === selectedCompanyId;
    const matchesSearch = 
      r.company.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.campaignTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCompany && matchesSearch;
  });

  const handleOpenReport = (company: Company, printImmediately: boolean = false) => {
    setAutoPrintReport(printImmediately);
    setViewingReportCompany(company);
  };

  if (viewingReportCompany) {
    const liveAnalytics = calculateRealTimeAnalytics(viewingReportCompany, sessions);
    return (
      <ExecutiveReportView 
        company={viewingReportCompany}
        analytics={liveAnalytics}
        profile={profile}
        autoPrint={autoPrintReport}
        onUpdateProfile={onUpdateProfile}
        onBack={() => {
          setViewingReportCompany(null);
          setAutoPrintReport(false);
        }}
      />
    );
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">Relatórios & Laudos Técnicos (PDF)</h1>
          <p className="text-sm text-slate-500">
            Documentação técnica oficial para o PGR (NR-01) com parecer pericial psicossocial e homologação técnica.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por empresa ou título do laudo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Filter size={14} /> Empresa:
          </span>
          <select 
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none shadow-xs"
          >
            <option value="all">Todas as Empresas ({companies.length})</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.tradeName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map(rep => {
          const isCritical = rep.analytics.overallRiskLevel === 'high';
          const isModerate = rep.analytics.overallRiskLevel === 'moderate';

          return (
            <div 
              key={rep.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-6 space-y-4">
                
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {rep.isFullyCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                        <ShieldCheck size={12} /> Homologado NR-01 (100%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                        <Clock size={12} /> Coleta Incompleta ({rep.progress.remainingCount} faltam)
                      </span>
                    )}
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{rep.title}</h3>
                    <p className="text-xs text-slate-500">{rep.campaignTitle}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    rep.isFullyCompleted ? 'bg-emerald-50 text-[#2D6A4F]' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status da Amostra:</span>
                    <span className={`font-black ${rep.isFullyCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {rep.progress.totalCompleted} / {rep.progress.totalRequired} colab. ({rep.progress.percentage}%)
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Índice de Favorabilidade:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {rep.isFullyCompleted ? `${rep.analytics.overallFavorability} / 100 pts` : '— (Bloqueado)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Classificação HSE-IT:</span>
                    {rep.isFullyCompleted ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        rep.analytics.overallFavorabilityLevel === 'critical' ? 'bg-red-100 text-red-800' : 
                        rep.analytics.overallFavorabilityLevel === 'warning' ? 'bg-amber-100 text-amber-800' : 
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rep.analytics.overallFavorabilityLevel === 'critical' ? 'Crítico (<40)' : 
                         rep.analytics.overallFavorabilityLevel === 'warning' ? 'Atenção (40-66)' : 
                         'Favorável (67+)'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Aguardando 100%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> Data: {rep.issuedDate}
                  </span>
                  <span>Resp. Técnico: {profile.name.split(' ')[0]} {profile.name.split(' ')[1]}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2">
                <button 
                  onClick={() => handleOpenReport(rep.company, false)}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold rounded-lg shadow-2xs transition-all"
                >
                  <Eye size={14} /> Visualizar
                </button>
                <button 
                  onClick={() => handleOpenReport(rep.company, true)}
                  className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Printer size={14} /> Imprimir / PDF
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
