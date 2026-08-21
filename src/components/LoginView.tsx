import React, { useState } from 'react';
import { 
  ShieldCheck, Lock, Mail, Eye, EyeOff, LogIn, 
  AlertCircle, Building2, FileCheck2
} from 'lucide-react';
import { authService } from '../services/authService';
import { AuthUser } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isCloudActive = isSupabaseConfigured();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail de acesso.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, informe sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.loginWithEmail(email, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Não foi possível realizar o login. Verifique seus dados.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Erro inesperado ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const res = await authService.loginWithGoogle();
      if (!res.success && res.error) {
        setErrorMessage(res.error);
        setIsGoogleLoading(false);
      }
      // If successful, Supabase redirects to Google and then back to application
    } catch (e: any) {
      setErrorMessage(e?.message || 'Erro ao conectar com Google.');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center">
            <img 
              src="/CAPE_logo_1787309328715.PNG" 
              alt="CAPE Logo" 
              className="max-h-20 sm:max-h-24 w-auto max-w-[280px] object-contain drop-shadow-md mx-auto"
              onError={(e) => {
                // Fallback to shield icon if image file is not found
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('login-logo-fallback');
                if (fallback) fallback.style.display = 'inline-flex';
              }}
            />
            <div 
              id="login-logo-fallback" 
              style={{ display: 'none' }}
              className="items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl shadow-emerald-950/50"
            >
              <ShieldCheck size={32} />
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full inline-block">
              NR-01 & Portaria MTE nº 1.419/2024
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              PsychoRisk <span className="text-emerald-400 font-medium">Analytics</span>
            </h1>
            <p className="text-xs text-slate-400">
              Sistema de Avaliação e Gestão de Riscos Psicossociais
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <LogIn size={18} className="text-emerald-400" />
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Faça login com seu Gmail corporativo ou credenciais
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in duration-200">
              <AlertCircle size={17} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Google OAuth Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Entrar com Gmail / Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              ou com e-mail e senha
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>E-mail</span>
                <span className="text-[10px] text-slate-500 font-normal">Ex: consultor@empresa.com</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu email"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Senha de Acesso</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-normal"
                >
                  {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 active:scale-[0.99] disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              <span>{isLoading ? 'Autenticando...' : 'Entrar no Sistema'}</span>
            </button>
          </form>

          {/* Database Status Tag */}
          <div className="flex items-center justify-center text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCloudActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isCloudActive ? 'Supabase Conectado' : 'Modo Local Ativo'}
            </span>
          </div>

        </div>

        {/* Footer Badges */}
        <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-slate-500">
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 flex items-center justify-center gap-1.5">
            <Building2 size={13} className="text-emerald-500" />
            <span>Multiempresas & RH</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 flex items-center justify-center gap-1.5">
            <FileCheck2 size={13} className="text-emerald-500" />
            <span>Laudos PGR / GRO</span>
          </div>
        </div>

      </div>
    </div>
  );
};
