import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { AuthUser, UserRole, SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../types';
import { auditService } from './auditService';

const STORAGE_KEY_AUTH_USER = 'psychorisk_auth_user_v1';
const STORAGE_KEY_BLOCKED_EMAILS = 'psychorisk_blocked_emails_v1';
const STORAGE_KEY_TEAM_USERS = 'psychorisk_team_users_v2';
export const SUPER_ADMIN_DEFAULT_PASSWORD = '#Gth14g0m4rqu3sG';

// Lista inicial padrão caso não haja banco conectado ainda
const DEFAULT_FALLBACK_TEAM: AuthUser[] = [
  {
    id: 'usr-super-admin-master',
    email: SUPER_ADMIN_EMAIL,
    name: 'Thiago Marques (Super Admin)',
    role: 'super_admin',
    isSuperAdmin: true,
    provider: 'email',
    isBlocked: false,
    status: 'active',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'usr-consultant-1',
    email: 'marcelo.fontes@occupationalhealth.com.br',
    name: 'Dr. Marcelo Silveira Fontes',
    role: 'consultant',
    isSuperAdmin: false,
    provider: 'email',
    isBlocked: false,
    status: 'active',
    createdAt: '2025-01-15T10:30:00.000Z',
  },
  {
    id: 'usr-evaluator-1',
    email: 'carolina.mendes@ergosaude.com.br',
    name: 'Dra. Carolina Mendes',
    role: 'evaluator',
    isSuperAdmin: false,
    provider: 'email',
    isBlocked: false,
    status: 'active',
    createdAt: '2025-02-01T14:20:00.000Z',
  },
  {
    id: 'usr-admin-ops',
    email: 'operacoes@psychorisk.com.br',
    name: 'Coordenação de Operações SST',
    role: 'admin',
    isSuperAdmin: false,
    provider: 'email',
    isBlocked: false,
    status: 'active',
    createdAt: '2025-02-10T09:15:00.000Z',
  }
];

export const authService = {
  /**
   * Verifica se um e-mail está na lista de bloqueados
   */
  isEmailBlocked(email: string): boolean {
    if (!email || isSuperAdminEmail(email)) return false;
    try {
      const blockedRaw = localStorage.getItem(STORAGE_KEY_BLOCKED_EMAILS);
      if (blockedRaw) {
        const blockedList: string[] = JSON.parse(blockedRaw);
        return blockedList.some(e => e.toLowerCase().trim() === email.toLowerCase().trim());
      }
    } catch {
      // ignore
    }
    return false;
  },

  /**
   * Adiciona ou remove um e-mail da lista local de bloqueados
   */
  setLocalBlockedEmail(email: string, block: boolean): void {
    if (!email || isSuperAdminEmail(email)) return;
    try {
      const normalized = email.toLowerCase().trim();
      const currentList: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY_BLOCKED_EMAILS) || '[]');
      let updated: string[];
      if (block) {
        updated = Array.from(new Set([...currentList, normalized]));
      } else {
        updated = currentList.filter(e => e.toLowerCase() !== normalized);
      }
      localStorage.setItem(STORAGE_KEY_BLOCKED_EMAILS, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao atualizar lista de bloqueados local:', e);
    }
  },

  /**
   * Sincroniza o usuário logado com a tabela user_profiles do Supabase e o cache de equipe
   */
  async syncUserProfile(user: AuthUser): Promise<AuthUser | null> {
    if (!user || !user.email) return null;
    const email = user.email.toLowerCase().trim();
    const isSuper = isSuperAdminEmail(email);

    // 1. Checa se o e-mail está bloqueado
    if (!isSuper && this.isEmailBlocked(email)) {
      console.warn(`Tentativa de acesso de e-mail bloqueado: ${email}`);
      await this.logout();
      return null;
    }

    const client = getSupabaseClient();
    let effectiveRole: UserRole = isSuper ? 'super_admin' : (user.role || 'admin');
    let effectiveIsBlocked = false;

    if (client && isSupabaseConfigured()) {
      try {
        // Busca se o perfil já existe
        const { data: existing, error: selectErr } = await client
          .from('user_profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (!selectErr && existing) {
          // Se já existe e está marcado como bloqueado no banco
          if (existing.is_blocked && !isSuper) {
            this.setLocalBlockedEmail(email, true);
            await this.logout();
            return null;
          }

          effectiveRole = isSuper ? 'super_admin' : (existing.role || user.role || 'admin');
          effectiveIsBlocked = isSuper ? false : Boolean(existing.is_blocked);

          // Atualiza dados adicionais se necessário
          await client
            .from('user_profiles')
            .update({
              name: user.name || existing.name,
              avatar_url: user.avatarUrl || existing.avatar_url || null,
              provider: user.provider || existing.provider || 'email',
              updated_at: new Date().toISOString(),
            })
            .eq('email', email);
        } else {
          // Se é a primeira vez que esse usuário loga (ex: novo login Google ou cadastro)
          await client.from('user_profiles').insert({
            email,
            name: user.name || (isSuper ? 'Thiago Marques (Super Admin)' : email.split('@')[0]),
            role: effectiveRole,
            avatar_url: user.avatarUrl || null,
            is_blocked: false,
            provider: user.provider || 'email',
            created_at: user.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Erro ao sincronizar user_profiles no Supabase:', err);
      }
    }

    const updatedUser: AuthUser = {
      ...user,
      email,
      role: effectiveRole,
      isSuperAdmin: isSuper,
      isBlocked: effectiveIsBlocked,
      status: effectiveIsBlocked ? 'blocked' : 'active',
    };

    this.setLocalUser(updatedUser);
    this.saveUserToLocalTeam(updatedUser);

    return updatedUser;
  },

  /**
   * Salva/atualiza o usuário na lista local persistente de membros da equipe
   */
  saveUserToLocalTeam(user: AuthUser): void {
    try {
      const users = this.getLocalTeamUsers();
      const idx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...user };
      } else {
        users.unshift(user);
      }
      localStorage.setItem(STORAGE_KEY_TEAM_USERS, JSON.stringify(users));
    } catch (e) {
      console.error('Erro ao salvar usuário no diretório local:', e);
    }
  },

  /**
   * Obtém a lista local de membros da equipe
   */
  getLocalTeamUsers(): AuthUser[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_TEAM_USERS);
      if (data) {
        const parsed: AuthUser[] = JSON.parse(data);
        return parsed.map(u => ({
          ...u,
          isSuperAdmin: isSuperAdminEmail(u.email),
          isBlocked: !isSuperAdminEmail(u.email) && (u.isBlocked || this.isEmailBlocked(u.email)),
        }));
      }
    } catch {
      // ignore
    }
    return DEFAULT_FALLBACK_TEAM;
  },

  /**
   * Obtém o usuário atualmente autenticado (Supabase ou Local Storage)
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const client = getSupabaseClient();
    
    if (client) {
      try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) {
          console.warn('Erro ao obter sessão do Supabase:', error.message);
        } else if (session?.user) {
          const user = session.user;
          const email = user.email || '';
          const isSuper = isSuperAdminEmail(email);
          const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0] || 'Usuário';
          
          const rawAuthUser: AuthUser = {
            id: user.id,
            email,
            name,
            role: isSuper ? 'super_admin' : (user.user_metadata?.role || 'admin'),
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            isSuperAdmin: isSuper,
            provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
            createdAt: user.created_at,
          };
          
          return await this.syncUserProfile(rawAuthUser);
        }
      } catch (e) {
        console.error('Exceção ao verificar sessão Supabase:', e);
      }
    }

    // Fallback: verificar usuário salvo no LocalStorage
    const local = this.getLocalUser();
    if (local) {
      if (this.isEmailBlocked(local.email)) {
        this.removeLocalUser();
        return null;
      }
      return local;
    }

    return null;
  },

  /**
   * Login com E-mail e Senha
   */
  async loginWithEmail(emailInput: string, passwordInput: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();
    const isSuper = isSuperAdminEmail(email);

    // Verificação de bloqueio
    if (!isSuper && this.isEmailBlocked(email)) {
      return {
        success: false,
        error: 'Acesso negado: Este e-mail foi bloqueado pelo Super Administrador.',
      };
    }

    const client = getSupabaseClient();

    if (client) {
      try {
        // 1. Tenta login normal no Supabase Auth
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          const user = data.user;
          const authUser: AuthUser = {
            id: user.id,
            email: user.email || email,
            name: user.user_metadata?.full_name || user.user_metadata?.name || (isSuper ? 'Thiago Marques (Super Admin)' : email.split('@')[0]),
            role: isSuper ? 'super_admin' : (user.user_metadata?.role || 'admin'),
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            isSuperAdmin: isSuper,
            provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
            createdAt: user.created_at,
          };

          const syncedUser = await this.syncUserProfile(authUser);
          if (!syncedUser) {
            return { success: false, error: 'Acesso negado: Este usuário foi bloqueado pelo Super Administrador.' };
          }

          await auditService.logActivity({
            action: 'LOGIN',
            entityType: 'auth',
            entityId: syncedUser.id,
            entityName: syncedUser.email,
            user: syncedUser,
            details: { provider: 'email', method: 'password' }
          });

          return { success: true, user: syncedUser };
        }

        // 2. Se for o Super Admin com a senha master e ainda não existir no Supabase, tenta auto-cadastrar
        if (isSuper && password === SUPER_ADMIN_DEFAULT_PASSWORD) {
          const signUpRes = await client.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: 'Thiago Marques (Super Admin)',
                name: 'Thiago Marques',
                role: 'super_admin',
              },
            },
          });

          if (signUpRes.data.user) {
            const user = signUpRes.data.user;
            const authUser: AuthUser = {
              id: user.id,
              email: user.email || email,
              name: 'Thiago Marques (Super Admin)',
              role: 'super_admin',
              isSuperAdmin: true,
              provider: 'email',
            };
            const synced = await this.syncUserProfile(authUser);
            await auditService.logActivity({
              action: 'LOGIN',
              entityType: 'auth',
              entityId: authUser.id,
              entityName: authUser.email,
              user: authUser,
              details: { provider: 'email', method: 'master_super_admin' }
            });
            return { success: true, user: synced || authUser };
          }
        }

        if (error) {
          return { success: false, error: this.translateAuthError(error.message) };
        }
      } catch (e: any) {
        console.error('Erro no login Supabase:', e);
      }
    }

    // Validação de Fallback / Offline
    if (isSuper && password === SUPER_ADMIN_DEFAULT_PASSWORD) {
      const fallbackUser: AuthUser = {
        id: 'super-admin-thibasss',
        email: SUPER_ADMIN_EMAIL,
        name: 'Thiago Marques (Super Admin)',
        role: 'super_admin',
        isSuperAdmin: true,
        provider: 'email',
      };
      this.setLocalUser(fallbackUser);
      this.saveUserToLocalTeam(fallbackUser);
      await auditService.logActivity({
        action: 'LOGIN',
        entityType: 'auth',
        entityId: fallbackUser.id,
        entityName: fallbackUser.email,
        user: fallbackUser,
        details: { provider: 'email', method: 'local_master_super_admin' }
      });
      return { success: true, user: fallbackUser };
    }

    return { 
      success: false, 
      error: 'Credenciais inválidas. Verifique o e-mail e a senha informados.' 
    };
  },

  /**
   * Login com Google / Gmail (OAuth via Supabase)
   */
  async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    
    if (!client || !isSupabaseConfigured()) {
      return { 
        success: false, 
        error: 'Supabase não configurado. Por favor, conecte o Supabase para habilitar o login com Google.' 
      };
    }

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { success: false, error: this.translateAuthError(error.message) };
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao iniciar login com Google.' };
    }
  },

  /**
   * Encerra a sessão do usuário
   */
  async logout(): Promise<void> {
    const currentUser = this.getLocalUser();
    if (currentUser) {
      await auditService.logActivity({
        action: 'LOGOUT',
        entityType: 'auth',
        entityId: currentUser.id,
        entityName: currentUser.email,
        user: currentUser,
      });
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn('Erro ao deslogar no Supabase:', e);
      }
    }
    this.removeLocalUser();
  },

  /**
   * Monitoramento de mudança no estado de autenticação
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const client = getSupabaseClient();
    if (!client) return { unsubscribe: () => {} };

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const email = session.user.email || '';
        const isSuper = isSuperAdminEmail(email);
        const user: AuthUser = {
          id: session.user.id,
          email,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || (isSuper ? 'Thiago Marques' : email.split('@')[0]),
          role: isSuper ? 'super_admin' : (session.user.user_metadata?.role || 'admin'),
          avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
          isSuperAdmin: isSuper,
          provider: session.user.app_metadata?.provider === 'google' ? 'google' : 'email',
          createdAt: session.user.created_at,
        };

        const syncedUser = await this.syncUserProfile(user);
        if (!syncedUser) {
          callback(null);
        } else {
          callback(syncedUser);
        }
      } else {
        const local = this.getLocalUser();
        if (!local) {
          callback(null);
        }
      }
    });

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  },

  // Helpers de LocalStorage
  getLocalUser(): AuthUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (data) {
        const user = JSON.parse(data) as AuthUser;
        user.isSuperAdmin = isSuperAdminEmail(user.email);
        user.isBlocked = !user.isSuperAdmin && (user.isBlocked || this.isEmailBlocked(user.email));
        return user;
      }
    } catch (e) {
      console.error('Erro ao ler usuário do localStorage:', e);
    }
    return null;
  },

  /**
   * Busca todos os usuários cadastrados (do Supabase user_profiles e cache local sincronizado)
   */
  async fetchUsers(): Promise<AuthUser[]> {
    const client = getSupabaseClient();
    const localUsers = this.getLocalTeamUsers();

    if (client && isSupabaseConfigured()) {
      try {
        const { data, error } = await client
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const list: AuthUser[] = data.map((u: any) => {
            const isSuper = isSuperAdminEmail(u.email);
            const isBlocked = !isSuper && (Boolean(u.is_blocked) || this.isEmailBlocked(u.email));
            return {
              id: u.id || `usr-${u.email}`,
              email: u.email,
              name: u.name || (isSuper ? 'Thiago Marques (Super Admin)' : u.email.split('@')[0]),
              role: isSuper ? 'super_admin' : (u.role || 'admin'),
              avatarUrl: u.avatar_url || '',
              isSuperAdmin: isSuper,
              isBlocked,
              status: isBlocked ? 'blocked' : 'active',
              provider: u.provider || (u.avatar_url?.includes('google') ? 'google' : 'email'),
              createdAt: u.created_at,
            };
          });

          // Garantir que o super admin está presente
          if (!list.some(u => isSuperAdminEmail(u.email))) {
            list.unshift(DEFAULT_FALLBACK_TEAM[0]);
          }

          // Salvar cache sincronizado
          localStorage.setItem(STORAGE_KEY_TEAM_USERS, JSON.stringify(list));
          return list;
        }
      } catch (err) {
        console.error('Erro ao buscar lista de usuários no Supabase:', err);
      }
    }

    // Fallback: carregar lista do storage local
    const current = this.getLocalUser();
    let list = [...localUsers];

    if (current && !list.some(u => u.email.toLowerCase() === current.email.toLowerCase())) {
      list.unshift(current);
    }

    if (!list.some(u => isSuperAdminEmail(u.email))) {
      list.unshift(DEFAULT_FALLBACK_TEAM[0]);
    }

    return list;
  },

  /**
   * Super Admin: Exclui um usuário do sistema
   */
  async deleteUser(userId: string, email: string, caller?: AuthUser | null): Promise<{ success: boolean; error?: string }> {
    if (isSuperAdminEmail(email)) {
      return { success: false, error: 'O Super Administrador Master não pode ser excluído.' };
    }

    const client = getSupabaseClient();
    const normalizedEmail = email.toLowerCase().trim();

    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client
          .from('user_profiles')
          .delete()
          .or(`email.eq.${normalizedEmail},id.eq.${userId}`);

        if (error) {
          console.warn('Erro ao excluir usuário no Supabase:', error.message);
        }
      } catch (e: any) {
        console.error('Exceção ao excluir usuário no Supabase:', e);
      }
    }

    // Remove do cache local
    try {
      const users = this.getLocalTeamUsers().filter(u => u.email.toLowerCase() !== normalizedEmail && u.id !== userId);
      localStorage.setItem(STORAGE_KEY_TEAM_USERS, JSON.stringify(users));
    } catch {
      // ignore
    }

    // Registra auditoria
    await auditService.logActivity({
      action: 'DELETE_USER',
      entityType: 'user',
      entityId: userId,
      entityName: email,
      user: caller,
      details: { deletedEmail: email, deletedUserId: userId },
    });

    return { success: true };
  },

  /**
   * Super Admin: Bloqueia ou Desbloqueia o acesso de um e-mail ao sistema
   */
  async toggleBlockUser(email: string, block: boolean, caller?: AuthUser | null): Promise<{ success: boolean; error?: string }> {
    if (isSuperAdminEmail(email)) {
      return { success: false, error: 'O Super Administrador Master não pode ser bloqueado.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    this.setLocalBlockedEmail(normalizedEmail, block);

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client
          .from('user_profiles')
          .update({ is_blocked: block, updated_at: new Date().toISOString() })
          .eq('email', normalizedEmail);

        if (error) {
          console.warn('Erro ao atualizar bloqueio no Supabase:', error.message);
        }
      } catch (e) {
        console.error('Exceção ao bloquear usuário no Supabase:', e);
      }
    }

    // Atualiza cache local de usuários
    try {
      const users = this.getLocalTeamUsers().map(u => {
        if (u.email.toLowerCase() === normalizedEmail) {
          return {
            ...u,
            isBlocked: block,
            status: block ? ('blocked' as const) : ('active' as const),
          };
        }
        return u;
      });
      localStorage.setItem(STORAGE_KEY_TEAM_USERS, JSON.stringify(users));
    } catch {
      // ignore
    }

    // Registra auditoria
    await auditService.logActivity({
      action: block ? 'BLOCK_USER' : 'UNBLOCK_USER',
      entityType: 'user',
      entityName: normalizedEmail,
      user: caller,
      details: { email: normalizedEmail, blocked: block },
    });

    return { success: true };
  },

  /**
   * Super Admin: Atualiza o cargo/perfil de um usuário
   */
  async updateUserRole(email: string, newRole: UserRole, caller?: AuthUser | null): Promise<{ success: boolean; error?: string }> {
    if (isSuperAdminEmail(email) && newRole !== 'super_admin') {
      return { success: false, error: 'A função do Super Administrador Master é protegida e não pode ser alterada.' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client
          .from('user_profiles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('email', normalizedEmail);

        if (error) {
          console.warn('Erro ao atualizar role no Supabase:', error.message);
        }
      } catch (e) {
        console.error('Exceção ao atualizar role no Supabase:', e);
      }
    }

    // Atualiza cache local
    try {
      const users = this.getLocalTeamUsers().map(u => {
        if (u.email.toLowerCase() === normalizedEmail) {
          return { ...u, role: newRole };
        }
        return u;
      });
      localStorage.setItem(STORAGE_KEY_TEAM_USERS, JSON.stringify(users));
    } catch {
      // ignore
    }

    await auditService.logActivity({
      action: 'UPDATE_USER',
      entityType: 'user',
      entityName: normalizedEmail,
      user: caller,
      details: { email: normalizedEmail, newRole },
    });

    return { success: true };
  },

  /**
   * Super Admin: Cadastra manualmente um novo usuário na equipe
   */
  async addUserManual(
    data: { name: string; email: string; role: UserRole },
    caller?: AuthUser | null
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const email = data.email.toLowerCase().trim();
    if (!email || !data.name.trim()) {
      return { success: false, error: 'Preencha o nome e o e-mail do usuário.' };
    }

    const isSuper = isSuperAdminEmail(email);
    const role: UserRole = isSuper ? 'super_admin' : data.role;

    const newUser: AuthUser = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email,
      name: data.name.trim(),
      role,
      isSuperAdmin: isSuper,
      provider: 'email',
      isBlocked: false,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (client && isSupabaseConfigured()) {
      try {
        const { error } = await client.from('user_profiles').upsert({
          email,
          name: newUser.name,
          role: newUser.role,
          is_blocked: false,
          provider: 'email',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        if (error) {
          console.warn('Erro ao inserir usuário no Supabase:', error.message);
        }
      } catch (e: any) {
        console.error('Exceção ao inserir usuário no Supabase:', e);
      }
    }

    this.saveUserToLocalTeam(newUser);

    await auditService.logActivity({
      action: 'CREATE_USER',
      entityType: 'user',
      entityId: newUser.id,
      entityName: newUser.email,
      user: caller,
      details: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    return { success: true, user: newUser };
  },

  setLocalUser(user: AuthUser): void {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(user));
    } catch (e) {
      console.error('Erro ao gravar usuário no localStorage:', e);
    }
  },

  removeLocalUser(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    } catch (e) {
      console.error('Erro ao remover usuário do localStorage:', e);
    }
  },

  translateAuthError(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('email not confirmed')) {
      return 'E-mail ainda não confirmado. Verifique sua caixa de entrada no Gmail.';
    }
    if (msg.includes('user not found')) {
      return 'Usuário não encontrado.';
    }
    if (msg.includes('password is too short')) {
      return 'A senha deve conter no mínimo 6 caracteres.';
    }
    if (msg.includes('rate limit')) {
      return 'Muitas tentativas consecutivas. Aguarde alguns instantes.';
    }
    return message;
  },
};

