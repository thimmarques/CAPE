import React, { useRef, useEffect, useState } from 'react';
import { Company, AnalyticsReport, ProfessionalProfile } from '../types';
import { 
  Printer, ArrowLeft, Building2, User, 
  Calendar, CheckCircle2, AlertTriangle, ShieldCheck, 
  FileText, Award, Layers, BarChart2, TrendingUp, AlertOctagon, HelpCircle,
  Download, Info, Loader2, Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  Cell, ReferenceLine, Legend
} from 'recharts';

interface ExecutiveReportViewProps {
  company: Company;
  analytics: AnalyticsReport;
  profile: ProfessionalProfile;
  autoPrint?: boolean;
  onBack: () => void;
}

export function ExecutiveReportView({ company, analytics, profile, autoPrint, onBack }: ExecutiveReportViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handleDirectPdfDownload();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const printViaHiddenIframe = () => {
    if (!printRef.current) {
      window.print();
      return;
    }
    try {
      let iframe = document.getElementById('print-hidden-iframe') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-hidden-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
      }
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        return;
      }

      const headContent = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(node => node.outerHTML)
        .join('\n');

      const cleanCompanyName = (company.tradeName || company.corporateName || 'Empresa').replace(/[^a-zA-Z0-9_-]/g, '_');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Laudo_Tecnico_NR01_${cleanCompanyName}</title>
            ${headContent}
            <style>
              @page { size: A4 portrait; margin: 0; }
              body { background: white !important; padding: 0; margin: 0; font-family: system-ui, -apple-system, sans-serif; }
              .report-a4-page { page-break-after: always; break-after: page; min-height: 297mm; height: 297mm; box-sizing: border-box; padding: 12mm !important; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      }, 400);
    } catch (e) {
      console.warn('Fallback direto para window.print:', e);
      window.print();
    }
  };

  const handleDirectPdfDownload = async () => {
    if (!printRef.current || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfProgress('Iniciando...');
    try {
      const cleanCompanyName = (company.tradeName || company.corporateName || 'Empresa').replace(/[^a-zA-Z0-9_-]/g, '_');
      const pageElements = printRef.current.querySelectorAll('.report-a4-page');
      
      if (!pageElements || pageElements.length === 0) {
        printViaHiddenIframe();
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfPageWidth = 210;
      const pdfPageHeight = 297;

      for (let i = 0; i < pageElements.length; i++) {
        setPdfProgress(`Processando pág. ${i + 1} de ${pageElements.length}...`);
        const pageEl = pageElements[i] as HTMLElement;
        
        // Render each A4 page individually with high resolution and crisp natural font rendering
        const dataUrl = await toPng(pageEl, {
          quality: 0.98,
          pixelRatio: 2.5,
          backgroundColor: '#ffffff',
          cacheBust: true,
          fontEmbedCSS: '',
        });

        // Load image to compute exact aspect ratio and avoid any font or dimension stretching
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });

        const imgWidthPx = img.naturalWidth || img.width || 794;
        const imgHeightPx = img.naturalHeight || img.height || 1123;
        const imgRatio = imgWidthPx / imgHeightPx;

        // Calculate proportional width and height on standard A4 page
        let renderWidth = pdfPageWidth;
        let renderHeight = pdfPageWidth / imgRatio;

        if (renderHeight > pdfPageHeight) {
          renderHeight = pdfPageHeight;
          renderWidth = pdfPageHeight * imgRatio;
        }

        const xOffset = Math.max(0, (pdfPageWidth - renderWidth) / 2);
        const yOffset = 0;

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');
      }

      setPdfProgress('Salvando arquivo...');
      pdf.save(`Laudo_Tecnico_NR01_${cleanCompanyName}.pdf`);
    } catch (error) {
      console.error('Erro na renderização das páginas do PDF:', error);
      printViaHiddenIframe();
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress('');
    }
  };

  const getFavBadge = (fav: number) => {
    if (fav >= 67) {
      return {
        label: 'Favorável',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        color: '#10B981',
        desc: 'Baixo risco psicossocial (Fator Protetivo)'
      };
    } else if (fav >= 40) {
      return {
        label: 'Atenção',
        badge: 'bg-amber-100 text-amber-800 border-amber-300',
        color: '#F59E0B',
        desc: 'Risco moderado (Necessita monitoramento e ações preventivas)'
      };
    } else {
      return {
        label: 'Crítico',
        badge: 'bg-red-100 text-red-800 border-red-300',
        color: '#EF4444',
        desc: 'Risco alto (Intervenção prioritária imediata no PGR)'
      };
    }
  };

  const getBullyingBadge = (rate: number) => {
    if (rate > 25) {
      return { label: 'Crítico', badge: 'bg-red-100 text-red-800 border-red-300', color: '#EF4444' };
    } else if (rate >= 10) {
      return { label: 'Atenção', badge: 'bg-amber-100 text-amber-800 border-amber-300', color: '#F59E0B' };
    } else {
      return { label: 'Favorável', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', color: '#10B981' };
    }
  };

  const getSexualBadge = (rate: number) => {
    if (rate > 10) {
      return { label: 'Crítico', badge: 'bg-red-100 text-red-800 border-red-300', color: '#EF4444' };
    } else if (rate >= 3) {
      return { label: 'Atenção', badge: 'bg-amber-100 text-amber-800 border-amber-300', color: '#F59E0B' };
    } else {
      return { label: 'Favorável', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', color: '#10B981' };
    }
  };

  // Radar Data for the 6 HSE-IT Dimensions
  const radarData = analytics.dimensionScores.map(d => ({
    dimension: d.dimensionName,
    favorabilidade: d.favorabilityIndex,
    corteFavoravel: 67,
    fullDimension: d.dimensionName,
  }));

  // Participants per Sector
  const participantsData = analytics.departmentScores.map(d => ({
    name: d.departmentName.length > 14 ? d.departmentName.substring(0, 12) + '...' : d.departmentName,
    fullName: d.departmentName,
    participantes: d.respondentsCount,
    percentual: d.percentageOfTotal,
    isSmall: d.isSmallSample
  }));

  // Sector Favorability
  const sectorFavorabilityData = analytics.departmentScores.map(d => ({
    name: d.departmentName.length > 14 ? d.departmentName.substring(0, 12) + '...' : d.departmentName,
    fullName: d.departmentName,
    favorabilidade: d.favorabilityIndex,
    corte: 67
  }));

  // Bullying Data per Sector
  const bullyingData = analytics.moralHarassmentStats.departmentStats.map(d => ({
    name: d.departmentName.length > 14 ? d.departmentName.substring(0, 12) + '...' : d.departmentName,
    fullName: d.departmentName,
    taxa: d.rate,
    afetados: d.affectedCount,
    total: d.totalDept
  }));

  // Sexual Harassment Data per Sector
  const sexualData = analytics.sexualHarassmentStats.departmentStats.map(d => ({
    name: d.departmentName.length > 14 ? d.departmentName.substring(0, 12) + '...' : d.departmentName,
    fullName: d.departmentName,
    taxa: d.rate,
    afetados: d.affectedCount,
    total: d.totalDept
  }));

  // Worst Questions Data for Chart
  const worstQuestionsData = analytics.worstQuestions.map((q, idx) => ({
    name: `Q${q.questionId}`,
    fullName: q.text,
    favorabilidade: q.favorabilityIndex,
    media: q.averageScore,
    dimension: q.dimensionName
  }));

  const globalFav = getFavBadge(analytics.overallFavorability);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <button 
          id="btn-back-to-reports"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft size={18} /> Voltar aos Relatórios
        </button>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500 hidden md:inline">
            Formato Padrão A4 • NR-1 / Portaria MTE nº 1.419/2024
          </span>
          <button 
            id="btn-print-save-pdf"
            onClick={handleDirectPdfDownload}
            disabled={isGeneratingPdf}
            title="Salvar e baixar Laudo Técnico em PDF"
            className="flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:shadow-md active:opacity-90 transition-all cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 size={17} className="animate-spin" /> {pdfProgress || 'Gerando PDF...'}
              </>
            ) : (
              <>
                <Printer size={17} /> Imprimir / Salvar em PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE CONTAINER: 5 EXCLUSIVE A4 PAGES                                */}
      {/* ========================================================================= */}
      <div ref={printRef} className="space-y-8 print:space-y-0 report-a4-wrapper">

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 1: IDENTIFICAÇÃO, METADADOS & TAXA DE ADESÃO                         */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-8 sm:p-9 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-6">
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="flex justify-between items-center gap-4 mb-3">
                <div className="flex items-center gap-2 text-[#2D6A4F] font-bold text-sm uppercase tracking-wider">
                  <ShieldCheck size={22} />
                  <span>{profile.consultancyName}</span>
                </div>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-300">
                  DOCUMENTO TÉCNICO REGULATÓRIO
                </span>
              </div>

              <h1 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-normal leading-snug">
                ANÁLISE DOS RESULTADOS DO QUESTIONÁRIO DE AVALIAÇÃO DE RISCOS PSICOSSOCIAIS, DE ACORDO COM A NR-1
              </h1>
              <p className="text-[11px] font-medium text-slate-500 mt-1.5 uppercase tracking-wide">
                Referência Técnica: NR-1 e Portaria MTE nº 1.419/2024 • Instrumento Técnico HSE-IT
              </p>
            </div>

            {/* Corporate Metadata Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Razão Social</span>
                <p className="font-bold text-slate-900 text-xs truncate">{analytics.corporateName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Nome Fantasia</span>
                <p className="font-bold text-slate-900 text-xs truncate">{analytics.companyName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">CNPJ</span>
                <p className="font-mono text-slate-900 font-bold text-xs">{analytics.cnpj}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Atividade Principal</span>
                <p className="font-medium text-slate-800 text-xs truncate">{analytics.economicActivity}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">CNAE & Grau de Risco</span>
                <p className="font-medium text-slate-800 text-xs">{analytics.cnae} | <span className="font-bold text-slate-900">Grau {analytics.riskDegree}</span></p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Unidade & Quadro</span>
                <p className="font-bold text-slate-900 text-xs">{analytics.unit} | {analytics.totalEmployees} Colab.</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Elaboração Técnica</span>
                <p className="font-bold text-slate-900 text-xs truncate">{profile.name} ({profile.councilRegister})</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Período de Aplicação</span>
                <p className="font-medium text-slate-800 text-xs">{analytics.applicationPeriod}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[9px] block">Ano de Referência</span>
                <p className="font-bold text-slate-900 text-xs">{analytics.referenceYear}</p>
              </div>
            </div>

            {/* Section 1: Instrumento Técnico */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Layers className="text-[#2D6A4F]" size={18} />
                <h2 className="text-base font-black text-slate-900">1. INSTRUMENTO TÉCNICO</h2>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2">
                <p className="font-bold text-slate-900">
                  HSE-IT – Health and Safety Executive – Indicator Tool
                </p>
                <p>
                  O HSE-IT (Health and Safety Executive – Indicator Tool) é um instrumento validado no Brasil, desenvolvido pelo Health and Safety Executive (Reino Unido), destinado à avaliação dos riscos psicossociais e do estresse ocupacional por meio de questionário quantitativo.
                </p>
                <p>
                  A aplicação do instrumento foi realizada de forma presencial, durante os meses de junho e julho de 2026, como parte do processo de monitoramento dos riscos psicossociais ocupacionais e de integração das informações ao Gerenciamento de Riscos Ocupacionais (GRO), conforme as diretrizes da NR-1.
                </p>
              </div>
            </section>

            {/* Section 2: Número de Funcionários */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <UsersIcon className="text-[#2D6A4F]" size={18} />
                <h2 className="text-base font-black text-slate-900">2. NÚMERO DE FUNCIONÁRIOS</h2>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Total na Empresa</span>
                  <span className="text-2xl font-black text-slate-900 mt-0.5 block">{analytics.totalEmployees}</span>
                  <span className="text-[10px] text-slate-500 truncate block">{analytics.unit}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 font-bold uppercase block">Participantes</span>
                  <span className="text-2xl font-black text-emerald-900 mt-0.5 block">{analytics.evaluatedEmployees}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">Adesão: {analytics.adherenceRate}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Não Participantes</span>
                  <span className="text-2xl font-black text-slate-700 mt-0.5 block">{analytics.unansweredEmployees}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">{analytics.unansweredRate}% (10%)</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <p>
                  A participação de <strong>{analytics.evaluatedEmployees} colaboradores</strong> representa uma adesão de <strong>{analytics.adherenceRate}%</strong> do quadro da unidade, proporcionando uma base ampla para a análise geral dos fatores psicossociais identificados.
                </p>
              </div>
            </section>
          </div>

          {/* Page 1 Footer */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 1 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 2: PARTICIPANTES POR SETOR & VISÃO GERAL DE FAVORABILIDADE           */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-8 sm:p-9 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-4">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <span className="font-bold text-[#2D6A4F] uppercase tracking-wider">{profile.consultancyName}</span>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Section 3: Participantes por Setor / Área */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <BarChart2 className="text-[#2D6A4F]" size={18} />
                <h2 className="text-base font-bold text-slate-900 tracking-normal">3. PARTICIPANTES POR SETOR / ÁREA</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                {/* Table */}
                <div className="md:col-span-6 overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px]">
                      <tr>
                        <th className="p-2 border-b border-slate-200">Setor / Área</th>
                        <th className="p-2 border-b border-slate-200 text-center">Partic.</th>
                        <th className="p-2 border-b border-slate-200 text-center">% Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {analytics.departmentScores.map(dept => (
                        <tr key={dept.departmentId} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900 truncate max-w-[130px]">{dept.departmentName}</td>
                          <td className="p-2 text-center font-mono font-semibold">{dept.respondentsCount}</td>
                          <td className="p-2 text-center font-mono font-semibold">{dept.percentageOfTotal}%</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black">
                        <td className="p-2 text-slate-900 uppercase text-xs">TOTAL</td>
                        <td className="p-2 text-center font-mono text-xs">{analytics.evaluatedEmployees}</td>
                        <td className="p-2 text-center font-mono text-xs">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Chart 1: Participantes por Setor */}
                <div className="md:col-span-6 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 block mb-1">Gráfico 1: Participantes por Setor</span>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={participantsData} layout="vertical" margin={{ top: 0, right: 20, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E2E8F0" />
                        <XAxis type="number" tick={{ fontSize: 9 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fill: '#334155' }} />
                        <Tooltip 
                          formatter={(val: number) => [`${val} colab.`, 'Participantes']}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <Bar dataKey="participantes" fill="#2D6A4F" radius={[0, 3, 3, 0]}>
                          {participantsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isSmall ? '#F59E0B' : '#2D6A4F'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Observação Metodológica */}
              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 leading-snug">
                <strong>Observação metodológica:</strong> a Produção apresenta a amostra mais robusta, com 94 respondentes. Os demais setores possuem amostras inferiores a 12 participantes, portanto seus resultados devem ser interpretados como indicativos, e não como conclusões setoriais definitivas. No setor de Qualidade, por exemplo, cada resposta corresponde aproximadamente a 14% da amostra do setor.
              </div>
            </section>

            {/* Section 4: Índice de Favorabilidade por Dimensão e por Setor - Parte 1 */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <TrendingUp className="text-[#2D6A4F]" size={18} />
                <h2 className="text-base font-black text-slate-900">4. ÍNDICE DE FAVORABILIDADE POR DIMENSÃO E POR SETOR</h2>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  A escala utilizada varia de 0 a 100, sendo que quanto maior o índice, menor o nível de risco psicossocial identificado.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-0.5 font-medium text-[11px]">
                  <span className="text-slate-700 font-bold">Critérios de classificação:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    • <strong>Favorável – baixo risco:</strong> 67 ou mais
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    • <strong>Atenção – risco moderado:</strong> de 40 a 66
                  </span>
                  <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    • <strong>Crítico – risco alto:</strong> abaixo de 40
                  </span>
                </div>
              </div>

              {/* Charts Row: Radar + Sector Favorability */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Radar Chart */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 block mb-1">
                    Gráfico 2: Radar das 6 Dimensões HSE-IT (Empresa)
                  </span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="62%" data={radarData}>
                        <PolarGrid stroke="#CBD5E1" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: '#334155', fontSize: 8, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 7 }} />
                        <Tooltip formatter={(val: number) => [`${val} pts`, 'Favorabilidade']} />
                        <Radar name="Empresa" dataKey="favorabilidade" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.4} />
                        <Radar name="Corte (67+)" dataKey="corteFavoravel" stroke="#F59E0B" strokeDasharray="3 3" fill="transparent" />
                        <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '2px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sector Favorability Bars */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 block mb-1">
                    Gráfico 3: Favorabilidade Consolidada por Setor
                  </span>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorFavorabilityData} margin={{ top: 5, right: 10, left: -15, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" tick={{ fontSize: 8, fill: '#334155' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                        <Tooltip 
                          formatter={(val: number) => [`${val} pts`, 'Favorabilidade']}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                        />
                        <ReferenceLine y={67} stroke="#10B981" strokeDasharray="3 3" />
                        <Bar dataKey="favorabilidade" radius={[3, 3, 0, 0]}>
                          {sectorFavorabilityData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.favorabilidade >= 67 ? '#10B981' : entry.favorabilidade >= 40 ? '#F59E0B' : '#EF4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Page 2 Footer */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 2 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 3: MATRIZ DE DIMENSÕES & SÍNTESE DOS RESULTADOS                       */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-8 sm:p-9 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-4">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <span className="font-bold text-[#2D6A4F] uppercase tracking-wider">{profile.consultancyName}</span>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Matrix Table */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Layers className="text-[#2D6A4F]" size={18} />
                <h2 className="text-base font-bold text-slate-900 tracking-normal">
                  4. ÍNDICE DE FAVORABILIDADE POR DIMENSÃO E POR SETOR (MATRIZ ANALÍTICA)
                </h2>
              </div>
              
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[9px]">
                    <tr>
                      <th className="p-2.5">Dimensão HSE-IT</th>
                      <th className="p-2.5 text-center bg-slate-800">Empresa Geral</th>
                      {analytics.departmentScores.map(dept => (
                        <th key={dept.departmentId} className="p-2.5 text-center border-l border-slate-800">
                          {dept.departmentName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analytics.dimensionScores.map(dim => (
                      <tr key={dim.dimensionId} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900 text-xs">{dim.dimensionName}</td>
                        <td className="p-2.5 text-center bg-slate-50 font-bold">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] border ${getFavBadge(dim.favorabilityIndex).badge}`}>
                            {dim.favorabilityIndex}
                          </span>
                        </td>
                        {analytics.departmentScores.map(dept => {
                          const deptDim = dept.dimensionScores.find(d => d.dimensionId === dim.dimensionId);
                          const fav = deptDim ? deptDim.favorabilityIndex : 50;
                          const badge = getFavBadge(fav);
                          return (
                            <td key={dept.departmentId} className="p-2.5 text-center border-l border-slate-200">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge.badge}`}>
                                {fav}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Media Geral Row */}
                    <tr className="bg-slate-100 font-black">
                      <td className="p-2.5 text-slate-900 uppercase text-xs">Média Consolidada</td>
                      <td className="p-2.5 text-center bg-slate-200">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs border ${globalFav.badge}`}>
                          {analytics.overallFavorability}
                        </span>
                      </td>
                      {analytics.departmentScores.map(dept => {
                        const badge = getFavBadge(dept.favorabilityIndex);
                        return (
                          <td key={dept.departmentId} className="p-2.5 text-center border-l border-slate-300">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] border ${badge.badge}`}>
                              {dept.favorabilityIndex}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Síntese dos Resultados do Tópico 4 */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1.5">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Síntese dos resultados</h3>
              <p>
                No resultado geral da empresa, o único indicador classificado na faixa de Atenção é <strong>Autonomia e Controle (66,6)</strong>. Na <strong>Produção</strong>, além de Autonomia e Controle (59,7), observa-se também resultado em faixa de atenção para <strong>Segurança Psicológica e Ética (64,1)</strong>. As demais dimensões avaliadas permanecem na faixa Favorável.
              </p>
            </div>

            {/* Detalhamento Técnico das Dimensões */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1.5">
              <h3 className="font-bold text-slate-900 text-xs">Detalhamento dos Resultados por Dimensão (Geral Empresa):</h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>
                  <strong>Organização do Trabalho (83,7 — Favorável):</strong> Estrutura clara de demandas, prazos e rotinas de trabalho bem definidas.
                </li>
                <li>
                  <strong>Autonomia e Controle (66,6 — Atenção):</strong> Ponto de atenção prioritário, com demanda por maior flexibilidade no ritmo e participação nas decisões operacionais.
                </li>
                <li>
                  <strong>Liderança (75,5 — Favorável):</strong> Percepção positiva quanto à orientação e ao suporte prestado pelas chefias imediatas.
                </li>
                <li>
                  <strong>Relacionamento e Apoio Social (79,9 — Favorável):</strong> Alto índice de cooperação mútua, respeito e suporte entre pares.
                </li>
                <li>
                  <strong>Saúde Mental e Equilíbrio (75,4 — Favorável):</strong> Bom equilíbrio psicossocial geral e preservação do bem-estar dos colaboradores.
                </li>
                <li>
                  <strong>Segurança Psicológica e Ética (69,7 — Favorável):</strong> Clima geral ético, com recomendação de atenção pontual na área de Produção (64,1).
                </li>
              </ul>
            </div>
          </div>

          {/* Page 3 Footer */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 3 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 4: INDICADORES CRÍTICOS DE CONDUTA & ASSÉDIO SEXUAL                  */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-8 sm:p-9 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-4">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <span className="font-bold text-[#2D6A4F] uppercase tracking-wider">{profile.consultancyName}</span>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Section 5: Indicadores Críticos de Conduta */}
            <section className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <AlertOctagon className="text-[#2D6A4F]" size={18} />
                <h2 className="text-base font-bold text-slate-900 tracking-normal">5. INDICADORES CRÍTICOS DE CONDUTA</h2>
              </div>

              {/* 5.1 Segurança / Estabilidade do Emprego */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-xs">5.1 Segurança / Estabilidade do Emprego</h3>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] border ${getFavBadge(analytics.stabilityStats.overallFavorability || 0).badge}`}>
                    Empresa (geral): {analytics.stabilityStats.overallFavorability} — {getFavBadge(analytics.stabilityStats.overallFavorability || 0).label}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] pt-1">
                  {analytics.stabilityStats.departmentStats.map(d => (
                    <div key={d.departmentId} className="bg-white p-1.5 rounded border border-slate-200 text-center">
                      <span className="text-slate-500 text-[9px] block truncate font-medium">{d.departmentName}</span>
                      <span className="font-bold text-slate-900">{d.rate}</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-600 text-[11px] pt-0.5">
                  Os resultados indicam percepção favorável quanto à segurança e estabilidade do emprego em todos os setores avaliados.
                </p>
              </div>

              {/* 5.2 Assédio Moral */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="font-bold text-slate-900 text-xs">5.2 Assédio Moral</h3>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Critérios: &lt;10% Favorável | 10% a 25% Atenção | &gt;25% Crítico
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                  <div className="md:col-span-6 overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 font-bold uppercase text-[9px] text-slate-700">
                        <tr>
                          <th className="p-1.5 border-b border-slate-200">Setor</th>
                          <th className="p-1.5 border-b border-slate-200 text-center">Taxa</th>
                          <th className="p-1.5 border-b border-slate-200 text-center">Ocorrência</th>
                          <th className="p-1.5 border-b border-slate-200 text-center">Classificação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-100 font-bold">
                          <td className="p-1.5 text-slate-900">Empresa (geral)</td>
                          <td className="p-1.5 text-center font-mono">{analytics.moralHarassmentStats.overallRate}%</td>
                          <td className="p-1.5 text-center font-mono text-[11px]">43 de 144</td>
                          <td className="p-1.5 text-center">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getBullyingBadge(analytics.moralHarassmentStats.overallRate).badge}`}>
                              {getBullyingBadge(analytics.moralHarassmentStats.overallRate).label}
                            </span>
                          </td>
                        </tr>
                        {analytics.moralHarassmentStats.departmentStats.map(d => {
                          const badge = getBullyingBadge(d.rate);
                          return (
                            <tr key={d.departmentId} className="hover:bg-slate-50">
                              <td className="p-1.5 font-medium text-slate-800 truncate max-w-[110px]">{d.departmentName}</td>
                              <td className="p-1.5 text-center font-mono font-bold">{d.rate}%</td>
                              <td className="p-1.5 text-center font-mono text-[10px]">{d.affectedCount} de {d.totalDept}</td>
                              <td className="p-1.5 text-center">
                                <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${badge.badge}`}>
                                  {badge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:col-span-6 bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-700 block mb-1">Taxa de Assédio Moral por Setor (%)</span>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bullyingData} layout="vertical" margin={{ top: 0, right: 15, left: -5, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E2E8F0" />
                          <XAxis type="number" domain={[0, 60]} tick={{ fontSize: 8 }} unit="%" />
                          <YAxis dataKey="name" type="category" width={75} tick={{ fontSize: 8, fill: '#334155' }} />
                          <Tooltip formatter={(val: number) => [`${val}%`, 'Taxa']} />
                          <ReferenceLine x={10} stroke="#F59E0B" strokeDasharray="3 3" />
                          <Bar dataKey="taxa" radius={[0, 3, 3, 0]}>
                            {bullyingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.taxa > 25 ? '#EF4444' : entry.taxa >= 10 ? '#F59E0B' : '#10B981'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                  <p>
                    <strong>Distribuição geral:</strong> Nunca 101 / Raramente 15 / Às vezes 22 / Frequente 3 / Sempre 3.
                  </p>
                  <p className="italic text-slate-500">
                    O resultado geral constitui um ponto crítico de monitoramento, especialmente pela concentração de respostas positivas nas áreas de Produção, Manutenção e Qualidade. Nos setores com amostras pequenas, os dados devem ser interpretados com cautela, sem exposição ou identificação individual dos participantes.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6: Assédio Sexual */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-[#2D6A4F]" size={18} />
                  <h2 className="text-base font-bold text-slate-900 tracking-normal">6. ASSÉDIO SEXUAL</h2>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Critérios: &lt;3% Favorável | 3% a 10% Atenção | &gt;10% Crítico
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-6 overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-bold uppercase text-[9px] text-slate-700">
                      <tr>
                        <th className="p-1.5 border-b border-slate-200">Setor</th>
                        <th className="p-1.5 border-b border-slate-200 text-center">Taxa</th>
                        <th className="p-1.5 border-b border-slate-200 text-center">Ocorrência</th>
                        <th className="p-1.5 border-b border-slate-200 text-center">Classificação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-slate-100 font-bold">
                        <td className="p-1.5 text-slate-900">Empresa (geral)</td>
                        <td className="p-1.5 text-center font-mono">{analytics.sexualHarassmentStats.overallRate}%</td>
                        <td className="p-1.5 text-center font-mono text-[11px]">9 de 144</td>
                        <td className="p-1.5 text-center">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getSexualBadge(analytics.sexualHarassmentStats.overallRate).badge}`}>
                            {getSexualBadge(analytics.sexualHarassmentStats.overallRate).label}
                          </span>
                        </td>
                      </tr>
                      {analytics.sexualHarassmentStats.departmentStats.map(d => {
                        const badge = getSexualBadge(d.rate);
                        return (
                          <tr key={d.departmentId} className="hover:bg-slate-50">
                            <td className="p-1.5 font-medium text-slate-800 truncate max-w-[110px]">{d.departmentName}</td>
                            <td className="p-1.5 text-center font-mono font-bold">{d.rate}%</td>
                            <td className="p-1.5 text-center font-mono text-[10px]">{d.affectedCount} de {d.totalDept}</td>
                            <td className="p-1.5 text-center">
                              <span className={`text-[9px] font-bold px-1 py-0.2 rounded border ${badge.badge}`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:col-span-6 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 block mb-1">Taxa de Assédio Sexual por Setor (%)</span>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sexualData} layout="vertical" margin={{ top: 0, right: 15, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E2E8F0" />
                        <XAxis type="number" domain={[0, 25]} tick={{ fontSize: 8 }} unit="%" />
                        <YAxis dataKey="name" type="category" width={75} tick={{ fontSize: 8, fill: '#334155' }} />
                        <Tooltip formatter={(val: number) => [`${val}%`, 'Taxa']} />
                        <ReferenceLine x={3} stroke="#F59E0B" strokeDasharray="3 3" />
                        <Bar dataKey="taxa" radius={[0, 3, 3, 0]}>
                          {sexualData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.taxa > 10 ? '#EF4444' : entry.taxa >= 3 ? '#F59E0B' : '#10B981'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                <p>
                  <strong>Distribuição geral:</strong> Nunca 135 / Raramente 6 / Às vezes 1 / Frequente 2 / Sempre 0.
                </p>
                <p className="italic text-slate-500">
                  Os resultados indicam necessidade de atenção institucional ao tema, especialmente nos setores que apresentaram índices mais elevados, preservando rigorosamente o sigilo dos participantes.
                </p>
              </div>
            </section>
          </div>

          {/* Page 4 Footer */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 4 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 5: PERGUNTAS PIOR AVALIAÇÃO, SÍNTESE, CONSIDERAÇÕES & ASSINATURAS    */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-8 sm:p-9 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-3.5">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <span className="font-bold text-[#2D6A4F] uppercase tracking-wider">{profile.consultancyName}</span>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Section 7: Perguntas com Pior Avaliação */}
            <section className="space-y-1.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <HelpCircle className="text-[#2D6A4F]" size={16} />
                <h2 className="text-sm font-bold text-slate-900 tracking-normal">7. PERGUNTAS COM PIOR AVALIAÇÃO</h2>
              </div>

              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold uppercase text-[8.5px] text-slate-700">
                    <tr>
                      <th className="p-1.5 border-b border-slate-200">Item / Pergunta Avaliada</th>
                      <th className="p-1.5 border-b border-slate-200 text-center">Média Likert</th>
                      <th className="p-1.5 border-b border-slate-200 text-center">Favorabilidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analytics.worstQuestions.slice(0, 8).map(q => {
                      const badge = getFavBadge(q.favorabilityIndex);
                      return (
                        <tr key={q.questionId} className="hover:bg-slate-50">
                          <td className="p-1.5 font-medium text-slate-900 text-xs">
                            <span className="font-bold text-slate-600 mr-1">Q{q.questionId} —</span>
                            {q.text}
                          </td>
                          <td className="p-1.5 text-center font-mono font-bold text-slate-900 text-xs">{q.averageScore.toFixed(2)}</td>
                          <td className="p-1.5 text-center">
                            <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${badge.badge}`}>
                              {q.favorabilityIndex} pts
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-200">
                Os oito itens indicam pontos prioritários para intervenção preventiva, principalmente nos aspectos relacionados a feedback, reconhecimento, participação, autonomia, controle sobre o ritmo, segurança para manifestação e conhecimento dos canais institucionais.
              </p>
            </section>

            {/* Section 8: Síntese Técnica dos Resultados */}
            <section className="space-y-1.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <FileText className="text-[#2D6A4F]" size={16} />
                <h2 className="text-sm font-bold text-slate-900 tracking-normal">8. SÍNTESE TÉCNICA DOS RESULTADOS</h2>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed space-y-1.5">
                <p>
                  A avaliação realizada com <strong>144 colaboradores</strong>, correspondente a <strong>90% do quadro da unidade</strong>, demonstra um cenário geral predominantemente favorável nas dimensões avaliadas pelo instrumento HSE-IT.
                </p>
                <p>
                  Entretanto, os resultados evidenciam pontos específicos que requerem monitoramento e intervenção preventiva, especialmente relacionados à autonomia e controle, segurança psicológica, feedback, reconhecimento profissional, participação dos trabalhadores e canais de comunicação.
                </p>
                <p>
                  Destaca-se ainda a presença de indicadores de assédio moral e assédio sexual que demandam atenção institucional, com resultados mais elevados em determinados setores. Esses indicadores devem ser considerados como sinais de alerta para aprofundamento da análise organizacional e fortalecimento das medidas preventivas.
                </p>
                <p>
                  Na <strong>Produção</strong>, que representa a maior parcela da amostra, os resultados apontam maior necessidade de atenção para <strong>Autonomia e Controle</strong> e <strong>Segurança Psicológica e Ética</strong>.
                </p>
              </div>
            </section>

            {/* Section 9: Considerações Finais */}
            <section className="space-y-1.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <ShieldCheck className="text-[#2D6A4F]" size={16} />
                <h2 className="text-sm font-bold text-slate-900 tracking-normal">9. CONSIDERAÇÕES FINAIS</h2>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-slate-700 leading-relaxed space-y-1.5">
                <p>
                  Os resultados obtidos constituem importante instrumento para o direcionamento das ações de prevenção e melhoria contínua no ambiente de trabalho. De forma geral, a organização apresenta indicadores favoráveis em grande parte das dimensões avaliadas. Os principais pontos de atenção concentram-se em Autonomia e Controle, particularmente na Produção, e em aspectos relacionados à Segurança Psicológica, feedback, reconhecimento, participação, comunicação e prevenção de situações de assédio.
                </p>
                <p>
                  Recomenda-se que os resultados sejam incorporados ao processo de Gerenciamento de Riscos Ocupacionais, servindo como subsídio para a elaboração e o acompanhamento do <strong>Plano de Ação 2026</strong>, com definição de responsáveis, prazos e indicadores de acompanhamento.
                </p>
                <p>
                  As ações devem priorizar o fortalecimento das lideranças, a melhoria da comunicação interna, o reconhecimento profissional, a ampliação dos espaços de escuta e participação, a divulgação dos canais formais de relato e denúncia, a prevenção de situações de assédio e o acompanhamento periódico das condições psicossociais de trabalho. A integração desses resultados com os demais indicadores organizacionais, ocupacionais e de saúde permitirá o monitoramento contínuo dos fatores de risco psicossociais e a identificação precoce de situações que possam demandar intervenção preventiva.
                </p>
              </div>
            </section>

            {/* Signatures Block */}
            <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-1 flex flex-col items-center">
                <div className="w-48 h-8 border-b border-slate-900 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-slate-700 text-xs">Assinado digitalmente</span>
                </div>
                <p className="font-bold text-slate-900 text-xs">{profile.name}</p>
                <p className="text-slate-600 text-[10px] font-medium">{profile.councilRegister}</p>
                <p className="text-slate-400 text-[9px]">Responsável Técnico pelo Diagnóstico</p>
              </div>

              <div className="space-y-1 flex flex-col items-center">
                <div className="w-48 h-8 border-b border-slate-900 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-slate-700 text-xs">{company.rhContactName?.split(' ')[0] || 'Gestão de SST'}</span>
                </div>
                <p className="font-bold text-slate-900 text-xs">{company.rhContactName || 'Diretoria / Gestão de Gente'}</p>
                <p className="text-slate-600 text-[10px] font-medium">{company.tradeName}</p>
                <p className="text-slate-400 text-[9px]">Representante Legal da Empresa</p>
              </div>
            </div>
          </div>

          {/* Page 5 Footer */}
          <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>Laudo Regulatório NR-01 • Validade: 12 meses</span>
            <span className="font-bold text-slate-600">Página 5 de 5</span>
          </div>
        </div>

      </div>

      {/* Bottom Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <button 
          id="btn-back-bottom"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <ArrowLeft size={18} /> Voltar aos Relatórios
        </button>

        <button 
          id="btn-print-bottom"
          onClick={handleDirectPdfDownload}
          disabled={isGeneratingPdf}
          className="flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:shadow-md active:opacity-90 transition-all cursor-pointer disabled:opacity-50"
        >
          {isGeneratingPdf ? (
            <>
              <Loader2 size={17} className="animate-spin" /> {pdfProgress || 'Gerando PDF...'}
            </>
          ) : (
            <>
              <Printer size={17} /> Imprimir / Salvar Laudo em PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function UsersIcon(props: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={props.size || 24} 
      height={props.size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={props.className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
