import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { AuditLogEntry, AuditAction, AuthUser } from '../types';
import { authService } from './authService';

const STORAGE_KEY_AUDIT_LOGS = 'psychorisk_audit_logs_v1';
const MAX_LOCAL_LOGS = 500;

export const getLocalAuditLogs = (): AuditLogEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Erro ao ler logs de auditoria do localStorage:', e);
  }
  return [];
};

export const setLocalAuditLogs = (logs: AuditLogEntry[]): void => {
  try {
    // Keep only the most recent MAX_LOCAL_LOGS entries
    const trimmed = logs.slice(0, MAX_LOCAL_LOGS);
    localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Erro ao salvar logs de auditoria no localStorage:', e);
  }
};

export interface LogActivityParams {
  action: AuditAction;
  entityType: 'company' | 'assessment' | 'report' | 'profile' | 'user' | 'storage' | 'auth' | 'system';
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
  user?: AuthUser | null;
}

export const auditService = {
  /**
   * Registra uma ação de auditoria no Supabase e no Local Storage
   */
  async logActivity(params: LogActivityParams): Promise<void> {
    try {
      const currentUser = params.user || authService.getLocalUser();
      
      const logEntry: AuditLogEntry = {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        userId: currentUser?.id,
        userEmail: currentUser?.email || 'anônimo / sistema',
        userName: currentUser?.name || 'Sistema',
        userRole: currentUser?.role,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        details: params.details,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        createdAt: new Date().toISOString(),
      };

      // 1. Salvar no cache local
      const currentLogs = getLocalAuditLogs();
      setLocalAuditLogs([logEntry, ...currentLogs]);

      // 2. Salvar no Supabase (se configurado)
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured()) {
        const { error } = await client.from('audit_logs').insert({
          id: logEntry.id,
          user_id: logEntry.userId || null,
          user_email: logEntry.userEmail,
          user_name: logEntry.userName || null,
          user_role: logEntry.userRole || null,
          action: logEntry.action,
          entity_type: logEntry.entityType,
          entity_id: logEntry.entityId || null,
          entity_name: logEntry.entityName || null,
          details: logEntry.details || {},
          user_agent: logEntry.userAgent || null,
          created_at: logEntry.createdAt,
        });

        if (error) {
          console.warn('Não foi possível gravar o log de auditoria no Supabase:', error.message);
        }
      }
    } catch (err) {
      console.error('Exceção ao registrar log de auditoria:', err);
    }
  },

  /**
   * Recupera a lista de logs de auditoria (para a futura aba de auditoria)
   */
  async fetchAuditLogs(options?: {
    limit?: number;
    action?: AuditAction;
    entityType?: string;
    userEmail?: string;
  }): Promise<AuditLogEntry[]> {
    const limit = options?.limit || 100;
    const client = getSupabaseClient();

    if (client && isSupabaseConfigured()) {
      try {
        let query = client
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (options?.action) {
          query = query.eq('action', options.action);
        }
        if (options?.entityType) {
          query = query.eq('entity_type', options.entityType);
        }
        if (options?.userEmail) {
          query = query.eq('user_email', options.userEmail);
        }

        const { data, error } = await query;

        if (!error && data) {
          return data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            userEmail: row.user_email,
            userName: row.user_name,
            userRole: row.user_role,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id,
            entityName: row.entity_name,
            details: row.details,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            createdAt: row.created_at,
          }));
        }
      } catch (e) {
        console.error('Erro ao buscar logs do Supabase:', e);
      }
    }

    // Fallback local
    const local = getLocalAuditLogs();
    let filtered = local;
    if (options?.action) {
      filtered = filtered.filter(l => l.action === options.action);
    }
    if (options?.entityType) {
      filtered = filtered.filter(l => l.entityType === options.entityType);
    }
    if (options?.userEmail) {
      filtered = filtered.filter(l => l.userEmail.toLowerCase().includes(options.userEmail!.toLowerCase()));
    }
    return filtered.slice(0, limit);
  }
};
