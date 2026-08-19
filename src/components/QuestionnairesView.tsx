import React, { useState } from 'react';
import { DIMENSIONS, QUESTIONS } from '../data/questions';
import { Company, AssessmentSession, RespondentPrefill } from '../types';
import { 
  Search, Printer, BookOpen, Layers, Info, Play
} from 'lucide-react';

interface QuestionnairesViewProps {
  companies: Company[];
  sessions?: AssessmentSession[];
  onNavigate?: (view: 'dashboard' | 'companies' | 'questionnaires' | 'reports' | 'assessment', companyId?: string, prefill?: RespondentPrefill) => void;
}

export function QuestionnairesView({ companies, sessions = [], onNavigate }: QuestionnairesViewProps) {
  const [selectedDimension, setSelectedDimension] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuestions = QUESTIONS.filter(q => {
    const matchesDim = selectedDimension === 'all' || q.dimensionId === selectedDimension;
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.toString().includes(searchTerm);
    return matchesDim && matchesSearch;
  });

  const getDimensionName = (dimId: string) => {
    return DIMENSIONS.find(d => d.id === dimId)?.name || dimId;
  };

  const handlePrint = () => {
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

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Questionario_HSE_IT_NR01</title>
            ${headContent}
            <style>
              body { background: white !important; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              @page { size: A4 portrait; margin: 10mm; }
            </style>
          </head>
          <body>
            <div style="max-width: 900px; margin: 0 auto;">
              <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 4px;">Questionário de Riscos Psicossociais HSE-IT (NR-01)</h1>
              <p style="font-size: 12px; color: #555; margin-bottom: 20px;">Instrumento de Coleta - 38 Itens Psicométricos</p>
              ${document.querySelector('.divide-y')?.parentElement?.outerHTML || document.body.innerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      }, 350);
    } catch (e) {
      window.print();
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-500 overflow-hidden max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#2D6A4F] uppercase tracking-wider">
              Metodologia Oficial HSE-IT
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
              38 Itens Psicométricos
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">
            Questionário de Riscos Psicossociais HSE-IT
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Instrumento psicométrico validado para mapeamento de Riscos Psicossociais em conformidade com a NR-01 / Portaria MTE nº 1.419/2024.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 print:hidden">
          {onNavigate && (
            <button
              onClick={() => onNavigate('assessment')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Play size={14} fill="currentColor" /> Preencher em Branco
            </button>
          )}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-2xs transition-all"
          >
            <Printer size={15} /> Imprimir Folha (PDF)
          </button>
        </div>
      </div>

      {/* Methodological Context banner */}
      <div className="bg-gradient-to-r from-[#2D6A4F]/10 via-[#40916C]/10 to-transparent p-5 rounded-2xl border border-[#2D6A4F]/20 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Metodologia HSE Management Standards (HSE-IT)</h3>
            <p className="text-xs text-slate-600">Instrumento composto por 38 itens avaliados em escala de frequência de 4 pontos (sem neutralidade forçada), agrupados em 6 dimensões psicossociais fundamentais para o GRO/PGR.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-[#2D6A4F] bg-white px-3 py-1.5 rounded-lg border border-[#2D6A4F]/20 shadow-2xs">
            Padrão de Corte: 67 pts (Favorável)
          </span>
        </div>
      </div>

      {/* Dimension Overview Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        {DIMENSIONS.map((dim, idx) => {
          const isSelected = selectedDimension === dim.id;
          return (
            <button
              key={dim.id}
              onClick={() => setSelectedDimension(isSelected ? 'all' : dim.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected 
                  ? 'border-[#2D6A4F] bg-[#40916C]/10 text-[#2D6A4F] shadow-sm ring-1 ring-[#2D6A4F]' 
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-400">D{idx + 1}</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                  {dim.items.length} itens
                </span>
              </div>
              <h4 className="text-xs font-bold leading-tight line-clamp-2">{dim.name}</h4>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Filtrar por texto da questão ou número..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D6A4F] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Exibindo <strong>{filteredQuestions.length}</strong> de <strong>{QUESTIONS.length}</strong> itens</span>
          {selectedDimension !== 'all' && (
            <button 
              onClick={() => setSelectedDimension('all')}
              className="text-[#2D6A4F] font-bold hover:underline ml-2"
            >
              (Limpar filtro de dimensão)
            </button>
          )}
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2D6A4F]" />
            Itens do Questionário e Escala Likert de 4 Pontos
          </h3>
          <div className="hidden sm:flex items-center gap-4 text-[11px] font-bold text-slate-500">
            <span className="text-red-700">1: Discordo Fortemente</span>
            <span className="text-amber-700">2: Discordo</span>
            <span className="text-blue-700">3: Concordo</span>
            <span className="text-emerald-700">4: Concordo Fortemente</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 w-14 text-center">Nº</th>
                <th className="py-3 px-4">Enunciado da Questão</th>
                <th className="py-3 px-4 w-48">Dimensão Psicossocial</th>
                <th className="py-3 px-2 w-16 text-center text-red-700">1</th>
                <th className="py-3 px-2 w-16 text-center text-amber-700">2</th>
                <th className="py-3 px-2 w-16 text-center text-blue-700">3</th>
                <th className="py-3 px-2 w-16 text-center text-emerald-700">4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuestions.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                    #{q.id}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800 text-sm leading-relaxed">
                    {q.text}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 inline-block">
                      {getDimensionName(q.dimensionId)}
                    </span>
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <div className="w-7 h-7 mx-auto rounded-md border border-red-200 bg-red-50/50 flex items-center justify-center text-red-800 font-bold text-xs">
                      1
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <div className="w-7 h-7 mx-auto rounded-md border border-amber-200 bg-amber-50/50 flex items-center justify-center text-amber-800 font-bold text-xs">
                      2
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <div className="w-7 h-7 mx-auto rounded-md border border-blue-200 bg-blue-50/50 flex items-center justify-center text-blue-800 font-bold text-xs">
                      3
                    </div>
                  </td>
                  <td className="py-3.5 px-2 text-center">
                    <div className="w-7 h-7 mx-auto rounded-md border border-emerald-200 bg-emerald-50/50 flex items-center justify-center text-emerald-800 font-bold text-xs">
                      4
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology and Regulatory info note */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-3 shadow-2xs">
        <Info className="w-5 h-5 text-[#2D6A4F] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-800">Metodologia e Diretrizes Regulatórias (NR-01 / PGR):</p>
          <p>
            O instrumento avalia fatores de risco psicossocial ocupacional através de respostas em escala Likert de 4 pontos (sem ponto neutro forçado), garantindo assertividade diagnóstica. As pontuações refletem níveis de risco: <strong>1.00 a 1.99 = Alto Risco</strong>, <strong>2.00 a 2.99 = Risco Moderado</strong>, <strong>3.00 a 4.00 = Baixo Risco (Fator Protetivo)</strong>.
          </p>
        </div>
      </div>

    </div>
  );
}
