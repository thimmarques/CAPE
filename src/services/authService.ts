import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { AuthUser, SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../types';

const STORAGE_KEY_AUTH_USER = 'psychorisk_auth_user_v1';
export const SUPER_ADMIN_DEFAULT_PASSWORD = '#Gth14g0m4rqu3sG';

export const authService = {
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
          
          const authUser: AuthUser = {
            id: user.id,
            email,
            name,
            role: isSuper ? 'super_admin' : (user.user_metadata?.role || 'admin'),
            avatarUrl: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
            isSuperAdmin: isSuper,
            provider: user.app_metadata?.provider === 'google' ? 'google' : 'email',
            createdAt: user.created_at,
          };
          
          this.setLocalUser(authUser);
          return authUser;
        }
      } catch (e) {
        console.error('Exceção ao verificar sessão Supabase:', e);
      }
    }

    // Fallback: verificar usuário salvo no LocalStorage
    return this.getLocalUser();
  },

  /**
   * Login com E-mail e Senha
   */
  async loginWithEmail(emailInput: string, passwordInput: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const email = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();
    const isSuper = isSuperAdminEmail(email);

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
            avatarUrl: user.user_metadata?.avatar_url || '',
            isSuperAdmin: isSuper,
            provider: 'email',
            createdAt: user.created_at,
          };

          this.setLocalUser(authUser);
          return { success: true, user: authUser };
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
            this.setLocalUser(authUser);
            return { success: true, user: authUser };
          }
        }

        if (error) {
          // Se for erro do Supabase (ex: Invalid login credentials)
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
        this.setLocalUser(user);
        callback(user);
      } else {
        // Only clear if we don't have a valid local super admin fallback
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
        return user;
      }
    } catch (e) {
      console.error('Erro ao ler usuário do localStorage:', e);
    }
    return null;
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
