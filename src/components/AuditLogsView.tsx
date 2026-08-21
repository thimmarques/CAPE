import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, Lock, Activity, Search, Filter, RefreshCw, 
  Calendar, User, FileText, Building2, UploadCloud, Database, 
  Download, AlertCircle, CheckCircle2, ChevronRight, Crown, 
  Clock, Terminal, ArrowUpRight, Eye, Sparkles, Layers,
  FileSpreadsheet, ShieldAlert
} from 'lucide-react';
import { AuditLogEntry, AuditAction, AuthUser, isSuperAdminEmail } from '../types';
import { auditService } from '../services/auditService';

interface AuditLogsViewProps {
  currentUser: AuthUser | null;
  onNavigateBack?: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ currentUser, onNavigateBack }) => {
  const isSuperAdmin = currentUser ? isSuperAdminEmail(currentUser.email) : false;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState<AuditLogEntry | null>(null);
  const [isCopiedJson, setIsCopiedJson] = useState<boolean>(false);

  // Carregar os logs de auditoria
  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.fetchAuditLogs({ limit: 300 });
      setLogs(data);
    } catch (err) {
      console.error('Erro ao carregar logs de auditoria:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadLogs();
    }
  }, [isSuperAdmin]);

  // Se o usuário não for Super Admin, bloqueia totalmente o acesso
  if (!isSuperAdmin) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[500px] bg-slate-50 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4 shadow-sm">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Restrito ao Super Admin Master</h2>
        <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
          A trilha de auditoria e os logs de conformidade de dados da NR-01 contêm informações 
          críticas de segurança e são restritos exclusivamente ao e-mail do Administrador Master (<span className="font-mono font-semibold text-slate-800">thibasss@gmail.com</span>).
        </p>
        {onNavigateBack && (
          <button
            onClick={onNavigateBack}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            Voltar ao Painel Geral
          </button>
        )}
      </div>
    );
  }

  // Filtragem dos logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.userName && log.userName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.entityName && log.entityName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase());

      const matchAction = selectedAction === 'ALL' || log.action === selectedAction;
      const matchEntity = selectedEntityType === 'ALL' || log.entityType === selectedEntityType;

      return matchSearch && matchAction && matchEntity;
    });
  }, [logs, searchQuery, selectedAction, selectedEntityType]);

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const total = logs.length;
    const logins = logs.filter(l => l.action === 'LOGIN').length;
    const reports = logs.filter(l => l.action === 'GENERATE_REPORT' || l.action === 'EXPORT_REPORT_PDF').length;
    const assessments = logs.filter(l => l.action === 'SUBMIT_ASSESSMENT').length;
    const storageUploads = logs.filter(l => l.action.startsWith('UPLOAD_')).length;

    return { total, logins, reports, assessments, storageUploads };
  }, [logs]);

  // Helper de cores e labels para as ações
  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'LOGIN':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Login Realizado' };
      case 'LOGOUT':
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Logout' };
      case 'CREATE_COMPANY':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Nova Empresa' };
      case 'UPDATE_COMPANY':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Edição Empresa' };
      case 'DELETE_COMPANY':
        return { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Exclusão Empresa' };
      case 'SUBMIT_ASSESSMENT':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Questionário Enviado' };
      case 'GENERATE_REPORT':
        return { bg: 'bg-violet-50 text-violet-700 border-violet-200', label: 'Laudo Gerado' };
      case 'EXPORT_REPORT_PDF':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Exportação PDF' };
      case 'UPLOAD_LOGO':
      case 'UPLOAD_AVATAR':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Upload Storage' };
      case 'UPDATE_PROFILE':
        return { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: 'Perfil Atualizado' };
      case 'CREATE_USER':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Novo Membro' };
      case 'UPDATE_USER':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', label: 'Função Alterada' };
      case 'DELETE_USER':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Membro Excluído' };
      case 'BLOCK_USER':
        return { bg: 'bg-red-100 text-red-800 border-red-300', label: 'E-mail Bloqueado' };
      case 'UNBLOCK_USER':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'E-mail Desbloqueado' };
      default:
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: action };
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch {
      return iso;
    }
  };

  // Exportar Logs em JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `auditoria_nr01_logs_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Exportar Logs em CSV
  const handleExportCsv = () => {
    const headers = ['ID', 'Data_Hora', 'Usuario_Email', 'Usuario_Nome', 'Acao', 'Tipo_Entidade', 'Nome_Entidade', 'User_Agent'];
    const rows = logs.map(l => [
      l.id,
      `"${formatTimestamp(l.createdAt)}"`,
      `"${l.userEmail || ''}"`,
      `"${l.userName || ''}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.entityName || ''}"`,
      `"${(l.userAgent || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_nr01_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const copyDetailsJson = () => {
    if (!selectedLogForDetail) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLogForDetail, null, 2));
    setIsCopiedJson(true);
    setTimeout(() => setIsCopiedJson(false), 2000);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <ShieldCheck size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Auditoria & Logs de Rastreabilidade</h1>
                <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  <Crown size={11} className="text-amber-600" />
                  Master
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Trilha imutável de eventos para conformidade com a NR-01, MTE e governança de dados da plataforma.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadLogs}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
            title="Recarregar logs"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            title="Exportar em formato CSV"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">Exportar</span> CSV
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            title="Exportar relatório completo em JSON"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span> JSON
          </button>
        </div>
      </div>

      {/* KPI Cards / Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total de Registros</span>
            <Activity size={15} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <Clock size={10} /> Histórico sincronizado
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Logins & Acessos</span>
            <User size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.logins}</div>
          <div className="text-[10px] text-emerald-600/80 mt-1">Autenticações registradas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Laudos & PDFs</span>
            <FileText size={15} className="text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{stats.reports}</div>
          <div className="text-[10px] text-purple-600/80 mt-1">Emissões e homologações</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Questionários</span>
            <Layers size={15} className="text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-600">{stats.assessments}</div>
          <div className="text-[10px] text-teal-600/80 mt-1">Respostas coletadas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Uploads Storage</span>
            <UploadCloud size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.storageUploads}</div>
          <div className="text-[10px] text-amber-600/80 mt-1">Logos, fotos e assinaturas</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por e-mail, nome, ação ou entidade..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Action Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todas as Ações</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="CREATE_COMPANY">Criar Empresa</option>
              <option value="UPDATE_COMPANY">Editar Empresa</option>
              <option value="DELETE_COMPANY">Excluir Empresa</option>
              <option value="SUBMIT_ASSESSMENT">Enviar Questionário</option>
              <option value="GENERATE_REPORT">Gerar Laudo</option>
              <option value="EXPORT_REPORT_PDF">Exportar PDF</option>
              <option value="UPLOAD_LOGO">Upload Logo</option>
              <option value="UPLOAD_AVATAR">Upload Avatar</option>
              <option value="UPLOAD_SIGNATURE">Upload Assinatura</option>
              <option value="UPDATE_PROFILE">Atualizar Perfil</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todas as Entidades</option>
              <option value="auth">Autenticação</option>
              <option value="company">Empresas</option>
              <option value="assessment">Questionários</option>
              <option value="report">Laudos / Relatórios</option>
              <option value="storage">Storage / Arquivos</option>
              <option value="profile">Perfil Especialista</option>
            </select>
          </div>

          {(searchQuery || selectedAction !== 'ALL' || selectedEntityType !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedAction('ALL');
                setSelectedEntityType('ALL');
              }}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
            >
              Limpar Filtros
            </button>
          )}

        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-emerald-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Trilha Cronológica de Atividades ({filteredLogs.length})
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Armazenamento em conformidade com a LGPD e NR-01
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs">Carregando trilha de auditoria...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <AlertCircle size={28} className="text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">Nenhum registro de auditoria encontrado com os filtros atuais.</p>
            <p className="text-[11px] text-slate-400">Tente buscar por outro termo ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Data & Hora</th>
                  <th className="py-3 px-4">Ação</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Entidade / Objeto</th>
                  <th className="py-3 px-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-slate-400" />
                          <span>{formatTimestamp(log.createdAt)}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* User */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="font-semibold text-slate-900 flex items-center gap-1">
                            <span>{log.userName || log.userEmail.split('@')[0]}</span>
                            {isSuperAdminEmail(log.userEmail) && (
                              <Crown size={11} className="text-amber-500" title="Super Admin Master" />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">{log.userEmail}</span>
                        </div>
                      </td>

                      {/* Entity / Target */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 truncate max-w-xs sm:max-w-md">
                            {log.entityName || log.entityId || '-'}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                            {log.entityType}
                          </span>
                        </div>
                      </td>

                      {/* View Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLogForDetail(log)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Inspecionar</span>
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Log Detail Modal */}
      {selectedLogForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Terminal size={18} className="text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">Inspeção de Evento de Auditoria</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {selectedLogForDetail.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Data / Hora (UTC)</span>
                  <div className="font-mono text-slate-800 font-semibold">{formatTimestamp(selectedLogForDetail.createdAt)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Ação Registrada</span>
                  <div className="font-semibold text-slate-900">{selectedLogForDetail.action}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">E-mail do Usuário</span>
                  <div className="font-mono text-slate-800">{selectedLogForDetail.userEmail}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Papel do Usuário</span>
                  <div className="font-semibold text-slate-800">{selectedLogForDetail.userRole || 'Admin'}</div>
                </div>
              </div>

              {selectedLogForDetail.userAgent && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">User-Agent / Navegador</span>
                  <p className="font-mono text-[11px] text-slate-600 break-all mt-0.5">{selectedLogForDetail.userAgent}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Carga Útil de Dados (Payload JSON)</span>
                  <button
                    onClick={copyDetailsJson}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold transition-colors flex items-center gap-1"
                  >
                    {isCopiedJson ? <CheckCircle2 size={12} /> : null}
                    {isCopiedJson ? 'Copiado!' : 'Copiar JSON'}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
                  {JSON.stringify(selectedLogForDetail, null, 2)}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
