import React, { useRef, useEffect, useState } from 'react';
import { Company, AnalyticsReport, ProfessionalProfile, SavedTechnicalReport, StoredFileItem, StorageBucketName } from '../types';
import { 
  Printer, ArrowLeft, Building2, User, 
  Calendar, CheckCircle2, AlertTriangle, ShieldCheck, 
  FileText, Award, Layers, BarChart2, TrendingUp, AlertOctagon, HelpCircle,
  Download, Info, Loader2, Check, Image as ImageIcon, UploadCloud, Trash2, 
  RefreshCw, X, Search, CheckCircle, ExternalLink, Sparkles
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, 
  Cell, ReferenceLine, Legend
} from 'recharts';
import { dbService } from '../services/supabaseService';
import { auditService } from '../services/auditService';

interface ExecutiveReportViewProps {
  company: Company;
  analytics: AnalyticsReport;
  profile: ProfessionalProfile;
  autoPrint?: boolean;
  onBack: () => void;
  onUpdateProfile?: (updated: ProfessionalProfile) => void;
}

export function ExecutiveReportView({ company, analytics, profile, autoPrint, onBack, onUpdateProfile }: ExecutiveReportViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');

  // Logotipo configurado para o laudo (busca da galeria / perfil)
  const [reportLogoUrl, setReportLogoUrl] = useState<string>(() => profile.consultancyLogoUrl || '');
  
  // Modal da Galeria de Imagens
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<StoredFileItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'company-assets' | 'reports'>('all');
  const [gallerySearch, setGallerySearch] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Carrega arquivos da galeria
  const loadGalleryFiles = async () => {
    setIsLoadingGallery(true);
    try {
      const files = await dbService.listUploadedFiles();
      setGalleryFiles(files);
    } catch (err) {
      console.error('Erro ao carregar arquivos da galeria:', err);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleOpenGalleryModal = () => {
    setIsGalleryModalOpen(true);
    loadGalleryFiles();
  };

  const handleSelectLogoFromGallery = async (url: string) => {
    setReportLogoUrl(url);
    const updatedProfile: ProfessionalProfile = {
      ...profile,
      consultancyLogoUrl: url
    };
    try {
      await dbService.saveProfile(updatedProfile);
      onUpdateProfile?.(updatedProfile);
      setSaveSuccessMsg('Logotipo atualizado e salvo no laudo!');
      setTimeout(() => {
        setSaveSuccessMsg('');
        setIsGalleryModalOpen(false);
      }, 900);
    } catch (err) {
      console.error('Erro ao salvar logotipo no perfil:', err);
    }
  };

  const handleUploadNewLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const cleanFileName = `logo-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const res = await dbService.uploadImage('company-assets', file, cleanFileName);

      if (res.publicUrl) {
        setReportLogoUrl(res.publicUrl);
        const updatedProfile: ProfessionalProfile = {
          ...profile,
          consultancyLogoUrl: res.publicUrl
        };
        await dbService.saveProfile(updatedProfile);
        onUpdateProfile?.(updatedProfile);
        await loadGalleryFiles();
        setSaveSuccessMsg('Novo logotipo enviado e aplicado com sucesso!');
        setTimeout(() => {
          setSaveSuccessMsg('');
          setIsGalleryModalOpen(false);
        }, 1000);
      }
    } catch (err) {
      console.error('Erro ao fazer upload do logotipo:', err);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setReportLogoUrl('');
    const updatedProfile: ProfessionalProfile = {
      ...profile,
      consultancyLogoUrl: ''
    };
    try {
      await dbService.saveProfile(updatedProfile);
      onUpdateProfile?.(updatedProfile);
      setIsGalleryModalOpen(false);
    } catch (err) {
      console.error('Erro ao remover logotipo:', err);
    }
  };

  // Persiste o laudo gerado no banco de dados e registra log de emissão
  useEffect(() => {
    const persistReport = async () => {
      try {
        const reportRecord: SavedTechnicalReport = {
          id: `rep-${company.id}-${company.referenceYear || new Date().getFullYear()}`,
          companyId: company.id,
          companyName: company.tradeName || company.corporateName,
          title: `Laudo Técnico Pericial de Riscos Psicossociais - NR-01 (${company.tradeName || company.corporateName})`,
          referenceYear: company.referenceYear || String(new Date().getFullYear()),
          applicationPeriod: company.applicationPeriod || 'Exercício Corrente',
          issuedDate: new Date().toISOString().split('T')[0],
          authorId: profile.id,
          authorName: profile.name,
          authorCouncilRegister: profile.councilRegister,
          overallScore: analytics.overallScore,
          overallFavorability: analytics.overallFavorability,
          overallRiskLevel: analytics.overallRiskLevel,
          adherenceRate: analytics.adherenceRate,
          totalRespondents: analytics.evaluatedEmployees || analytics.totalEmployees || 0,
          status: 'published',
          analyticsData: analytics,
          notes: 'Laudo gerado e homologado de acordo com a NR-01, MTE e ISO 45003.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await dbService.saveReport(reportRecord);
      } catch (err) {
        console.error('Erro ao auto-persistir laudo técnico:', err);
      }
    };

    persistReport();
  }, [company.id, analytics.overallScore]);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        handleDirectPdfDownload();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const printViaHiddenIframe = async () => {
    await auditService.logActivity({
      action: 'EXPORT_REPORT_PDF',
      entityType: 'report',
      entityId: `rep-${company.id}`,
      entityName: `Impressão Direta - Laudo ${company.tradeName}`,
      details: { companyId: company.id, method: 'iframe_print' }
    });

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
          pixelRatio: 2.2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          fontEmbedCSS: '',
          width: 794,
          height: 1123,
          canvasWidth: 1747,
          canvasHeight: 2471,
          style: {
            margin: '0',
            padding: '24px 28px',
            width: '794px',
            minWidth: '794px',
            maxWidth: '794px',
            height: '1123px',
            minHeight: '1123px',
            boxSizing: 'border-box',
            border: 'none',
            borderRadius: '0',
            boxShadow: 'none',
            transform: 'none',
            position: 'static',
          }
        });

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Direct 1:1 A4 mapping (0, 0, 210mm, 297mm) with balanced symmetrical margins
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfPageWidth, pdfPageHeight, undefined, 'FAST');
      }

      setPdfProgress('Salvando arquivo...');
      pdf.save(`Laudo_Tecnico_NR01_${cleanCompanyName}.pdf`);

      await auditService.logActivity({
        action: 'EXPORT_REPORT_PDF',
        entityType: 'report',
        entityId: `rep-${company.id}`,
        entityName: `Download PDF - Laudo ${company.tradeName}`,
        details: { companyId: company.id, pages: pageElements.length }
      });
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

  const globalFav = getFavBadge(analytics.overallFavorability);

  // Dynamic calculations for Topics 8 & 9 based on real questionnaire data
  const totalEmployees = analytics.totalEmployees || company.employeeCount || 0;
  const evaluatedEmployees = analytics.evaluatedEmployees || company.respondedEmployeeCount || 0;
  const adherenceRate = analytics.adherenceRate || (totalEmployees > 0 ? Math.round((evaluatedEmployees / totalEmployees) * 100) : 100);
  const overallFavScore = analytics.overallFavorability || 0;

  // Sorted Dimensions (lowest favorability first)
  const sortedDimsAsc = [...analytics.dimensionScores].sort((a, b) => a.favorabilityIndex - b.favorabilityIndex);
  const attentionDims = sortedDimsAsc.filter(d => d.favorabilityIndex < 67);
  const lowestDimsText = attentionDims.length > 0
    ? attentionDims.map(d => `${d.dimensionName} (${d.favorabilityIndex} pts)`).join(', ')
    : sortedDimsAsc.slice(0, 2).map(d => `${d.dimensionName} (${d.favorabilityIndex} pts)`).join(' e ');

  // Sorted Departments by count (sample size) and by favorability
  const sortedDeptsByCount = [...analytics.departmentScores].sort((a, b) => b.respondentsCount - a.respondentsCount);
  const largestDept = sortedDeptsByCount[0];
  const sortedDeptsByFavAsc = [...analytics.departmentScores].sort((a, b) => a.favorabilityIndex - b.favorabilityIndex);
  const attentionDepts = sortedDeptsByFavAsc.filter(d => d.favorabilityIndex < 67);

  // Largest Dept lowest dimension
  const largestDeptLowestDims = largestDept?.dimensionScores 
    ? [...largestDept.dimensionScores].sort((a, b) => a.favorabilityIndex - b.favorabilityIndex).slice(0, 2)
    : [];

  // Harassment & Conduct analysis
  const moralRate = analytics.moralHarassmentStats?.overallRate || 0;
  const sexualRate = analytics.sexualHarassmentStats?.overallRate || 0;
  const moralAffected = analytics.moralHarassmentStats?.overallAffectedCount || 0;
  const sexualAffected = analytics.sexualHarassmentStats?.overallAffectedCount || 0;
  
  const moralHighestDept = analytics.moralHarassmentStats?.departmentStats?.find(d => d.rate > 3);
  const sexualHighestDept = analytics.sexualHarassmentStats?.departmentStats?.find(d => d.rate > 0);

  // Key lowest scoring question themes for textual synthesis
  const topCriticalThemes = analytics.worstQuestions.slice(0, 4).map(q => {
    const text = q.text.replace(/^[0-9]+\.\s*/, '');
    return text.length > 42 ? text.substring(0, 40) + '...' : text;
  });

  const referenceYear = analytics.referenceYear || company.referenceYear || new Date().getFullYear().toString();
  const companyDisplayName = company.tradeName || company.corporateName || 'organização';
  const unitText = analytics.unit || company.unit ? `da unidade ${analytics.unit || company.unit}` : 'da organização';

  // Topic 3: Dynamic Methodological Observation
  const getMethodologicalObservation = () => {
    if (!analytics.departmentScores || analytics.departmentScores.length === 0) {
      return `Os dados representam a totalidade dos ${evaluatedEmployees} colaboradores participantes da empresa.`;
    }
    const sorted = [...analytics.departmentScores].sort((a, b) => b.respondentsCount - a.respondentsCount);
    const largest = sorted[0];
    const smallDepts = sorted.filter(d => d.respondentsCount < 12);
    const smallest = sorted[sorted.length - 1];

    let obs = `O setor de ${largest.departmentName} apresenta a amostra mais representativa, com ${largest.respondentsCount} respondente${largest.respondentsCount !== 1 ? 's' : ''} (${largest.percentageOfTotal}% do total avaliado). `;

    if (smallDepts.length > 0) {
      const smallDeptNames = smallDepts.map(d => d.departmentName).join(', ');
      obs += `O(s) setor(es) com amostras inferiores a 12 participantes (${smallDeptNames}) devem ter seus resultados interpretados como indicativos, considerando a sensibilidade estatística da amostragem reduzida. `;
      if (smallest && smallest.respondentsCount > 0 && smallest.departmentId !== largest.departmentId) {
        const weightPerResp = Math.round(100 / smallest.respondentsCount);
        obs += `No setor de ${smallest.departmentName}, por exemplo, cada resposta individual corresponde a aproximadamente ${weightPerResp}% da amostra setorial.`;
      }
    } else {
      obs += `Todos os setores avaliados apresentaram amostragem consistente para a estratificação setorial.`;
    }
    return obs;
  };

  // Topic 4: Dynamic Synthesis Text
  const getTopic4Synthesis = () => {
    const attentionDimensions = analytics.dimensionScores.filter(d => d.favorabilityIndex < 67);
    const favorableDimensions = analytics.dimensionScores.filter(d => d.favorabilityIndex >= 67);
    const attentionDepartments = analytics.departmentScores.filter(d => d.favorabilityIndex < 67);

    let text = '';
    if (attentionDimensions.length === 0) {
      text += `No resultado geral da empresa, todas as 6 dimensões avaliadas encontram-se na faixa Favorável (baixo risco psicossocial), com destaque positivo para ${favorableDimensions[0]?.dimensionName || 'as rotinas gerais'} (${favorableDimensions[0]?.favorabilityIndex.toString().replace('.', ',') || '0'} pts). `;
    } else {
      const dimsList = attentionDimensions.map(d => `${d.dimensionName} (${d.favorabilityIndex.toString().replace('.', ',')})`).join(', ');
      text += `No resultado geral da empresa, ${attentionDimensions.length === 1 ? 'o único indicador classificado na faixa de Atenção é' : 'os indicadores classificados na faixa de Atenção são'} ${dimsList}. `;
    }

    if (attentionDepartments.length > 0) {
      const deptDetails = attentionDepartments.map(dept => {
        const deptAttDims = dept.dimensionScores?.filter(d => d.favorabilityIndex < 67) || [];
        if (deptAttDims.length > 0) {
          return `no setor de ${dept.departmentName}, observa-se atenção para ${deptAttDims.map(d => `${d.dimensionName} (${d.favorabilityIndex.toString().replace('.', ',')})`).join(' e ')}`;
        }
        return `o setor de ${dept.departmentName} registrou média de ${dept.favorabilityIndex.toString().replace('.', ',')} pts`;
      }).join('; ');
      text += `Na análise setorial, ${deptDetails}. `;
    } else {
      text += `Na análise setorial, todos os setores avaliados mantiveram índice consolidado na faixa Favorável. `;
    }

    if (attentionDimensions.length > 0) {
      text += `As demais dimensões avaliadas permanecem na faixa Favorável.`;
    }
    return text;
  };

  // Topic 4: Dynamic Dimension Technical Description
  const getDimensionTechnicalDesc = (dimId: string, fav: number) => {
    const isFav = fav >= 67;
    const isWarn = fav >= 40 && fav < 67;
    switch (dimId) {
      case 'dim-org':
        return isFav 
          ? 'Estrutura clara de demandas, prazos e rotinas de trabalho bem definidas.'
          : isWarn
          ? 'Sobrecarga de ritmo ou prazos exigem revisão ergonômica e organizacional das rotinas.'
          : 'Alto volume de demandas e pressão temporal crítica com risco de sobrecarga.';
      case 'dim-aut':
        return isFav
          ? 'Boa autonomia sobre o ritmo de trabalho e métodos de execução das tarefas.'
          : isWarn
          ? 'Ponto de atenção prioritário, com demanda por maior flexibilidade no ritmo e participação nas decisões operacionais.'
          : 'Baixo controle sobre as atividades e rigidez excessiva nos processos operacionais.';
      case 'dim-lid':
        return isFav
          ? 'Percepção positiva quanto à orientação, clareza e suporte prestado pelas chefias imediatas.'
          : isWarn
          ? 'Necessidade de estruturação de rotinas periódicas de feedback e alinhamento de liderança.'
          : 'Dificuldades no suporte da gestão imediata e lacunas de liderança ativa.';
      case 'dim-rel':
        return isFav
          ? 'Alto índice de cooperação mútua, respeito e suporte colaborativo entre pares.'
          : isWarn
          ? 'Oportunidade para fortalecer a integração entre equipes e o clima colaborativo.'
          : 'Conflitos interpessoais frequentes e baixo apoio entre colegas de trabalho.';
      case 'dim-sau':
        return isFav
          ? 'Bom equilíbrio psicossocial geral e preservação do bem-estar e saúde mental dos colaboradores.'
          : isWarn
          ? 'Sinais moderados de estresse e fadiga exigindo ações contínuas de promoção da saúde mental.'
          : 'Elevado nível de desgaste emocional e queixas de estresse e esgotamento ocupacional.';
      case 'dim-seg':
        return isFav
          ? 'Clima geral ético, com confiança institucional e canais de segurança psicológica ativos.'
          : isWarn
          ? 'Recomendação de atenção pontual aos canais confidenciais e clareza de diretrizes de conduta.'
          : 'Insegurança psicológica e necessidade imediata de reforço ético e acolhimento.';
      default:
        return isFav ? 'Índice dentro dos padrões favoráveis e seguros.' : 'Requer acompanhamento preventivo no Plano de Ação.';
    }
  };

  // Topic 7: Dynamic Observation
  const getWorstQuestionsObservation = () => {
    const worstCount = analytics.worstQuestions?.length || 0;
    if (worstCount === 0) {
      return 'Todos os itens avaliados registraram índices favoráveis na escala Likert.';
    }
    const lowestQuestions = analytics.worstQuestions.slice(0, 5);
    const dimsAffected = Array.from(new Set(lowestQuestions.map(q => q.dimensionName)));
    return `Os ${Math.min(5, worstCount)} itens com menor pontuação indicam os pontos prioritários para intervenção preventiva na empresa, concentrando-se principalmente nas dimensões de ${dimsAffected.join(', ')}.`;
  };

  // Filtragem dos arquivos da galeria
  const filteredGalleryFiles = galleryFiles.filter(file => {
    const matchesBucket = galleryFilter === 'all' || file.bucket === galleryFilter;
    const matchesSearch = !gallerySearch || file.name.toLowerCase().includes(gallerySearch.toLowerCase());
    return matchesBucket && matchesSearch;
  });

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

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          
          {/* Botão de Alterar Logo da Galeria */}
          <button
            id="btn-open-gallery-logo"
            onClick={handleOpenGalleryModal}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border border-slate-300 cursor-pointer"
            title="Selecionar ou alterar o logotipo que aparece no cabeçalho do laudo"
          >
            <ImageIcon size={16} className="text-[#2D6A4F]" />
            <span>{reportLogoUrl ? 'Alterar Logotipo' : 'Buscar Imagem da Galeria'}</span>
          </button>

          <button 
            id="btn-print-save-pdf"
            onClick={handleDirectPdfDownload}
            disabled={isGeneratingPdf}
            title="Salvar e baixar Laudo Técnico em PDF"
            className="flex items-center justify-center gap-2 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm hover:shadow-md active:opacity-90 transition-all cursor-pointer disabled:opacity-50"
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
        <div className="report-a4-page bg-white p-7 sm:p-8 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-4">
            
            {/* =================================================================== */}
            {/* NOVO CABEÇALHO DO LAUDO IDÊNTICO À IMAGEM DE REFERÊNCIA              */}
            {/* =================================================================== */}
            <div className="pt-1 pb-2">
              
              {/* Linha Superior: Logotipo à esquerda + Badge regulatório à direita */}
              <div className="flex justify-between items-center gap-4 mb-4">
                
                {/* Logotipo da Galeria / Perfil com atalho interativo */}
                <div 
                  onClick={handleOpenGalleryModal}
                  className="group relative cursor-pointer flex items-center"
                  title="Clique para selecionar outro logotipo da galeria"
                >
                  {reportLogoUrl ? (
                    <div className="relative">
                      <img 
                        src={reportLogoUrl} 
                        alt="Logotipo da Consultoria" 
                        crossOrigin="anonymous"
                        className="h-16 w-auto max-w-[210px] object-contain transition-transform group-hover:scale-105"
                      />
                      <span className="absolute -bottom-2 left-0 bg-[#2D6A4F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        Alterar logo
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[#2D6A4F] font-bold text-sm uppercase tracking-wider p-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#2D6A4F] transition-colors print:border-none">
                      <ShieldCheck size={28} className="text-[#2D6A4F]" />
                      <div className="text-left">
                        <span className="block text-xs font-black text-slate-800">{profile.consultancyName || 'CONSULTORIA SST'}</span>
                        <span className="block text-[9px] text-slate-400 print:hidden font-normal">Clique para escolher imagem</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Badge Regulatório com cantos arredondados (igual à imagem) */}
                <div className="bg-slate-100/90 text-slate-700 text-[11px] sm:text-xs font-bold px-4 py-1.5 rounded-full border border-slate-300 tracking-wider shadow-2xs whitespace-nowrap">
                  DOCUMENTO TÉCNICO REGULATÓRIO
                </div>
              </div>

              {/* Título Principal Centralizado em Caixa Alta */}
              <div className="text-center space-y-1.5 my-3">
                <h1 className="text-lg sm:text-[21px] md:text-[22px] font-black text-slate-900 tracking-normal uppercase leading-snug max-w-3xl mx-auto">
                  RELATÓRIO EVIDENCIADO — DIAGNÓSTICO E MONITORAMENTO DE RISCOS PSICOSSOCIAIS
                </h1>
                <p className="text-[10.5px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  REFERÊNCIA TÉCNICA: NR-1 E PORTARIA MTE Nº 1.419/2024 • INSTRUMENTO TÉCNICO HSE-IT
                </p>
              </div>

              {/* Linha Divisória Escura Transversal (igual à imagem) */}
              <hr className="border-t-2 border-slate-900 mt-3 mb-4" />
            </div>

            {/* Corporate Metadata Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">Razão Social</span>
                <p className="font-bold text-slate-900 text-xs truncate">{analytics.corporateName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">Nome Fantasia</span>
                <p className="font-bold text-slate-900 text-xs truncate">{analytics.companyName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">CNPJ</span>
                <p className="font-mono text-slate-900 font-bold text-xs">{analytics.cnpj}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">Atividade Principal</span>
                <p className="font-medium text-slate-800 text-xs truncate">{analytics.economicActivity}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">CNAE & Grau de Risco</span>
                <p className="font-medium text-slate-800 text-xs">{analytics.cnae} | <span className="font-bold text-slate-900">Grau {analytics.riskDegree}</span></p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">Unidade & Quadro</span>
                <p className="font-bold text-slate-900 text-xs">{analytics.unit} | {analytics.totalEmployees} Colab.</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">Elaboração Técnica</span>
                <p className="font-bold text-slate-900 text-xs truncate">{profile.name} ({profile.councilRegister})</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">Período de Aplicação</span>
                <p className="font-medium text-slate-800 text-xs">{analytics.applicationPeriod}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[8.5px] block">Ano de Referência</span>
                <p className="font-bold text-slate-900 text-xs">{analytics.referenceYear}</p>
              </div>
            </div>

            {/* Section 1: Instrumento Técnico */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <Layers className="text-[#2D6A4F]" size={17} />
                <h2 className="text-sm font-black text-slate-900">1. INSTRUMENTO TÉCNICO</h2>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1.5">
                <p className="font-bold text-slate-900">
                  HSE-IT – Health and Safety Executive – Indicator Tool
                </p>
                <p>
                  O HSE-IT (Health and Safety Executive – Indicator Tool) é um instrumento validado no Brasil, desenvolvido pelo Health and Safety Executive (Reino Unido), destinado à avaliação dos riscos psicossociais e do estresse ocupacional por meio de questionário quantitativo.
                </p>
                <p>
                  A aplicação do instrumento foi realizada de forma presencial e digital como parte do processo de monitoramento dos riscos psicossociais ocupacionais e de integração das informações ao Gerenciamento de Riscos Ocupacionais (GRO), conforme as diretrizes da NR-1.
                </p>
              </div>
            </section>

            {/* Section 2: Número de Funcionários */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <UsersIcon className="text-[#2D6A4F]" size={17} />
                <h2 className="text-sm font-black text-slate-900">2. NÚMERO DE FUNCIONÁRIOS</h2>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] text-slate-500 font-bold uppercase block">Total na Empresa</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">{analytics.totalEmployees}</span>
                  <span className="text-[9.5px] text-slate-500 truncate block">{analytics.unit}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-[9.5px] text-emerald-800 font-bold uppercase block">Participantes</span>
                  <span className="text-xl font-black text-emerald-900 mt-0.5 block">{analytics.evaluatedEmployees}</span>
                  <span className="text-[9.5px] text-emerald-700 font-semibold">Adesão: {analytics.adherenceRate}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] text-slate-500 font-bold uppercase block">Não Participantes</span>
                  <span className="text-xl font-black text-slate-700 mt-0.5 block">{analytics.unansweredEmployees}</span>
                  <span className="text-[9.5px] text-slate-500 font-semibold">{analytics.unansweredRate}%</span>
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <p>
                  A participação de <strong>{analytics.evaluatedEmployees} colaboradores</strong> representa uma adesão de <strong>{analytics.adherenceRate}%</strong> do quadro da unidade, proporcionando uma base sólida para a análise estatística dos fatores psicossociais identificados.
                </p>
              </div>
            </section>
          </div>

          {/* Page 1 Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 1 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 2: PARTICIPANTES POR SETOR & VISÃO GERAL DE FAVORABILIDADE           */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-7 sm:p-8 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-3.5">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                {reportLogoUrl && (
                  <img src={reportLogoUrl} alt="Logo" crossOrigin="anonymous" className="h-5 w-auto max-w-[80px] object-contain" />
                )}
                <span className="font-bold text-[#2D6A4F] uppercase tracking-wider text-[11px]">{profile.consultancyName}</span>
              </div>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Section 3: Participantes por Setor / Área */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <BarChart2 className="text-[#2D6A4F]" size={17} />
                <h2 className="text-sm font-bold text-slate-900 tracking-normal">3. PARTICIPANTES POR SETOR / ÁREA</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                {/* Table */}
                <div className="md:col-span-6 overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[8.5px]">
                      <tr>
                        <th className="p-1.5 border-b border-slate-200">Setor / Área</th>
                        <th className="p-1.5 border-b border-slate-200 text-center">Partic.</th>
                        <th className="p-1.5 border-b border-slate-200 text-center">% Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {analytics.departmentScores.map(dept => (
                        <tr key={dept.departmentId} className="hover:bg-slate-50">
                          <td className="p-1.5 font-bold text-slate-900 truncate max-w-[130px]">{dept.departmentName}</td>
                          <td className="p-1.5 text-center font-mono font-semibold">{dept.respondentsCount}</td>
                          <td className="p-1.5 text-center font-mono font-semibold">{dept.percentageOfTotal}%</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-black">
                        <td className="p-1.5 text-slate-900 uppercase text-xs">TOTAL</td>
                        <td className="p-1.5 text-center font-mono text-xs">{analytics.evaluatedEmployees}</td>
                        <td className="p-1.5 text-center font-mono text-xs">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Chart 1: Participantes por Setor */}
                <div className="md:col-span-6 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-700 block mb-1">Gráfico 1: Participantes por Setor</span>
                  <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={participantsData} layout="vertical" margin={{ top: 0, right: 20, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E2E8F0" />
                        <XAxis type="number" tick={{ fontSize: 8.5 }} />
                        <YAxis dataKey="name" type="category" width={75} tick={{ fontSize: 8.5, fill: '#334155' }} />
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
              <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-900 leading-snug">
                <strong>Observação metodológica:</strong> {getMethodologicalObservation()}
              </div>
            </section>

            {/* Section 4: Índice de Favorabilidade por Dimensão e por Setor - Parte 1 */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <TrendingUp className="text-[#2D6A4F]" size={17} />
                <h2 className="text-sm font-black text-slate-900">4. ÍNDICE DE FAVORABILIDADE POR DIMENSÃO E POR SETOR</h2>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>
                  A escala utilizada varia de 0 a 100, sendo que quanto maior o índice, menor o nível de risco psicossocial identificado.
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-0.5 font-medium text-[10.5px]">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                {/* Radar Chart */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-700 block mb-1">
                    Gráfico 2: Radar das 6 Dimensões HSE-IT (Empresa)
                  </span>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="60%" data={radarData}>
                        <PolarGrid stroke="#CBD5E1" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: '#334155', fontSize: 7.5, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 7 }} />
                        <Tooltip formatter={(val: number) => [`${val} pts`, 'Favorabilidade']} />
                        <Radar name="Empresa" dataKey="favorabilidade" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.4} />
                        <Radar name="Corte (67+)" dataKey="corteFavoravel" stroke="#F59E0B" strokeDasharray="3 3" fill="transparent" />
                        <Legend wrapperStyle={{ fontSize: '8.5px', paddingTop: '2px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sector Favorability Bars */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[9.5px] font-bold text-slate-700 block mb-1">
                    Gráfico 3: Favorabilidade Consolidada por Setor
                  </span>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectorFavorabilityData} margin={{ top: 5, right: 10, left: -15, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" tick={{ fontSize: 7.5, fill: '#334155' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 7.5 }} />
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
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 2 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 3: MATRIZ DE DIMENSÕES & SÍNTESE DOS RESULTADOS                       */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-7 sm:p-8 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-3.5">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                {reportLogoUrl && (
                  <img src={reportLogoUrl} alt="Logo" crossOrigin="anonymous" className="h-5 w-auto max-w-[80px] object-contain" />
                )}
                <span className="font-bold text-[#2D6A4F] uppercase tracking-wider text-[11px]">{profile.consultancyName}</span>
              </div>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Matrix Table */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <Layers className="text-[#2D6A4F]" size={17} />
                <h2 className="text-sm font-bold text-slate-900 tracking-normal">
                  4. ÍNDICE DE FAVORABILIDADE POR DIMENSÃO E POR SETOR (MATRIZ ANALÍTICA)
                </h2>
              </div>
              
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[8.5px]">
                    <tr>
                      <th className="p-2">Dimensão HSE-IT</th>
                      <th className="p-2 text-center bg-slate-800">Empresa Geral</th>
                      {analytics.departmentScores.map(dept => (
                        <th key={dept.departmentId} className="p-2 text-center border-l border-slate-800">
                          {dept.departmentName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analytics.dimensionScores.map(dim => (
                      <tr key={dim.dimensionId} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-900 text-xs">{dim.dimensionName}</td>
                        <td className="p-2 text-center bg-slate-50 font-bold">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10.5px] border ${getFavBadge(dim.favorabilityIndex).badge}`}>
                            {dim.favorabilityIndex}
                          </span>
                        </td>
                        {analytics.departmentScores.map(dept => {
                          const deptDim = dept.dimensionScores.find(d => d.dimensionId === dim.dimensionId);
                          const fav = deptDim ? deptDim.favorabilityIndex : 50;
                          const badge = getFavBadge(fav);
                          return (
                            <td key={dept.departmentId} className="p-2 text-center border-l border-slate-200">
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold border ${badge.badge}`}>
                                {fav}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Media Geral Row */}
                    <tr className="bg-slate-100 font-black">
                      <td className="p-2 text-slate-900 uppercase text-xs">Média Consolidada</td>
                      <td className="p-2 text-center bg-slate-200">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs border ${globalFav.badge}`}>
                          {analytics.overallFavorability}
                        </span>
                      </td>
                      {analytics.departmentScores.map(dept => {
                        const badge = getFavBadge(dept.favorabilityIndex);
                        return (
                          <td key={dept.departmentId} className="p-2 text-center border-l border-slate-300">
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] border ${badge.badge}`}>
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
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">Síntese dos resultados</h3>
              <p>
                {getTopic4Synthesis()}
              </p>
            </div>

            {/* Detalhamento Técnico das Dimensões */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-1">
              <h3 className="font-bold text-slate-900 text-xs">Detalhamento dos Resultados por Dimensão (Geral Empresa):</h3>
              <ul className="list-disc pl-4 space-y-0.5 text-xs">
                {analytics.dimensionScores.map(dim => {
                  const badge = getFavBadge(dim.favorabilityIndex);
                  return (
                    <li key={dim.dimensionId}>
                      <strong>{dim.dimensionName} ({dim.favorabilityIndex.toString().replace('.', ',')} — {badge.label}):</strong> {getDimensionTechnicalDesc(dim.dimensionId, dim.favorabilityIndex)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Page 3 Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 3 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 4: INDICADORES CRÍTICOS DE CONDUTA & ASSÉDIO SEXUAL                  */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-7 sm:p-8 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-3.5">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                {reportLogoUrl && (
                  <img src={reportLogoUrl} alt="Logo" crossOrigin="anonymous" className="h-5 w-auto max-w-[80px] object-contain" />
                )}
                <span className="font-bold text-[#2D6A4F] uppercase tracking-wider text-[11px]">{profile.consultancyName}</span>
              </div>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Section 5: Indicadores Críticos de Conduta */}
            <section className="space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <AlertOctagon className="text-[#2D6A4F]" size={17} />
                <h2 className="text-sm font-bold text-slate-900 tracking-normal">5. INDICADORES CRÍTICOS DE CONDUTA</h2>
              </div>

              {/* 5.1 Segurança / Estabilidade do Emprego */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-xs">5.1 Segurança / Estabilidade do Emprego</h3>
                  <span className={`px-2 py-0.2 rounded font-bold uppercase text-[9.5px] border ${getFavBadge(analytics.stabilityStats.overallFavorability || 0).badge}`}>
                    Empresa (geral): {analytics.stabilityStats.overallFavorability} — {getFavBadge(analytics.stabilityStats.overallFavorability || 0).label}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10.5px] pt-0.5">
                  {analytics.stabilityStats.departmentStats.map(d => (
                    <div key={d.departmentId} className="bg-white p-1 rounded border border-slate-200 text-center">
                      <span className="text-slate-500 text-[8.5px] block truncate font-medium">{d.departmentName}</span>
                      <span className="font-bold text-slate-900">{d.rate}</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-600 text-[10.5px] pt-0.5">
                  {(analytics.stabilityStats.overallFavorability || 0) >= 67
                    ? `Os resultados indicam percepção favorável (${analytics.stabilityStats.overallFavorability} pts) quanto à segurança e estabilidade do emprego na organização, constituindo importante fator de proteção psicossocial.`
                    : `O índice de estabilidade no emprego (${analytics.stabilityStats.overallFavorability} pts) requer atenção e alinhamento de expectativas no plano de comunicação interna.`}
                </p>
              </div>

              {/* 5.2 Assédio Moral */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h3 className="font-bold text-slate-900 text-xs">5.2 Assédio Moral</h3>
                  <span className="text-[9.5px] text-slate-500 font-medium">
                    Critérios: &lt;10% Favorável | 10% a 25% Atenção | &gt;25% Crítico
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                  <div className="md:col-span-6 overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 font-bold uppercase text-[8.5px] text-slate-700">
                        <tr>
                          <th className="p-1 border-b border-slate-200">Setor</th>
                          <th className="p-1 border-b border-slate-200 text-center">Taxa</th>
                          <th className="p-1 border-b border-slate-200 text-center">Ocorrência</th>
                          <th className="p-1 border-b border-slate-200 text-center">Classificação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-100 font-bold">
                          <td className="p-1 text-slate-900">Empresa (geral)</td>
                          <td className="p-1 text-center font-mono">{analytics.moralHarassmentStats.overallRate}%</td>
                          <td className="p-1 text-center font-mono text-[10px]">{analytics.moralHarassmentStats.overallAffectedCount} de {analytics.evaluatedEmployees}</td>
                          <td className="p-1 text-center">
                            <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded border ${getBullyingBadge(analytics.moralHarassmentStats.overallRate).badge}`}>
                              {getBullyingBadge(analytics.moralHarassmentStats.overallRate).label}
                            </span>
                          </td>
                        </tr>
                        {analytics.moralHarassmentStats.departmentStats.map(d => {
                          const badge = getBullyingBadge(d.rate);
                          return (
                            <tr key={d.departmentId} className="hover:bg-slate-50">
                              <td className="p-1 font-medium text-slate-800 truncate max-w-[100px]">{d.departmentName}</td>
                              <td className="p-1 text-center font-mono font-bold">{d.rate}%</td>
                              <td className="p-1 text-center font-mono text-[9.5px]">{d.affectedCount} de {d.totalDept}</td>
                              <td className="p-1 text-center">
                                <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded border ${badge.badge}`}>
                                  {badge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:col-span-6 bg-white p-1.5 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-700 block mb-0.5">Taxa de Assédio Moral por Setor (%)</span>
                    <div className="h-28 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bullyingData} layout="vertical" margin={{ top: 0, right: 15, left: -5, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E2E8F0" />
                          <XAxis type="number" domain={[0, 60]} tick={{ fontSize: 7.5 }} unit="%" />
                          <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 7.5, fill: '#334155' }} />
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

                <div className="text-[10.5px] text-slate-600 space-y-0.5 pt-0.5 border-t border-slate-200">
                  <p>
                    <strong>Distribuição geral:</strong> Nunca {analytics.moralHarassmentStats.distribution?.nunca || 0} / Raramente {analytics.moralHarassmentStats.distribution?.raramente || 0} / Às vezes {analytics.moralHarassmentStats.distribution?.asVezes || 0} / Frequente {analytics.moralHarassmentStats.distribution?.frequente || 0} / Sempre {analytics.moralHarassmentStats.distribution?.sempre || 0}.
                  </p>
                  <p className="italic text-slate-500">
                    {analytics.moralHarassmentStats.overallRate > 25
                      ? `O resultado geral atingiu patamar crítico (${analytics.moralHarassmentStats.overallRate}%), constituindo ponto prioritário de intervenção com fortalecimento imediato dos canais confidenciais e ações preventivas no PGR.`
                      : analytics.moralHarassmentStats.overallRate >= 10
                      ? `O resultado geral situa-se na faixa de atenção (${analytics.moralHarassmentStats.overallRate}%), exigindo capacitação de liderança e diálogo preventivo. Nos setores com pequenas amostras, os dados devem ser interpretados com cautela.`
                      : `O resultado geral permanece em patamar favorável (${analytics.moralHarassmentStats.overallRate}%), recomendando-se a manutenção ativa de canais confidenciais de relato e ações educativas contínuas.`}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6: Assédio Sexual */}
            <section className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-[#2D6A4F]" size={17} />
                  <h2 className="text-sm font-bold text-slate-900 tracking-normal">6. ASSÉDIO SEXUAL</h2>
                </div>
                <span className="text-[9.5px] text-slate-500 font-medium">
                  Critérios: &lt;3% Favorável | 3% a 10% Atenção | &gt;10% Crítico
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
                <div className="md:col-span-6 overflow-hidden border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-bold uppercase text-[8.5px] text-slate-700">
                      <tr>
                        <th className="p-1 border-b border-slate-200">Setor</th>
                        <th className="p-1 border-b border-slate-200 text-center">Taxa</th>
                        <th className="p-1 border-b border-slate-200 text-center">Ocorrência</th>
                        <th className="p-1 border-b border-slate-200 text-center">Classificação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-slate-100 font-bold">
                        <td className="p-1 text-slate-900">Empresa (geral)</td>
                        <td className="p-1 text-center font-mono">{analytics.sexualHarassmentStats.overallRate}%</td>
                        <td className="p-1 text-center font-mono text-[10px]">{analytics.sexualHarassmentStats.overallAffectedCount} de {analytics.evaluatedEmployees}</td>
                        <td className="p-1 text-center">
                          <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded border ${getSexualBadge(analytics.sexualHarassmentStats.overallRate).badge}`}>
                            {getSexualBadge(analytics.sexualHarassmentStats.overallRate).label}
                          </span>
                        </td>
                      </tr>
                      {analytics.sexualHarassmentStats.departmentStats.map(d => {
                        const badge = getSexualBadge(d.rate);
                        return (
                          <tr key={d.departmentId} className="hover:bg-slate-50">
                            <td className="p-1 font-medium text-slate-800 truncate max-w-[100px]">{d.departmentName}</td>
                            <td className="p-1 text-center font-mono font-bold">{d.rate}%</td>
                            <td className="p-1 text-center font-mono text-[9.5px]">{d.affectedCount} de {d.totalDept}</td>
                            <td className="p-1 text-center">
                              <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded border ${badge.badge}`}>
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:col-span-6 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-700 block mb-0.5">Taxa de Assédio Sexual por Setor (%)</span>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sexualData} layout="vertical" margin={{ top: 0, right: 15, left: -5, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#E2E8F0" />
                        <XAxis type="number" domain={[0, 25]} tick={{ fontSize: 7.5 }} unit="%" />
                        <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 7.5, fill: '#334155' }} />
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

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-0.5">
                <p className="text-[10.5px]">
                  <strong>Distribuição geral:</strong> Nunca {analytics.sexualHarassmentStats.distribution?.nunca || 0} / Raramente {analytics.sexualHarassmentStats.distribution?.raramente || 0} / Às vezes {analytics.sexualHarassmentStats.distribution?.asVezes || 0} / Frequente {analytics.sexualHarassmentStats.distribution?.frequente || 0} / Sempre {analytics.sexualHarassmentStats.distribution?.sempre || 0}.
                </p>
                <p className="italic text-slate-500 text-[10.5px]">
                  {analytics.sexualHarassmentStats.overallRate > 10
                    ? `O índice geral (${analytics.sexualHarassmentStats.overallRate}%) exige intervenção prioritária e imediata no âmbito da CIPAA e conformidade com a Lei nº 14.457/2022.`
                    : analytics.sexualHarassmentStats.overallRate >= 3
                    ? `Os resultados registram taxa de ${analytics.sexualHarassmentStats.overallRate}%, demandando atenção institucional contínua e reforço dos treinamentos de prevenção ao assédio sexual.`
                    : `O indicador de condutas inadequadas ou assédio de natureza sexual manteve-se em patamar favorável (${analytics.sexualHarassmentStats.overallRate}%), reforçando a importância da manutenção das diretrizes éticas institucionais.`}
                </p>
              </div>
            </section>
          </div>

          {/* Page 4 Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>{analytics.companyName} • CNPJ: {analytics.cnpj}</span>
            <span className="font-bold text-slate-600">Página 4 de 5</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PAGE 5: PERGUNTAS PIOR AVALIAÇÃO, SÍNTESE & CONSIDERAÇÕES FINAIS          */}
        {/* (ASSINATURAS REMOVIDAS CONFORME SOLICITADO PARA ENCAIXAR PERFEITAMENTE)  */}
        {/* ------------------------------------------------------------------------- */}
        <div className="report-a4-page bg-white p-6 sm:p-7 rounded-xl border border-slate-200 shadow-md min-h-[1123px] flex flex-col justify-between text-slate-800 print:border-none print:shadow-none print:p-6 print:m-0 print:min-h-[297mm]">
          
          <div className="space-y-3.5">
            {/* Page Header Stamp */}
            <div className="border-b border-slate-300 pb-2 flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                {reportLogoUrl && (
                  <img src={reportLogoUrl} alt="Logo" crossOrigin="anonymous" className="h-5 w-auto max-w-[80px] object-contain" />
                )}
                <span className="font-bold text-[#2D6A4F] uppercase tracking-wider text-[11px]">{profile.consultancyName}</span>
              </div>
              <span className="text-slate-500 text-[11px]">Laudo Técnico NR-01 • {analytics.companyName}</span>
            </div>

            {/* Section 7: Perguntas com Pior Avaliação */}
            <section className="space-y-1">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-0.5">
                <HelpCircle className="text-[#2D6A4F]" size={15} />
                <h2 className="text-xs font-bold text-slate-900 tracking-normal">7. PERGUNTAS COM PIOR AVALIAÇÃO</h2>
              </div>

              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold uppercase text-[8px] text-slate-700">
                    <tr>
                      <th className="px-2 py-1 border-b border-slate-200">Item / Pergunta Avaliada</th>
                      <th className="px-2 py-1 border-b border-slate-200 text-center">Média Likert</th>
                      <th className="px-2 py-1 border-b border-slate-200 text-center">Favorabilidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analytics.worstQuestions.slice(0, 5).map(q => {
                      const badge = getFavBadge(q.favorabilityIndex);
                      return (
                        <tr key={q.questionId} className="hover:bg-slate-50">
                          <td className="px-2 py-1 font-medium text-slate-900 text-[11px]">
                            <span className="font-bold text-slate-600 mr-1">Q{q.questionId} —</span>
                            {q.text}
                          </td>
                          <td className="px-2 py-1 text-center font-mono font-bold text-slate-900 text-[11px]">{q.averageScore.toFixed(2)}</td>
                          <td className="px-2 py-1 text-center">
                            <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${badge.badge}`}>
                              {q.favorabilityIndex} pts
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-slate-600 italic bg-slate-50 px-2 py-1 rounded border border-slate-200">
                {getWorstQuestionsObservation()}
              </p>
            </section>

            {/* Section 8: Síntese Técnica dos Resultados */}
            <section className="space-y-1">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-0.5">
                <FileText className="text-[#2D6A4F]" size={15} />
                <h2 className="text-xs font-bold text-slate-900 tracking-normal">8. SÍNTESE TÉCNICA DOS RESULTADOS</h2>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-700 leading-relaxed space-y-1">
                <p>
                  A avaliação realizada com <strong>{evaluatedEmployees} colaboradores</strong> ({unitText}), correspondente a uma taxa de adesão de <strong>{adherenceRate}% do quadro efetivo</strong> ({totalEmployees} colaboradores no total), demonstra um cenário geral <strong>{overallFavScore >= 67 ? 'predominantemente favorável' : overallFavScore >= 40 ? 'em estado de atenção moderada' : 'em nível crítico de risco'}</strong> (índice global de <strong>{overallFavScore} pts</strong>) nas dimensões avaliadas pelo instrumento HSE-IT conforme a NR-1.
                </p>
                <p>
                  Os principais pontos que requerem monitoramento e intervenção preventiva concentram-se em <strong>{lowestDimsText}</strong>, refletindo temas prioritários levantados pelos respondentes{topCriticalThemes.length > 0 ? `, tais como: ${topCriticalThemes.join(', ')}` : ''}.
                </p>
                <p>
                  {moralRate > 0 || sexualRate > 0 ? (
                    <>
                      Destaca-se a presença de indicadores críticos de conduta: registrou-se taxa de relato de <strong>{moralRate.toFixed(1)}% para assédio moral</strong> ({moralAffected} participante{moralAffected !== 1 ? 's' : ''}) e <strong>{sexualRate.toFixed(1)}% para assédio sexual</strong> ({sexualAffected} participante{sexualAffected !== 1 ? 's' : ''})
                      {(moralHighestDept || sexualHighestDept) && (
                        <span>, com maior concentração no setor de <strong>{(moralHighestDept || sexualHighestDept)?.departmentName}</strong></span>
                      )}. Esses índices constituem sinais de alerta para fortalecimento contínuo dos canais confidenciais de acolhimento.
                    </>
                  ) : (
                    <>
                      Os indicadores críticos de conduta (assédio moral e assédio sexual) apresentaram taxas nulas (0%) ou estritamente dentro da faixa de baixo risco / favorável, recomendando-se a manutenção ativa dos canais confidenciais e das diretrizes éticas.
                    </>
                  )}
                </p>
                {largestDept && (
                  <p>
                    No setor de <strong>{largestDept.departmentName}</strong>, que representa a maior parcela da amostra avaliada ({largestDept.respondentsCount} colaboradores, {largestDept.percentageOfTotal?.toFixed(1) || Math.round((largestDept.respondentsCount / (evaluatedEmployees || 1)) * 100)}% do total), recomenda-se acompanhamento prioritário para <strong>{largestDeptLowestDims.length > 0 ? largestDeptLowestDims.map(d => d.dimensionName).join(' e ') : 'as rotinas operacionais e relações interpessoais'}</strong>.
                  </p>
                )}
              </div>
            </section>

            {/* Section 9: Considerações Finais */}
            <section className="space-y-1">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-0.5">
                <ShieldCheck className="text-[#2D6A4F]" size={15} />
                <h2 className="text-xs font-bold text-slate-900 tracking-normal">9. CONSIDERAÇÕES FINAIS & ENCAMINHAMENTO PGR</h2>
              </div>
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-[10.5px] text-slate-700 leading-relaxed space-y-1">
                <p>
                  Os resultados obtidos constituem subsídio técnico fundamental para o direcionamento das ações preventivas e de melhoria contínua na <strong>{companyDisplayName}</strong>. De modo geral, o diagnóstico aponta {overallFavScore >= 67 ? 'uma base organizacional sólida com indicadores favoráveis em grande parte das dimensões avaliadas' : 'oportunidades de melhoria estruturada no clima psicossocial'}, concentrando-se as prioridades de intervenção nas dimensões de <strong>{lowestDimsText}</strong>
                  {attentionDepts.length > 0 && (
                    <span>, com atenção dirigida especialmente ao(s) setor(es) de <strong>{attentionDepts.map(d => d.departmentName).join(', ')}</strong></span>
                  )}.
                </p>
                <p>
                  Recomenda-se formalmente que as conclusões deste diagnóstico sejam incorporadas ao Gerenciamento de Riscos Ocupacionais (GRO) e ao Programa de Gerenciamento de Riscos (PGR) da organização, servindo como base técnica para a consolidação e execução do <strong>Plano de Ação {referenceYear}</strong>, com metas estabelecidas, cronograma, gestores responsáveis e indicadores de eficácia.
                </p>
                <p>
                  As ações devem priorizar o fortalecimento das lideranças, o aprimoramento dos fluxos de feedback e comunicação interna, a promoção da segurança psicológica e autonomia funcional, a ampla divulgação dos canais de reporte e denúncia (alinhado à CIPA/CIPAA e à Portaria MTE nº 1.419/2024) e o monitoramento psicossocial contínuo em ciclos periódicos de até 12 meses.
                </p>
              </div>
            </section>
          </div>

          {/* Page 5 Footer */}
          <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
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

      {/* ========================================================================= */}
      {/* MODAL: GALERIA DE IMAGENS / LOGOTIPOS                                      */}
      {/* ========================================================================= */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#2D6A4F] flex items-center justify-center">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Galeria de Imagens do Laudo</h3>
                  <p className="text-xs text-slate-500">Selecione o logotipo da consultoria ou envie um novo arquivo</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGalleryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Success message banner */}
            {saveSuccessMsg && (
              <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-5 py-2.5 flex items-center gap-2 font-semibold animate-in slide-in-from-top-2">
                <CheckCircle size={15} />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Controls Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between bg-white">
              
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Buscar na galeria..."
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                />
              </div>

              {/* Upload Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleUploadNewLogo}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="flex items-center gap-1.5 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} /> Enviar Nova Imagem
                    </>
                  )}
                </button>

                <button
                  onClick={loadGalleryFiles}
                  disabled={isLoadingGallery}
                  title="Atualizar lista da nuvem"
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <RefreshCw size={14} className={isLoadingGallery ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
              
              {isLoadingGallery ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Loader2 size={24} className="animate-spin mx-auto text-[#2D6A4F]" />
                  <p className="text-xs font-medium">Buscando imagens da galeria...</p>
                </div>
              ) : filteredGalleryFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3 bg-white rounded-xl border border-dashed border-slate-200 p-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <ImageIcon size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">Nenhuma imagem encontrada</p>
                    <p className="text-[11px] text-slate-500">Faça o upload de uma imagem com o logotipo para utilizar no cabeçalho do laudo.</p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D6A4F] bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                  >
                    <UploadCloud size={14} /> Selecionar Arquivo do Computador
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {filteredGalleryFiles.map((file) => {
                    const isCurrent = reportLogoUrl === file.url;
                    return (
                      <div 
                        key={file.id}
                        onClick={() => handleSelectLogoFromGallery(file.url)}
                        className={`group relative bg-white rounded-xl border p-3 flex flex-col items-center justify-between gap-2 cursor-pointer transition-all hover:shadow-md ${
                          isCurrent 
                            ? 'border-[#2D6A4F] ring-2 ring-[#2D6A4F]/20 bg-emerald-50/30' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute top-2 right-2 bg-[#2D6A4F] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-xs">
                            <Check size={10} /> Ativo
                          </span>
                        )}
                        <div className="h-20 w-full flex items-center justify-center p-1 bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            crossOrigin="anonymous"
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="w-full text-center">
                          <p className="text-[11px] font-bold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <span className="text-[9.5px] text-slate-400">
                            {file.bucket}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={`w-full py-1 text-[11px] font-bold rounded transition-colors ${
                            isCurrent 
                              ? 'bg-[#2D6A4F] text-white' 
                              : 'bg-slate-100 text-slate-700 group-hover:bg-[#2D6A4F] group-hover:text-white'
                          }`}
                        >
                          {isCurrent ? 'Selecionado' : 'Usar no Laudo'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/70 text-xs">
              <div className="flex items-center gap-2">
                {reportLogoUrl && (
                  <button
                    onClick={handleRemoveLogo}
                    className="text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold hover:underline"
                  >
                    <Trash2 size={13} /> Remover Logotipo
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsGalleryModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

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
