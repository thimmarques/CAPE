import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, ShieldCheck, Crown, User, 
  Mail, Calendar, Lock, Unlock, CheckCircle2, RefreshCw, 
  Sparkles, Shield, UserCheck, Trash2, Ban, UserPlus, 
  AlertTriangle, X, Check, Edit3, ShieldAlert, AlertCircle
} from 'lucide-react';
import { AuthUser, UserRole, SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../types';
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

  // Super Admin Action Modals & States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newUserData, setNewUserData] = useState<{ name: string; email: string; role: UserRole }>({
    name: '',
    email: '',
    role: 'admin',
  });

  const [deleteTargetUser, setDeleteTargetUser] = useState<AuthUser | null>(null);
  const [blockTargetUser, setBlockTargetUser] = useState<AuthUser | null>(null);
  const [roleTargetUser, setRoleTargetUser] = useState<AuthUser | null>(null);
  const [newRoleSelection, setNewRoleSelection] = useState<UserRole>('admin');

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isSuperAdmin = Boolean(currentUser?.isSuperAdmin || isSuperAdminEmail(currentUser?.email));

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const loadTeam = async () => {
    setIsLoading(true);
    try {
      const data = await authService.fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Erro ao carregar lista de usuários da equipe:', err);
      showNotification('error', 'Erro ao carregar lista de usuários.');
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
        (selectedRole === 'blocked' && user.isBlocked) ||
        (selectedRole === 'super_admin' && isSuperAdminEmail(user.email)) ||
        (selectedRole !== 'super_admin' && selectedRole !== 'blocked' && !isSuperAdminEmail(user.email) && user.role === selectedRole);

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
    const blocked = users.filter(u => u.isBlocked).length;

    return { total, superAdmins, consultants, evaluators, admins, blocked };
  }, [users]);

  // Handlers para ações de Super Admin
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      showNotification('error', 'Preencha todos os campos obrigatórios.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await authService.addUserManual(newUserData, currentUser);
      if (res.success && res.user) {
        showNotification('success', `Membro ${res.user.name} cadastrado com sucesso!`);
        setIsAddModalOpen(false);
        setNewUserData({ name: '', email: '', role: 'admin' });
        await loadTeam();
      } else {
        showNotification('error', res.error || 'Erro ao cadastrar usuário.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Erro ao cadastrar usuário.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetUser) return;
    setActionLoading(true);
    try {
      const res = await authService.deleteUser(deleteTargetUser.id, deleteTargetUser.email, currentUser);
      if (res.success) {
        showNotification('success', `Usuário ${deleteTargetUser.name} (${deleteTargetUser.email}) foi excluído com sucesso.`);
        setDeleteTargetUser(null);
        await loadTeam();
      } else {
        showNotification('error', res.error || 'Não foi possível excluir o usuário.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Erro ao excluir usuário.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBlockConfirm = async () => {
    if (!blockTargetUser) return;
    const targetBlockState = !blockTargetUser.isBlocked;
    setActionLoading(true);
    try {
      const res = await authService.toggleBlockUser(blockTargetUser.email, targetBlockState, currentUser);
      if (res.success) {
        showNotification(
          'success', 
          targetBlockState 
            ? `E-mail ${blockTargetUser.email} foi bloqueado. O acesso está suspenso.` 
            : `E-mail ${blockTargetUser.email} foi desbloqueado com sucesso.`
        );
        setBlockTargetUser(null);
        await loadTeam();
      } else {
        showNotification('error', res.error || 'Não foi possível alterar o status de bloqueio.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Erro ao atualizar bloqueio.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRoleConfirm = async () => {
    if (!roleTargetUser) return;
    setActionLoading(true);
    try {
      const res = await authService.updateUserRole(roleTargetUser.email, newRoleSelection, currentUser);
      if (res.success) {
        showNotification('success', `Função do usuário ${roleTargetUser.name} atualizada para ${newRoleSelection.toUpperCase()}.`);
        setRoleTargetUser(null);
        await loadTeam();
      } else {
        showNotification('error', res.error || 'Erro ao alterar função do usuário.');
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Erro ao alterar função.');
    } finally {
      setActionLoading(false);
    }
  };

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
      
      {/* Toast Notification */}
      {notification && (
        <div 
          id="team-notification-toast"
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-emerald-50 border-emerald-700'
              : 'bg-rose-900 text-rose-50 border-rose-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={20} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/10 rounded-lg ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <Users size={22} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Equipe & Gestão de Usuários
              </h1>
              {isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <Crown size={10} className="text-amber-600" />
                  Painel Master
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Diretório institucional de profissionais autorizados e controle de acessos PsychoRisk NR-01.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isSuperAdmin && (
            <button
              id="btn-add-team-member"
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <UserPlus size={15} />
              <span>Novo Membro</span>
            </button>
          )}

          <button
            id="btn-refresh-team-list"
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

      {/* Info / Super Admin Banner */}
      {isSuperAdmin ? (
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-amber-950 shadow-xs">
          <Crown size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Controles Master de Super Administrador:</span> Você tem permissão para cadastrar novos membros, alterar funções/cargos, <span className="font-semibold text-amber-900">bloquear o acesso de qualquer e-mail</span> e <span className="font-semibold text-rose-800">excluir contas</span> do diretório. Novos usuários que autenticarem via Google OAuth serão sincronizados automaticamente nesta lista.
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-blue-900">
          <Shield size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-bold">Diretório da Equipe:</span> Esta página exibe os membros autorizados da consultoria. A alteração de funções e concessão de privilégios é administrada pelo Super Administrador Master ({SUPER_ADMIN_EMAIL}).
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total da Equipe</span>
            <Users size={15} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-1">Usuários registrados</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Super Admin</span>
            <Crown size={15} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.superAdmins}</div>
          <div className="text-[10px] text-amber-600/80 mt-1">Acesso Master</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Administradores</span>
            <ShieldCheck size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.admins}</div>
          <div className="text-[10px] text-emerald-600/80 mt-1">Gestores de Laudos</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Técnicos & Peritos</span>
            <Sparkles size={15} className="text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600">{stats.consultants + stats.evaluators}</div>
          <div className="text-[10px] text-blue-600/80 mt-1">Consultores / Avaliadores</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Bloqueados</span>
            <Ban size={15} className="text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${stats.blocked > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {stats.blocked}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Acesso revogado</div>
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
              <option value="ALL">Todos os Usuários</option>
              <option value="super_admin">Super Admin Master</option>
              <option value="admin">Administradores</option>
              <option value="consultant">Consultores Especialistas</option>
              <option value="evaluator">Avaliadores de Campo</option>
              <option value="blocked">Somente Bloqueados</option>
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
          <p className="text-[11px] text-slate-400">Tente ajustar o termo de pesquisa ou limpar os filtros.</p>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const roleBadge = getRoleBadge(user);
            const isMe = currentUser?.email.toLowerCase() === user.email.toLowerCase();
            const isMaster = isSuperAdminEmail(user.email);
            const isBlocked = Boolean(user.isBlocked);

            return (
              <div 
                key={user.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between relative group ${
                  isBlocked 
                    ? 'border-rose-200 bg-rose-50/20' 
                    : 'border-slate-200 hover:shadow-md'
                }`}
              >
                {/* Badges de Topo */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {isBlocked && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full border border-rose-300 flex items-center gap-1">
                      <Ban size={10} /> Bloqueado
                    </span>
                  )}
                  {isMe && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                      Você
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3.5 mb-4">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className={`w-12 h-12 rounded-full object-cover border-2 shrink-0 ${
                          isBlocked ? 'border-rose-300 grayscale' : 'border-emerald-500/30'
                        }`} 
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 ${
                        isBlocked ? 'bg-slate-400' : 'bg-gradient-to-br from-[#1b4332] to-[#2d6a4f]'
                      }`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 pr-12">
                      <h3 className={`text-sm font-bold truncate ${isBlocked ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
                        {user.name}
                      </h3>
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
                        Cadastro:
                      </span>
                      <span className="font-medium text-slate-700">{formatDate(user.createdAt)}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Provedor:</span>
                      <span className="font-medium text-slate-700">
                        {user.provider === 'google' ? 'Google OAuth' : 'E-mail / Senha'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer do Card com Ações de Super Admin */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-[11px]">
                    {isBlocked ? (
                      <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                        <Ban size={12} />
                        Acesso Suspenso
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Acesso Liberado
                      </span>
                    )}
                    <span className="text-slate-400 font-mono text-[10px]">
                      {isMaster ? 'Protegido' : `ID: ${user.id.substring(0, 8)}`}
                    </span>
                  </div>

                  {/* Super Admin Control Buttons */}
                  {isSuperAdmin && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {isMaster ? (
                        <div className="w-full py-1 text-center bg-amber-50 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200">
                          Conta Master Protegida
                        </div>
                      ) : (
                        <>
                          <button
                            id={`btn-edit-role-${user.id}`}
                            onClick={() => {
                              setRoleTargetUser(user);
                              setNewRoleSelection(user.role);
                            }}
                            className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                            title="Alterar função/cargo"
                          >
                            <Edit3 size={12} />
                            <span>Função</span>
                          </button>

                          <button
                            id={`btn-toggle-block-${user.id}`}
                            onClick={() => setBlockTargetUser(user)}
                            className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                              isBlocked
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                            }`}
                            title={isBlocked ? "Desbloquear usuário" : "Bloquear acesso"}
                          >
                            {isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
                            <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                          </button>

                          <button
                            id={`btn-delete-user-${user.id}`}
                            onClick={() => setDeleteTargetUser(user)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                            title="Excluir usuário"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
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
                  <th className="py-3.5 px-4">Status</th>
                  {isSuperAdmin && <th className="py-3.5 px-4 text-right">Ações Master</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user);
                  const isMe = currentUser?.email.toLowerCase() === user.email.toLowerCase();
                  const isMaster = isSuperAdminEmail(user.email);
                  const isBlocked = Boolean(user.isBlocked);

                  return (
                    <tr 
                      key={user.id} 
                      className={`transition-colors ${isBlocked ? 'bg-rose-50/30' : 'hover:bg-slate-50/80'}`}
                    >
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img 
                              src={user.avatarUrl} 
                              alt={user.name} 
                              className={`w-8 h-8 rounded-full object-cover border shrink-0 ${
                                isBlocked ? 'border-rose-300 grayscale' : 'border-slate-200'
                              }`} 
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 ${
                              isBlocked ? 'bg-slate-400' : 'bg-[#2D6A4F]'
                            }`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className={`font-bold flex items-center gap-1.5 ${isBlocked ? 'text-slate-600 line-through' : 'text-slate-900'}`}>
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
                        {user.provider === 'google' ? 'Google OAuth' : 'E-mail / Senha'}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="py-3 px-4">
                        {isBlocked ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                            <Ban size={11} /> Bloqueado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 size={11} /> Ativo
                          </span>
                        )}
                      </td>

                      {/* Ações de Super Admin na Tabela */}
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-right">
                          {isMaster ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                              Master Protegido
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setRoleTargetUser(user);
                                  setNewRoleSelection(user.role);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                                title="Alterar função"
                              >
                                <Edit3 size={13} />
                              </button>

                              <button
                                onClick={() => setBlockTargetUser(user)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isBlocked
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                }`}
                                title={isBlocked ? "Desbloquear acesso" : "Bloquear e-mail"}
                              >
                                {isBlocked ? <Unlock size={13} /> : <Lock size={13} />}
                              </button>

                              <button
                                onClick={() => setDeleteTargetUser(user)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors"
                                title="Excluir usuário"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* ========================================================================= */}
      {/* MODAIS DE GESTÃO DO SUPER ADMIN */}
      {/* ========================================================================= */}

      {/* Modal 1: Adicionar Novo Membro */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <UserPlus size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Novo Membro da Equipe</h3>
                  <p className="text-[11px] text-slate-500">Cadastre um profissional no sistema</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="Ex: Dra. Juliana Fernandes"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  E-mail Corporativo / Google Workspace *
                </label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="nome@empresa.com.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  O usuário poderá acessar utilizando o botão "Entrar com Google" se o e-mail for do Gmail ou Workspace.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Função / Nível de Acesso *
                </label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="admin">Administrador Geral (Acesso total a empresas e laudos)</option>
                  <option value="consultant">Consultor Especialista (Análise técnica e emissão)</option>
                  <option value="evaluator">Avaliador de Campo (Coleta e acompanhamento)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Salvar Membro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmação de Exclusão de Usuário */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-700">
              <span className="p-2.5 bg-rose-100 rounded-xl text-rose-700">
                <AlertTriangle size={22} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir Usuário do Sistema</h3>
                <p className="text-[11px] text-slate-500">Esta ação é irreversível</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">{deleteTargetUser.name}</div>
              <div className="text-slate-500 font-mono">{deleteTargetUser.email}</div>
              <div className="text-[11px] text-slate-400">Função: {deleteTargetUser.role.toUpperCase()}</div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir este membro? O perfil será removido do banco de dados e do diretório institucional.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Confirmação de Bloqueio / Desbloqueio */}
      {blockTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <span className={`p-2.5 rounded-xl ${
                blockTargetUser.isBlocked 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {blockTargetUser.isBlocked ? <Unlock size={22} /> : <Lock size={22} />}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {blockTargetUser.isBlocked ? 'Desbloquear Acesso' : 'Bloquear E-mail de Usuário'}
                </h3>
                <p className="text-[11px] text-slate-500">Controle de acesso Super Admin</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-slate-900">{blockTargetUser.name}</div>
              <div className="text-slate-500 font-mono">{blockTargetUser.email}</div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {blockTargetUser.isBlocked ? (
                <span>
                  Ao desbloquear, o usuário <strong className="text-slate-900">{blockTargetUser.email}</strong> poderá efetuar login normalmente no sistema PsychoRisk NR-01.
                </span>
              ) : (
                <span>
                  Ao bloquear, o e-mail <strong className="text-slate-900">{blockTargetUser.email}</strong> terá sua sessão revogada imediatamente e não conseguirá mais efetuar login com Google ou senha até ser desbloqueado.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockTargetUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleBlockConfirm}
                disabled={actionLoading}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                  blockTargetUser.isBlocked
                    ? 'bg-emerald-700 hover:bg-emerald-800'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{blockTargetUser.isBlocked ? 'Confirmar Desbloqueio' : 'Confirmar Bloqueio'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Alterar Função do Usuário */}
      {roleTargetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-sky-50 text-sky-700 rounded-xl">
                  <Edit3 size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Alterar Função / Perfil</h3>
                  <p className="text-[11px] text-slate-500">{roleTargetUser.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setRoleTargetUser(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selecione o novo nível de acesso:
                </label>
                <select
                  value={newRoleSelection}
                  onChange={(e) => setNewRoleSelection(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                >
                  <option value="admin">Administrador Geral (Empresas, Laudos e Configurações)</option>
                  <option value="consultant">Consultor Especialista (Análise Técnica e Emissão)</option>
                  <option value="evaluator">Avaliador de Campo (Coleta e Avaliações)</option>
                </select>
              </div>

              <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 text-[11px] text-sky-900 leading-relaxed">
                A nova função entrará em vigor imediatamente para todas as ações executadas por <strong>{roleTargetUser.email}</strong>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRoleTargetUser(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateRoleConfirm}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Salvar Nova Função</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
