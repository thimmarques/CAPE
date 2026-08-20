import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'psychorisk_custom_supabase_url';
const STORAGE_KEY_KEY = 'psychorisk_custom_supabase_key';

export const getStoredSupabaseConfig = (): { url: string; anonKey: string; isCustom: boolean } => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let customUrl = '';
  let customKey = '';
  try {
    customUrl = (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
    customKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();
  } catch (e) {
    // ignore local storage errors
  }

  const url = customUrl || envUrl;
  const anonKey = customKey || envKey;

  return {
    url,
    anonKey,
    isCustom: Boolean(customUrl || customKey),
  };
};

export const saveCustomSupabaseConfig = (url: string, anonKey: string): void => {
  try {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    supabaseInstance = null; // Reset instance to recreate with new credentials
  } catch (e) {
    console.error('Erro ao salvar credenciais do Supabase:', e);
  }
};

export const clearCustomSupabaseConfig = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    supabaseInstance = null;
  } catch (e) {
    console.error('Erro ao limpar credenciais do Supabase:', e);
  }
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getStoredSupabaseConfig();
  return Boolean(
    url && 
    anonKey && 
    url.startsWith('http') &&
    !url.includes('your-project-id') &&
    !anonKey.includes('your-anon-key')
  );
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, anonKey } = getStoredSupabaseConfig();

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return supabaseInstance;
};
