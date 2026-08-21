import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, ShieldCheck, Crown, User, 
  Mail, Calendar, Lock, CheckCircle2, RefreshCw, 
  Sparkles, Shield, UserCheck, KeyRound, Building
} from 'lucide-react';
import { AuthUser, isSuperAdminEmail } from '../types';
import { authService } from '../services/authService';

interface TeamViewProps {
  currentUser: AuthUser | null;
}

export const TeamView: React.FC<TeamViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const data = await authService.fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Erro ao carregar lista de usuários da equipe:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole = 
        selectedRole === 'ALL' ||
        (selectedRole === 'super_admin' && isSuperAdminEmail(user.email)) ||
        (selectedRole !== 'super_admin' && !isSuperAdminEmail(user.email) && user.role === selectedRole);

      return matchSearch && matchRole;
    });
  }, [users, searchQuery, selectedRole]);

  // Estatísticas
  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter(u => isSuperAdminEmail(u.email)).length;
    const consultants = users.filter(u => u.role === 'consultant').length;
    const evaluators = users.filter(u => u.role === 'evaluator').length;
    const admins = users.filter(u => !isSuperAdminEmail(u.email) && u.role === 'admin').length;

    return { total, superAdmins, consultants, evaluators, admins };
  }, [users]);

  const getRoleBadge = (user: AuthUser) => {
    if (isSuperAdminEmail(user.email)) {
      return {
        label: 'Super Admin Master',
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: <Crown size={12} className="text-amber-600" />
      };
    }
    switch (user.role) {
      case 'admin':
        return {
          label: 'Administrador Geral',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <ShieldCheck size={12} className="text-emerald-600" />
        };
      case 'consultant':
        return {
          label: 'Consultor Especialista',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: <Sparkles size={12} className="text-blue-600" />
        };
      case 'evaluator':
        return {
          label: 'Avaliador de Campo',
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: <UserCheck size={12} className="text-teal-600" />
        };
      default:
        return {
          label: 'Usuário Padrão',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <User size={12} className="text-slate-500" />
        };
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return 'Cadastro Ativo';
    try {
      const date = new Date(iso);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return 'Ativo';
    }
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <Users size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Equipe & Usuários Cadastrados
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Diretório institucional de profissionais autorizados no sistema PsychoRisk NR-01.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadTeam}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
            title="Atualizar lista de usuários"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Read-Only Notice Banner */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-blue-900">
        <Shield size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Modo de Visualização da Equipe:</span> Esta página é de consulta pública para todos os membros autorizados da consultoria. A concessão de privilégios e criação de novos usuários é gerenciada centralmente no módulo de segurança e banco de dados Supabase.
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total da Equipe</span>
            <Users size={15} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Usuários ativos</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Super Admin</span>
            <Crown size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.superAdmins}</div>
          <div className="text-[10px] text-amber-600/80 mt-1">Acesso Irrestrito Master</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Administradores</span>
            <ShieldCheck size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.admins}</div>
          <div className="text-[10px] text-emerald-600/80 mt-1">Gestores Operacionais</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Consultores / Peritos</span>
            <Sparkles size={15} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">{stats.consultants + stats.evaluators}</div>
          <div className="text-[10px] text-blue-600/80 mt-1">Técnicos & Avaliadores</div>
        </div>
      </div>

      {/* Filter and View Mode Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuário por nome ou e-mail..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todas as Funções</option>
              <option value="super_admin">Super Admin Master</option>
              <option value="admin">Administrador</option>
              <option value="consultant">Consultor Especialista</option>
              <option value="evaluator">Avaliador de Campo</option>
            </select>
          </div>

        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Cartões
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Tabela
          </button>
        </div>

      </div>

      {/* Directory Content */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 space-y-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs">Carregando diretório de membros...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-16 text-center text-slate-500 space-y-2 bg-white rounded-2xl border border-slate-200">
          <Users size={32} className="text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Nenhum membro encontrado com os critérios de busca.</p>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const roleBadge = getRoleBadge(user);
            const isMe = currentUser?.email.toLowerCase() === user.email.toLowerCase();

            return (
              <div 
                key={user.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                {isMe && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    Você
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-3.5 mb-4">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30 shrink-0" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{user.name}</h3>
                      <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleBadge.bg}`}>
                        {roleBadge.icon}
                        <span>{roleBadge.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-slate-400" />
                        Membro desde:
                      </span>
                      <span className="font-medium text-slate-700">{formatDate(user.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Acesso Ativo
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {user.provider === 'google' ? 'Google OAuth' : 'Credencial Segura'}
                  </span>
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* Table Layout */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Membro</th>
                  <th className="py-3.5 px-4">Função / Perfil</th>
                  <th className="py-3.5 px-4">Autenticação</th>
                  <th className="py-3.5 px-4">Cadastro</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user);
                  const isMe = currentUser?.email.toLowerCase() === user.email.toLowerCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.name} 
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" 
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#2D6A4F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.name}</span>
                              {isMe && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${roleBadge.bg}`}>
                          {roleBadge.icon}
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {user.provider === 'google' ? 'Google Workspace' : 'E-mail / Senha'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={11} /> Ativo
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

    </div>
  );
};
