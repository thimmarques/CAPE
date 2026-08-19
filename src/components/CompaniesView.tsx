import React, { useState } from 'react';
import { Company, Department, AssessmentCampaign, AssessmentSession } from '../types';
import { 
  Building2, Plus, Search, Filter, MapPin, Users, Phone, Mail, 
  ExternalLink, Edit3, Trash2, Layers, Briefcase, Calendar, 
  CheckCircle2, X, AlertCircle, ChevronRight, BarChart3, FileText, Play,
  RefreshCw, ShieldCheck, Clock, Lock
} from 'lucide-react';
import { getCompanyAssessmentProgress } from '../utils/assessmentCalculations';

interface CompaniesViewProps {
  companies: Company[];
  sessions?: AssessmentSession[];
  onAddCompany: (company: Company) => void;
  onUpdateCompany: (company: Company) => void;
  onNavigate: (view: 'dashboard' | 'companies' | 'questionnaires' | 'reports' | 'assessment', companyId?: string) => void;
}

export function CompaniesView({ 
  companies, 
  sessions = [], 
  onAddCompany, 
  onUpdateCompany, 
  onNavigate 
}: CompaniesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // Modal states
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form state for new/edit company including departments with headcounts
  const [formData, setFormData] = useState({
    corporateName: '',
    tradeName: '',
    cnpj: '',
    cnae: '',
    segment: '',
    address: '',
    city: '',
    state: '',
    rhContactName: '',
    rhContactEmail: '',
    rhContactPhone: '',
    employeeCount: 0,
    respondedEmployeeCount: 0,
    status: 'active' as 'active' | 'inactive',
    departments: [] as { id: string; name: string; headcount: number; roles: string[] }[]
  });

  // Structure form state for direct sector adding in modal
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptHeadcount, setNewDeptHeadcount] = useState(0);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Campaign form state
  const [newCampaignTitle, setNewCampaignTitle] = useState('');
  const [newCampaignTarget, setNewCampaignTarget] = useState(0);

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = 
      c.tradeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.corporateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm) ||
      (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openNewCompanyModal = () => {
    setEditingCompany(null);
    setNewDeptHeadcount(0);
    setNewDeptName('');
    setFormData({
      corporateName: '',
      tradeName: '',
      cnpj: '',
      cnae: '',
      segment: '',
      address: '',
      city: '',
      state: 'SP',
      rhContactName: '',
      rhContactEmail: '',
      rhContactPhone: '',
      employeeCount: 0,
      respondedEmployeeCount: 0,
      status: 'active',
      departments: []
    });
    setIsCompanyModalOpen(true);
  };

  const openEditCompanyModal = (company: Company) => {
    setEditingCompany(company);
    setNewDeptHeadcount(0);
    setNewDeptName('');
    setFormData({
      corporateName: company.corporateName,
      tradeName: company.tradeName,
      cnpj: company.cnpj,
      cnae: company.cnae || '',
      segment: company.segment || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || 'SP',
      rhContactName: company.rhContactName || '',
      rhContactEmail: company.rhContactEmail || '',
      rhContactPhone: company.rhContactPhone || '',
      employeeCount: company.employeeCount,
      respondedEmployeeCount: company.respondedEmployeeCount ?? company.employeeCount,
      status: company.status,
      departments: (company.departments || []).map(d => ({
        id: d.id,
        name: d.name,
        headcount: Number(d.headcount) || 0,
        roles: d.roles || ['Colaborador']
      }))
    });
    setIsCompanyModalOpen(true);
  };

  // Helper to sync total company count with the sum of department headcounts
  const departmentsSum = formData.departments.reduce((acc, d) => acc + (Number(d.headcount) || 0), 0);

  const handleSyncHeadcount = () => {
    if (departmentsSum > 0) {
      setFormData(prev => ({ 
        ...prev, 
        employeeCount: departmentsSum,
        respondedEmployeeCount: prev.respondedEmployeeCount === 0 || prev.respondedEmployeeCount > departmentsSum ? departmentsSum : prev.respondedEmployeeCount
      }));
    }
  };

  const handleDepartmentHeadcountChange = (index: number, val: number) => {
    const updated = [...formData.departments];
    updated[index].headcount = Math.max(0, val);
    setFormData(prev => ({ ...prev, departments: updated }));
  };

  const handleDepartmentNameChange = (index: number, name: string) => {
    const updated = [...formData.departments];
    updated[index].name = name;
    setFormData(prev => ({ ...prev, departments: updated }));
  };

  const handleAddDepartmentToForm = () => {
    if (!newDeptName.trim()) return;
    const newDept = {
      id: `d-form-${Date.now()}`,
      name: newDeptName.trim(),
      headcount: Math.max(0, newDeptHeadcount),
      roles: ['Colaborador']
    };
    setFormData(prev => ({
      ...prev,
      departments: [...prev.departments, newDept]
    }));
    setNewDeptName('');
    setNewDeptHeadcount(0);
  };

  const handleRemoveDepartmentFromForm = (index: number) => {
    const updated = formData.departments.filter((_, idx) => idx !== index);
    setFormData(prev => ({ ...prev, departments: updated }));
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tradeName || !formData.cnpj) return;

    const deptsToSave: Department[] = formData.departments.map(d => ({
      id: d.id,
      companyId: editingCompany ? editingCompany.id : `c-${Date.now()}`,
      name: d.name,
      headcount: Number(d.headcount) || 0,
      roles: d.roles && d.roles.length > 0 ? d.roles : ['Colaborador']
    }));

    const effectiveRespondents = formData.respondedEmployeeCount > 0 ? formData.respondedEmployeeCount : formData.employeeCount;

    if (editingCompany) {
      const updated: Company = {
        ...editingCompany,
        corporateName: formData.corporateName,
        tradeName: formData.tradeName,
        cnpj: formData.cnpj,
        cnae: formData.cnae,
        segment: formData.segment,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        rhContactName: formData.rhContactName,
        rhContactEmail: formData.rhContactEmail,
        rhContactPhone: formData.rhContactPhone,
        employeeCount: formData.employeeCount,
        respondedEmployeeCount: effectiveRespondents,
        status: formData.status,
        departments: deptsToSave
      };
      onUpdateCompany(updated);
      if (selectedCompany?.id === updated.id) {
        setSelectedCompany(updated);
      }
    } else {
      const newCompanyId = `c-${Date.now()}`;
      const newComp: Company = {
        id: newCompanyId,
        corporateName: formData.corporateName,
        tradeName: formData.tradeName,
        cnpj: formData.cnpj,
        cnae: formData.cnae,
        segment: formData.segment,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        rhContactName: formData.rhContactName,
        rhContactEmail: formData.rhContactEmail,
        rhContactPhone: formData.rhContactPhone,
        employeeCount: formData.employeeCount,
        respondedEmployeeCount: effectiveRespondents,
        status: formData.status,
        departments: deptsToSave.map(d => ({ ...d, companyId: newCompanyId })),
        campaigns: [
          {
            id: `camp-${Date.now()}`,
            companyId: newCompanyId,
            title: `Censo Psicossocial NR-01 (${effectiveRespondents} Respondentes)`,
            startDate: new Date().toISOString().split('T')[0],
            status: 'active',
            targetCount: effectiveRespondents,
            completedCount: 0
          }
        ]
      };
      onAddCompany(newComp);
    }
    setIsCompanyModalOpen(false);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 overflow-hidden">
      
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">Gestão de Empresas & Estrutura</h1>
          <p className="text-sm text-slate-500">
            Cadastre o total de colaboradores da empresa e especifique a quantidade exata por setor para a coleta individual obrigatória (NR-01).
          </p>
        </div>
        <button 
          onClick={openNewCompanyModal}
          className="flex items-center gap-2 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Plus size={18} /> Nova Empresa
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por nome, razão social, CNPJ ou cidade..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Filter size={14} /> Status:
          </span>
          <div className="inline-flex rounded-lg p-1 bg-slate-100 border border-slate-200">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Todos ({companies.length})
            </button>
            <button 
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'active' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Ativos ({companies.filter(c => c.status === 'active').length})
            </button>
            <button 
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${statusFilter === 'inactive' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Inativos ({companies.filter(c => c.status === 'inactive').length})
            </button>
          </div>
        </div>
      </div>

      {/* Companies Horizontal List */}
      <div className="space-y-2.5">
        {/* Column Headers (Desktop) */}
        {filteredCompanies.length > 0 && (
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Empresa / Razão Social</div>
            <div className="col-span-2">CNPJ</div>
            <div className="col-span-2">Total de Colaboradores</div>
            <div className="col-span-2">Questionário HSE-IT</div>
            <div className="col-span-2 text-right pr-1">Ações</div>
          </div>
        )}

        {filteredCompanies.map(company => {
          const progress = getCompanyAssessmentProgress(company, sessions);

          return (
            <div 
              key={company.id}
              className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 sm:px-5 sm:py-3.5 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col lg:grid lg:grid-cols-12 lg:items-center gap-3 lg:gap-4 group"
            >
              {/* 1. NOME */}
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#2D6A4F]/10 group-hover:text-[#2D6A4F] group-hover:border-[#2D6A4F]/30 transition-colors">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm truncate leading-tight group-hover:text-[#1A392A] transition-colors" title={company.tradeName}>
                      {company.tradeName}
                    </h3>
                    <span 
                      className={`w-2 h-2 rounded-full shrink-0 ${company.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} 
                      title={company.status === 'active' ? 'Status: Ativo' : 'Status: Inativo'}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate" title={company.corporateName}>
                    {company.corporateName}
                  </p>
                </div>
              </div>

              {/* 2. CNPJ */}
              <div className="col-span-2 flex items-center gap-2">
                <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">CNPJ:</span>
                <span className="font-mono text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md truncate">
                  {company.cnpj}
                </span>
              </div>

              {/* 3. TOTAL DE COLABORADORES */}
              <div className="col-span-2 flex items-center gap-2">
                <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total:</span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <Users size={13} className="text-slate-400" />
                    {company.employeeCount} colab.
                  </span>
                  {company.respondedEmployeeCount && company.respondedEmployeeCount !== company.employeeCount ? (
                    <span className="text-[10px] text-[#2D6A4F] font-medium mt-0.5 ml-0.5">
                      Base: {company.respondedEmployeeCount} respondentes
                    </span>
                  ) : null}
                </div>
              </div>

              {/* 4. BALÃO VERDE (Porcentagem do Questionário) */}
              <div className="col-span-2 flex items-center">
                <div 
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    progress.isFullyCompleted
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300/80'
                      : 'bg-emerald-50/70 text-[#2D6A4F] border-emerald-200'
                  }`}
                  title={`${progress.totalCompleted} de ${progress.totalRequired} questionários coletados (${progress.percentage}%)`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    progress.isFullyCompleted ? 'bg-emerald-600' : 'bg-[#2D6A4F] animate-pulse'
                  }`} />
                  <span className="font-bold">{progress.percentage}%</span>
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                    ({progress.totalCompleted}/{progress.totalRequired})
                  </span>
                </div>
              </div>

              {/* Ações: Iniciar Questionário (para novos clientes / não concluídos), Laudo PDF e Edição */}
              <div className="col-span-2 flex items-center justify-end gap-1.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {!progress.isFullyCompleted && (
                  <button 
                    onClick={() => onNavigate('assessment', company.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#2D6A4F] hover:bg-[#3A5A40] rounded-lg shadow-2xs transition-colors cursor-pointer"
                    title="Iniciar Coleta de Respostas do Questionário HSE-IT"
                    aria-label="Iniciar Questionário"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Iniciar</span>
                  </button>
                )}

                <button 
                  onClick={() => onNavigate('reports', company.id)}
                  className="p-2 text-slate-500 hover:text-[#2D6A4F] hover:bg-[#2D6A4F]/10 border border-slate-200/80 hover:border-[#2D6A4F]/30 rounded-lg transition-colors cursor-pointer"
                  title="Gerar Laudo Executivo & Diagnóstico PDF"
                  aria-label="Gerar Laudo Executivo & Diagnóstico PDF"
                >
                  <FileText size={16} />
                </button>

                <button 
                  onClick={() => openEditCompanyModal(company)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="Editar Dados da Empresa"
                  aria-label="Editar Dados da Empresa"
                >
                  <Edit3 size={16} />
                </button>
              </div>

            </div>
          );
        })}

        {filteredCompanies.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
            <Building2 className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Nenhuma empresa encontrada com os filtros atuais.</p>
          </div>
        )}
      </div>

      {/* Modal: New / Edit Company with Full Department Headcount Controls */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingCompany ? `Editar Empresa: ${editingCompany.tradeName}` : 'Cadastrar Nova Empresa Cliente'}
                  </h3>
                  <p className="text-xs text-slate-500">Defina os dados corporativos e distribua os colaboradores por setor</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCompanyModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="p-6 space-y-6">
              
              {/* Section 1: Dados Gerais */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={14} /> 1. Dados Cadastrais & SST
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Fantasia *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: BioFarma Diagnósticos"
                      value={formData.tradeName}
                      onChange={(e) => setFormData({...formData, tradeName: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Razão Social *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ex: BioFarma Soluções e Diagnósticos Ltda."
                      value={formData.corporateName}
                      onChange={(e) => setFormData({...formData, corporateName: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CNPJ *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="00.000.000/0000-00"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">CNAE Principal</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 21.21-1-01"
                      value={formData.cnae}
                      onChange={(e) => setFormData({...formData, cnae: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ramo / Segmento</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Saúde & Biotecnologia"
                      value={formData.segment}
                      onChange={(e) => setFormData({...formData, segment: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Endereço / Unidade</label>
                    <input 
                      type="text" 
                      placeholder="Av. Paulista, 2200 - Bela Vista"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cidade / UF</label>
                    <input 
                      type="text" 
                      placeholder="São Paulo - SP"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: QUANTIDADE DE COLABORADORES E SETORES (Core Feature) */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Users size={15} className="text-[#2D6A4F]" /> 2. Quantidade de Colaboradores & Base de Respondentes
                  </h4>
                </div>

                {/* Card com os 2 campos de Colaboradores: Total da Empresa + Total que Responderam */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo 1: Total da Empresa */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800 uppercase">
                      Total de Colaboradores da Empresa *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Quadro geral de funcionários registrados na empresa.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="number" 
                        min={0}
                        required
                        value={formData.employeeCount}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setFormData(prev => ({
                            ...prev, 
                            employeeCount: val,
                            respondedEmployeeCount: prev.respondedEmployeeCount === 0 || prev.respondedEmployeeCount > val ? val : prev.respondedEmployeeCount
                          }));
                        }}
                        className="w-28 px-3 py-2 text-base font-black text-center bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                      />
                      <span className="text-xs font-semibold text-slate-600">colaboradores</span>
                    </div>
                  </div>

                  {/* Campo 2: Total que Responderam (Base de Cálculo) */}
                  <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0 md:pl-4">
                    <label className="block text-xs font-bold text-[#1A392A] uppercase flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2D6A4F]"></span>
                      Total de Colaboradores que Responderam *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Base de cálculo real do censo (exclui recusas e colaboradores ausentes).
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="number" 
                        min={0}
                        value={formData.respondedEmployeeCount}
                        onChange={(e) => setFormData({...formData, respondedEmployeeCount: Math.max(0, parseInt(e.target.value) || 0)})}
                        className="w-28 px-3 py-2 text-base font-black text-center bg-emerald-50/50 border border-emerald-300 text-[#1A392A] rounded-lg focus:ring-2 focus:ring-[#2D6A4F] outline-none"
                      />
                      <span className="text-xs font-bold text-[#2D6A4F]">respondentes (base)</span>
                    </div>
                  </div>
                </div>

                {/* Department List with Headcount per Sector */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Setores Cadastrados e Quantidade por Setor:</span>
                    <span className="text-xs font-semibold text-slate-500 font-mono">
                      Soma dos Setores: <strong>{departmentsSum}</strong> colab.
                    </span>
                  </div>

                  <div className="space-y-2">
                    {formData.departments.map((dept, idx) => (
                      <div key={dept.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                        <div className="flex-1 min-w-[150px]">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Nome do Setor</label>
                          <input 
                            type="text" 
                            value={dept.name}
                            onChange={(e) => handleDepartmentNameChange(idx, e.target.value)}
                            placeholder="Ex: Linha de Montagem"
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded focus:ring-1 focus:ring-[#2D6A4F] outline-none"
                          />
                        </div>

                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Colab. do Setor</label>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              min={0}
                              value={dept.headcount}
                              onChange={(e) => handleDepartmentHeadcountChange(idx, parseInt(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 text-xs font-bold text-center border border-slate-200 rounded focus:ring-1 focus:ring-[#2D6A4F] outline-none"
                            />
                            <span className="text-[10px] font-semibold text-slate-400">colab.</span>
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleRemoveDepartmentFromForm(idx)}
                          disabled={formData.departments.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded mt-4 disabled:opacity-30"
                          title="Remover Setor"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Department Row */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Nome do novo setor (ex: Logística)"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      className="flex-1 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-[#2D6A4F] bg-white"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input 
                        type="number" 
                        min={0}
                        placeholder="0"
                        value={newDeptHeadcount}
                        onChange={(e) => setNewDeptHeadcount(parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1.5 text-xs font-bold text-center border border-slate-300 rounded-lg outline-none bg-white"
                      />
                      <button 
                        type="button"
                        onClick={handleAddDepartmentToForm}
                        className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1"
                      >
                        <Plus size={14} /> Adicionar Setor
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  <CheckCircle2 size={16} /> Salvar Empresa e Estrutura
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
