import React, { useState, useEffect } from 'react';
import { Company, AssessmentSession, AssessmentResponse, Department, RespondentPrefill } from '../types';
import { QUESTIONS, DIMENSIONS } from '../data/questions';
import { getCompanyAssessmentProgress } from '../utils/assessmentCalculations';
import { 
  CheckCircle2, ArrowLeft, ArrowRight, Save, Play, 
  Building2, Users, Briefcase, ShieldCheck, Sparkles, 
  RotateCcw, Check, AlertCircle, Clock, ChevronRight,
  FileText, ListChecks
} from 'lucide-react';

interface AssessmentViewProps {
  companies: Company[];
  selectedCompanyId?: string;
  sessions: AssessmentSession[];
  initialRespondentData?: RespondentPrefill;
  onClearInitialData?: () => void;
  onSaveSession: (session: AssessmentSession) => void;
  onNavigate: (view: 'dashboard' | 'companies' | 'questionnaires' | 'reports' | 'assessment', companyId?: string, prefill?: RespondentPrefill) => void;
}

export function AssessmentView({
  companies,
  selectedCompanyId,
  sessions,
  initialRespondentData,
  onClearInitialData,
  onSaveSession,
  onNavigate
}: AssessmentViewProps) {
  const [activeCompanyId, setActiveCompanyId] = useState<string>(
    initialRespondentData?.companyId || selectedCompanyId || companies[0]?.id || ''
  );

  useEffect(() => {
    if (selectedCompanyId && selectedCompanyId !== activeCompanyId) {
      setActiveCompanyId(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const activeCompany = companies.find(c => c.id === activeCompanyId) || companies[0];

  // Collaborator & Department details
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [roleName, setRoleName] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [workShift, setWorkShift] = useState<'Integral' | 'Matutino' | 'Vespertino' | 'Noturno' | 'Escala 12x36'>('Integral');
  const [tenureYears, setTenureYears] = useState<number>(2);

  // Responses state: questionId -> score (1..4)
  const [responses, setResponses] = useState<Record<number, 1 | 2 | 3 | 4>>({});
  const [currentStep, setCurrentStep] = useState<'form' | 'success'>('form');
  const [activeDimensionIndex, setActiveDimensionIndex] = useState<number>(0);

  // Helper to find first department with open quota (not completed)
  const getFirstAvailableDept = (comp: Company) => {
    if (!comp?.departments || comp.departments.length === 0) return null;
    const compProgress = getCompanyAssessmentProgress(comp, sessions);
    const available = comp.departments.find(d => {
      const dp = compProgress.departmentProgress.find(p => p.departmentId === d.id);
      return !dp?.isCompleted;
    });
    return available || comp.departments[0];
  };

  // Set default department when active company changes or on prefill
  useEffect(() => {
    if (initialRespondentData) {
      if (initialRespondentData.companyId && initialRespondentData.companyId !== activeCompanyId) {
        setActiveCompanyId(initialRespondentData.companyId);
      }
      if (initialRespondentData.departmentId) {
        setSelectedDeptId(initialRespondentData.departmentId);
      }
      if (initialRespondentData.roleName) {
        setRoleName(initialRespondentData.roleName);
      }
      if (initialRespondentData.workShift) {
        setWorkShift(initialRespondentData.workShift);
      }
      if (initialRespondentData.tenureYears !== undefined) {
        setTenureYears(initialRespondentData.tenureYears);
      }
      if (initialRespondentData.isAnonymous !== undefined) {
        setIsAnonymous(initialRespondentData.isAnonymous);
      }
      setActiveDimensionIndex(0);
      return;
    }

    if (activeCompany && activeCompany.departments && activeCompany.departments.length > 0) {
      const compProgress = getCompanyAssessmentProgress(activeCompany, sessions);
      const currentDeptProg = compProgress.departmentProgress.find(dp => dp.departmentId === selectedDeptId);
      
      // If current department is completed or invalid, pick the first open department
      if (!selectedDeptId || currentDeptProg?.isCompleted) {
        const firstOpen = getFirstAvailableDept(activeCompany);
        if (firstOpen) {
          setSelectedDeptId(firstOpen.id);
          if (firstOpen.roles && firstOpen.roles.length > 0) {
            setRoleName(firstOpen.roles[0]);
          } else {
            setRoleName('Colaborador');
          }
        }
      }
    } else {
      setSelectedDeptId('dp-geral');
      setRoleName('Colaborador');
    }

    // Generate default sequential collaborator code
    const existingForCompany = sessions.filter(s => s.companyId === activeCompany?.id).length;
    setEmployeeId(`COLAB-${String(existingForCompany + 1).padStart(3, '0')}`);
  }, [activeCompanyId, activeCompany, sessions, initialRespondentData]);

  // Update role when department changes
  const handleDepartmentChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    const dept = activeCompany?.departments?.find(d => d.id === deptId);
    if (dept && dept.roles && dept.roles.length > 0) {
      setRoleName(dept.roles[0]);
    }
  };

  const progress = activeCompany ? getCompanyAssessmentProgress(activeCompany, sessions) : null;

  const answeredCount = Object.keys(responses).length;
  const totalQuestions = QUESTIONS.length;
  const isComplete = answeredCount === totalQuestions;
  const completionPercentage = Math.round((answeredCount / totalQuestions) * 100);

  const handleSelectScore = (questionId: number, score: 1 | 2 | 3 | 4) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: score
    }));
  };

  const handleQuickFillRandom = () => {
    const quick: Record<number, 1 | 2 | 3 | 4> = {};
    QUESTIONS.forEach(q => {
      // Skew towards positive (3 and 4) like typical corporate surveys
      const rand = Math.random();
      if (rand < 0.1) quick[q.id] = 1;
      else if (rand < 0.25) quick[q.id] = 2;
      else if (rand < 0.65) quick[q.id] = 3;
      else quick[q.id] = 4;
    });
    setResponses(quick);
  };

  const handleResetForm = () => {
    setResponses({});
    setActiveDimensionIndex(0); // Garante retorno imediato para a Dimensão 1 (D1)
    
    if (activeCompany && activeCompany.departments && activeCompany.departments.length > 0) {
      const firstOpen = getFirstAvailableDept(activeCompany);
      if (firstOpen) {
        setSelectedDeptId(firstOpen.id);
        if (firstOpen.roles && firstOpen.roles.length > 0) {
          setRoleName(firstOpen.roles[0]);
        } else {
          setRoleName('Colaborador');
        }
      }
    }

    if (onClearInitialData) {
      onClearInitialData();
    }

    const existingForCompany = sessions.filter(s => s.companyId === activeCompany?.id).length;
    setEmployeeId(`COLAB-${String(existingForCompany + 1).padStart(3, '0')}`);
    setCurrentStep('form');
  };

  const handleSaveIndividualSession = () => {
    if (!activeCompany) return;
    if (!isComplete) {
      alert('Por favor, responda a todas as 38 questões antes de salvar o questionário.');
      return;
    }

    const dept = activeCompany.departments?.find(d => d.id === selectedDeptId);
    const deptName = dept ? dept.name : 'Geral';

    const formattedResponses: AssessmentResponse[] = QUESTIONS.map(q => ({
      questionId: q.id,
      score: responses[q.id] || 3
    }));

    const newSession: AssessmentSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      companyId: activeCompany.id,
      departmentId: selectedDeptId || 'dp-geral',
      departmentName: deptName,
      roleName: roleName || 'Colaborador',
      employeeIdentifier: isAnonymous ? 'Anônimo' : (employeeId || 'Colaborador'),
      isAnonymous,
      tenureYears,
      workShift,
      responses: formattedResponses,
      createdAt: new Date().toISOString()
    };

    onSaveSession(newSession);
    setCurrentStep('success');
  };

  const currentDimension = DIMENSIONS[activeDimensionIndex] || DIMENSIONS[0];
  const questionsInCurrentDim = QUESTIONS.filter(q => q.dimensionId === currentDimension.id);

  if (!companies || companies.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto mt-12 space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Nenhuma Empresa Cadastrada</h2>
        <p className="text-sm text-slate-500">Cadastre uma empresa cliente para iniciar o preenchimento do questionário.</p>
        <button 
          onClick={() => onNavigate('companies')}
          className="px-4 py-2 bg-[#2D6A4F] text-white rounded-lg font-bold text-sm"
        >
          Ir para Empresas
        </button>
      </div>
    );
  }

  const selectedDeptProg = progress?.departmentProgress.find(dp => dp.departmentId === selectedDeptId);
  const isSelectedDeptCompleted = !!selectedDeptProg && selectedDeptProg.isCompleted;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('companies')}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            title="Voltar para Empresas"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#2D6A4F] uppercase tracking-wider">
                Aplicação do Questionário HSE-IT
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                NR-01 / PGR
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Preenchimento de Avaliação Psicossocial
            </h1>
          </div>
        </div>

        {/* Company Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-2xs">
            <Building2 size={16} className="text-[#2D6A4F]" />
            <select
              value={activeCompanyId}
              onChange={(e) => {
                setActiveCompanyId(e.target.value);
                setResponses({});
                setActiveDimensionIndex(0);
              }}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.tradeName || c.corporateName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Progress & Company Summary Card */}
      {progress && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">{activeCompany.tradeName}</h3>
              <span className="text-xs text-slate-500">CNPJ: {activeCompany.cnpj}</span>
            </div>
            <p className="text-xs text-slate-500">
              Meta do Censo: <strong>{progress.totalCompleted}</strong> de <strong>{progress.totalRequired || activeCompany.employeeCount}</strong> colaboradores avaliados
            </p>
          </div>

          <div className="w-full md:w-72 space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-600">Adesão da Empresa</span>
              <span className={progress.isFullyCompleted ? 'text-emerald-700 font-black' : 'text-[#2D6A4F]'}>
                {progress.percentage}% {progress.isFullyCompleted && '(100% Concluído)'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full transition-all duration-500 ${
                  progress.isFullyCompleted ? 'bg-emerald-600' : 'bg-[#2D6A4F]'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Fully completed banner notification */}
      {progress?.isFullyCompleted && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            <div>
              <p className="font-bold text-sm">Censo 100% Finalizado para esta Empresa!</p>
              <p className="text-emerald-700">Todos os setores já atingiram a cota completa de respondentes amostrais exigidos pela NR-01.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('reports', activeCompany.id)}
            className="px-4 py-2 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white font-bold rounded-lg shrink-0 transition-colors flex items-center gap-1.5"
          >
            <FileText size={14} /> Emitir Laudo Técnico (PDF)
          </button>
        </div>
      )}

      {currentStep === 'success' ? (
        /* Success Screen */
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-6 max-w-xl mx-auto shadow-sm animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Avaliação Salva com Sucesso!</h2>
            <p className="text-sm text-slate-600">
              Os 38 itens psicossociais foram computados e integrados ao banco de dados estatístico de <strong>{activeCompany.tradeName}</strong>.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1 text-left">
            <div><strong>Setor:</strong> {activeCompany.departments?.find(d => d.id === selectedDeptId)?.name || 'Geral'}</div>
            <div><strong>Função/Cargo:</strong> {roleName}</div>
            <div><strong>Identificador:</strong> {isAnonymous ? 'Anônimo (Sigilo Assegurado)' : employeeId}</div>
            <div><strong>Data de Coleta:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleResetForm}
              className="w-full sm:w-auto px-6 py-3 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Play size={14} fill="currentColor" /> Responder Próximo Colaborador
            </button>
            <button
              onClick={() => onNavigate('reports', activeCompany.id)}
              className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <FileText size={14} /> Ver Laudo & Relatório (PDF)
            </button>
          </div>
        </div>
      ) : (
        /* Answering Form */
        <div className="space-y-6">
          
          {/* Section 1: Respondent Demographics Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-[#2D6A4F]" />
                Identificação do Respondente (Dados Demográficos NR-01)
              </h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-[#2D6A4F] focus:ring-[#2D6A4F]"
                  />
                  <span>Coleta 100% Anônima (Recomendado)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Department with Disabled Completed Options */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Setor / Departamento *</label>
                {activeCompany.departments && activeCompany.departments.length > 0 ? (
                  <select
                    value={selectedDeptId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white"
                  >
                    {activeCompany.departments.map(d => {
                      const deptProg = progress?.departmentProgress.find(dp => dp.departmentId === d.id);
                      const isCompleted = !!deptProg && deptProg.isCompleted;
                      const completed = deptProg?.completedCount || 0;
                      const total = deptProg?.headcount || d.headcount || 0;

                      return (
                        <option 
                          key={d.id} 
                          value={d.id} 
                          disabled={isCompleted}
                          className={isCompleted ? 'text-slate-400 bg-slate-100 italic' : 'text-slate-800'}
                        >
                          {d.name} ({completed}/{total} colab.) {isCompleted ? '— [Concluído ✓]' : ''}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    value="Geral / Administrativo"
                    readOnly
                    className="w-full p-2.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600"
                  />
                )}
                {isSelectedDeptCompleted && (
                  <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                    ⚠ Este setor já concluiu a cota de respondentes.
                  </span>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Função / Cargo</label>
                <input
                  type="text"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Ex: Operador de Máquina"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white"
                />
              </div>

              {/* Work Shift */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Turno de Trabalho</label>
                <select
                  value={workShift}
                  onChange={(e) => setWorkShift(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white"
                >
                  <option value="Integral">Integral / Administrativo</option>
                  <option value="Matutino">Turno 1 - Matutino</option>
                  <option value="Vespertino">Turno 2 - Vespertino</option>
                  <option value="Noturno">Turno 3 - Noturno</option>
                  <option value="Escala 12x36">Escala 12x36</option>
                </select>
              </div>

              {/* Tenure Years */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tempo de Empresa</label>
                <select
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white"
                >
                  <option value={1}>Menos de 1 ano</option>
                  <option value={2}>1 a 2 anos</option>
                  <option value={5}>3 a 5 anos</option>
                  <option value={10}>Mais de 5 anos</option>
                </select>
              </div>

            </div>
          </div>

          {/* Section 2: Interactive Questionnaire */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
            
            {/* Header & Quick Action Buttons */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ListChecks size={18} className="text-[#2D6A4F]" />
                  Questionário HSE-IT ({answeredCount} de {totalQuestions} respondidas)
                </h2>
                <p className="text-xs text-slate-500">
                  Avalie cada afirmativa selecionando uma nota de 1 a 4 na escala Likert.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleQuickFillRandom}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                  title="Preenche respostas sugeridas para agilizar a demonstração"
                >
                  <Sparkles size={13} className="text-amber-600" />
                  Preenchimento Rápido
                </button>
                <button
                  onClick={handleResetForm}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  Limpar
                </button>
              </div>
            </div>

            {/* Dimension Tabs Navigation */}
            <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50 px-4 pt-2 gap-2 scrollbar-none">
              {DIMENSIONS.map((dim, idx) => {
                const isSelected = activeDimensionIndex === idx;
                const dimQuestions = QUESTIONS.filter(q => q.dimensionId === dim.id);
                const dimAnswered = dimQuestions.filter(q => responses[q.id] !== undefined).length;
                const isDimComplete = dimAnswered === dimQuestions.length;

                return (
                  <button
                    key={dim.id}
                    onClick={() => setActiveDimensionIndex(idx)}
                    className={`px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t border-x shrink-0 ${
                      isSelected
                        ? 'bg-white text-[#2D6A4F] border-slate-200 border-b-white -mb-px shadow-2xs'
                        : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800'
                    }`}
                  >
                    <span>D{idx + 1}: {dim.name.split(' ')[0]}</span>
                    {isDimComplete ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {dimAnswered}/{dimQuestions.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Questions List for Current Dimension */}
            <div className="p-6 space-y-6">
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100/80">
                <span className="text-[10px] font-bold text-[#2D6A4F] uppercase tracking-wider block">
                  Dimensão {activeDimensionIndex + 1} de {DIMENSIONS.length}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{currentDimension.name}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{currentDimension.description}</p>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {questionsInCurrentDim.map((q) => {
                  const selectedScore = responses[q.id];

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all ${
                        selectedScore !== undefined
                          ? 'border-slate-200 bg-slate-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400">
                              Item #{q.id}
                            </span>
                            {q.isConductIndicator && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                                Indicador Conduta ({q.isConductIndicator})
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                            {q.text}
                          </p>
                        </div>

                        {/* Likert 4 Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 md:w-96">
                          
                          {/* 1 - Discordo Fortemente */}
                          <button
                            type="button"
                            onClick={() => handleSelectScore(q.id, 1)}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                              selectedScore === 1
                                ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                                : 'bg-white hover:bg-red-50/50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span className="font-bold text-xs">1</span>
                            <span className="text-[10px] leading-tight opacity-90 truncate max-w-[80px]">
                              Discordo Fort.
                            </span>
                          </button>

                          {/* 2 - Discordo */}
                          <button
                            type="button"
                            onClick={() => handleSelectScore(q.id, 2)}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                              selectedScore === 2
                                ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300'
                                : 'bg-white hover:bg-amber-50/50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span className="font-bold text-xs">2</span>
                            <span className="text-[10px] leading-tight opacity-90 truncate max-w-[80px]">
                              Discordo
                            </span>
                          </button>

                          {/* 3 - Concordo */}
                          <button
                            type="button"
                            onClick={() => handleSelectScore(q.id, 3)}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                              selectedScore === 3
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                                : 'bg-white hover:bg-blue-50/50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span className="font-bold text-xs">3</span>
                            <span className="text-[10px] leading-tight opacity-90 truncate max-w-[80px]">
                              Concordo
                            </span>
                          </button>

                          {/* 4 - Concordo Fortemente */}
                          <button
                            type="button"
                            onClick={() => handleSelectScore(q.id, 4)}
                            className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                              selectedScore === 4
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300'
                                : 'bg-white hover:bg-emerald-50/50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span className="font-bold text-xs">4</span>
                            <span className="text-[10px] leading-tight opacity-90 truncate max-w-[80px]">
                              Concordo Fort.
                            </span>
                          </button>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Pagination & Submit */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                
                <div className="flex items-center gap-2">
                  <button
                    disabled={activeDimensionIndex === 0}
                    onClick={() => setActiveDimensionIndex(prev => Math.max(0, prev - 1))}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ← Dimensão Anterior
                  </button>

                  <button
                    disabled={activeDimensionIndex === DIMENSIONS.length - 1}
                    onClick={() => setActiveDimensionIndex(prev => Math.min(DIMENSIONS.length - 1, prev + 1))}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Próxima Dimensão →
                  </button>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="text-right hidden sm:block">
                    <span className="text-xs font-bold text-slate-700 block">
                      {answeredCount} de {totalQuestions} itens
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isComplete ? 'Todas respondidas' : `Faltam ${totalQuestions - answeredCount}`}
                    </span>
                  </div>

                  <button
                    onClick={handleSaveIndividualSession}
                    disabled={!isComplete}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${
                      isComplete
                        ? 'bg-[#2D6A4F] hover:bg-[#3A5A40] text-white cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save size={15} /> Finalizar e Registrar Avaliação
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
