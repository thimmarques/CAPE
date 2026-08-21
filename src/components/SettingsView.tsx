import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, User, UploadCloud, ShieldCheck, Database, 
  Save, CheckCircle2, AlertCircle, Copy, ExternalLink, 
  Image as ImageIcon, FileText, Sparkles, Building2,
  Trash2, Eye, RefreshCw, PenTool, Crown, FileCode, Check,
  X, AlertTriangle, Search, Filter, ArrowUpRight
} from 'lucide-react';
import { ProfessionalProfile, StorageBucketName, AuthUser, StoredFileItem, isSuperAdminEmail } from '../types';
import { dbService, getLocalStoredFiles } from '../services/supabaseService';
import { auditService } from '../services/auditService';

interface SettingsViewProps {
  profile: ProfessionalProfile;
  currentUser: AuthUser | null;
  onSaveProfile: (profile: ProfessionalProfile) => Promise<void>;
  onOpenSupabaseModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  currentUser,
  onSaveProfile,
  onOpenSupabaseModal,
}) => {
  const isSuperAdmin = currentUser ? isSuperAdminEmail(currentUser.email) : false;

  const [activeTab, setActiveTab] = useState<'profile' | 'storage' | 'normative' | 'cloud'>('profile');
  
  // Profile Form State
  const [formData, setFormData] = useState<ProfessionalProfile>({ ...profile });
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string>('');

  // Storage Upload State
  const [selectedBucket, setSelectedBucket] = useState<StorageBucketName>('company-assets');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadedResultUrl, setUploadedResultUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gallery of Stored Files
  const [storedFiles, setStoredFiles] = useState<StoredFileItem[]>(getLocalStoredFiles);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [galleryFilterBucket, setGalleryFilterBucket] = useState<string>('ALL');
  const [gallerySearch, setGallerySearch] = useState<string>('');
  const [previewModalFile, setPreviewModalFile] = useState<StoredFileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<StoredFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [storageFeedbackMsg, setStorageFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carrega arquivos do serviço
  const loadStoredFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await dbService.listUploadedFiles();
      setStoredFiles(files);
    } catch (e) {
      console.error('Erro ao listar arquivos do storage:', e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    loadStoredFiles();
  }, [activeTab]);

  // Handlers do Perfil
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    try {
      await onSaveProfile(formData);
      setProfileSuccessMsg('Dados do Responsável Técnico e Consultoria atualizados com sucesso!');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Limpar imagens específicas do perfil
  const handleClearProfileLogo = async () => {
    const updated = { ...formData, consultancyLogoUrl: undefined };
    setFormData(updated);
    await onSaveProfile(updated);
    setProfileSuccessMsg('Logotipo da consultoria removido do perfil.');
    setTimeout(() => setProfileSuccessMsg(''), 3000);
  };

  // Handlers de Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError(null);
    setUploadedResultUrl(null);
    if (!customFileName) {
      setCustomFileName(file.name.split('.')[0]);
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadPreviewUrl(null);
    }
  };

  const handleExecuteUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadedResultUrl(null);

    const pathName = customFileName.trim() || `asset_${Date.now()}`;

    try {
      const result = await dbService.uploadImage(selectedBucket, uploadFile, pathName);

      if (result.publicUrl) {
        setUploadedResultUrl(result.publicUrl);
        await loadStoredFiles();

        // Se for upload de logo, aplica automaticamente no perfil
        if (selectedBucket === 'company-assets') {
          const updated = { ...formData, consultancyLogoUrl: result.publicUrl };
          setFormData(updated);
          await onSaveProfile(updated);
        }

        setStorageFeedbackMsg({
          type: 'success',
          text: `Arquivo "${uploadFile.name}" enviado com sucesso e salvo no armazenamento!`
        });
        setTimeout(() => setStorageFeedbackMsg(null), 4000);

        // Limpar inputs
        setUploadFile(null);
        setUploadPreviewUrl(null);
        setCustomFileName('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setUploadError(result.error || 'Falha ao processar o upload do arquivo.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Erro inesperado durante o upload.');
    } finally {
      setIsUploading(false);
    }
  };

  // Exclusão de Arquivos / Imagens
  const handleConfirmDeleteFile = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      const res = await dbService.deleteImage(fileToDelete.bucket, fileToDelete.id);
      
      if (res.success) {
        // Se a imagem deletada for a logo ativa no perfil, limpa a referência
        if (formData.consultancyLogoUrl === fileToDelete.url) {
          const updated = { ...formData, consultancyLogoUrl: undefined };
          setFormData(updated);
          await onSaveProfile(updated);
        }

        await loadStoredFiles();
        setStorageFeedbackMsg({
          type: 'success',
          text: `Imagem "${fileToDelete.name}" excluída com sucesso do armazenamento.`
        });
        setTimeout(() => setStorageFeedbackMsg(null), 4000);
      } else {
        setStorageFeedbackMsg({
          type: 'error',
          text: res.error || 'Não foi possível excluir a imagem.'
        });
      }
    } catch (err) {
      console.error('Erro ao excluir arquivo:', err);
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const applyAssetToProfile = async (bucket: StorageBucketName, url: string) => {
    let updated: ProfessionalProfile = { ...formData };
    if (bucket === 'company-assets') {
      updated.consultancyLogoUrl = url;
    }
    setFormData(updated);
    await onSaveProfile(updated);
    setProfileSuccessMsg(`Logotipo vinculado ao Perfil do Laudo com sucesso!`);
    setTimeout(() => setProfileSuccessMsg(''), 3000);
  };

  // Filtragem dos arquivos na galeria
  const filteredFiles = storedFiles.filter(f => {
    const matchBucket = galleryFilterBucket === 'ALL' || f.bucket === galleryFilterBucket;
    const matchSearch = gallerySearch.trim() === '' || 
      f.name.toLowerCase().includes(gallerySearch.toLowerCase()) || 
      f.bucket.toLowerCase().includes(gallerySearch.toLowerCase());
    return matchBucket && matchSearch;
  });

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
            <Settings size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Configurações & Central de Armazenamento
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie dados do Responsável Técnico, uploads, exclusão de imagens e diretrizes normativas NR-01.
            </p>
          </div>
        </div>
      </div>

      {/* Global Storage Feedback Banner */}
      {storageFeedbackMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200 ${
          storageFeedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {storageFeedbackMsg.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{storageFeedbackMsg.text}</span>
          </div>
          <button 
            onClick={() => setStorageFeedbackMsg(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'profile'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-xl'
          }`}
        >
          <User size={15} />
          <span>Perfil do Responsável Técnico</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'storage'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-xl'
          }`}
        >
          <UploadCloud size={15} />
          <span>Galeria de Imagens & Storage</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px]">
            {storedFiles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('normative')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'normative'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/50 rounded-t-xl'
          }`}
        >
          <ShieldCheck size={15} />
          <span>Parâmetros NR-01 & ISO 45003</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'cloud'
                ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
                : 'border-transparent text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 rounded-t-xl'
            }`}
          >
            <Crown size={15} className="text-amber-500" />
            <span>Infraestrutura Supabase (Master)</span>
          </button>
        )}

      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PERFIL DO RESPONSÁVEL TÉCNICO & CONSULTORIA */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          
          {/* Card: Foto de Avatar Vinculada ao Google (Sem necessidade de storage Supabase) */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                {currentUser?.avatarUrl ? (
                  <img 
                    src={currentUser.avatarUrl} 
                    alt={currentUser.name} 
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-2xl border-2 border-emerald-400">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <div 
                  className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-xs"
                  title="Autenticado via Google OAuth"
                >
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
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{currentUser?.name}</h3>
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold rounded-full">
                    Sincronizado via Google
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono">{currentUser?.email}</p>
                <p className="text-[11px] text-slate-400">
                  Foto do perfil vinculada diretamente à sua conta Google (não consome armazenamento no Supabase).
                </p>
              </div>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>Avatar Ativo em Todo o Sistema</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Fields */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Dados do Perito / Especialista Homologador
                  </h2>
                  <p className="text-xs text-slate-500">
                    Estas informações constarão no cabeçalho e encerramento de todos os Laudos Técnicos NR-01 gerados.
                  </p>
                </div>
              </div>

              {profileSuccessMsg && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo do Responsável Técnico *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleProfileChange}
                      required
                      placeholder="Ex: Dr. Thiago Marques"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Registro no Conselho de Classe (CRP/CRM/CREA) *
                    </label>
                    <input
                      type="text"
                      name="councilRegister"
                      value={formData.councilRegister}
                      onChange={handleProfileChange}
                      required
                      placeholder="Ex: CRP 06/123456 ou CRM 98765-SP"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Especialidade Técnica / Qualificação *
                    </label>
                    <input
                      type="text"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleProfileChange}
                      required
                      placeholder="Ex: Psicologia Organizacional e do Trabalho / Perito SST"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome da Empresa / Consultoria SST *
                    </label>
                    <input
                      type="text"
                      name="consultancyName"
                      value={formData.consultancyName}
                      onChange={handleProfileChange}
                      required
                      placeholder="Ex: PsychoRisk Analytics SST"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-mail Profissional de Contato
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleProfileChange}
                      placeholder="contato@consultoria.com.br"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Telefone / WhatsApp Comercial
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleProfileChange}
                      placeholder="(11) 98765-4321"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Imagens Vinculadas no Perfil: Logo com opção de Excluir/Remover */}
                <div className="pt-4 border-t border-slate-100">
                  
                  {/* Logotipo da Consultoria */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 size={14} className="text-emerald-600" />
                        Logotipo da Consultoria / Emissor
                      </span>
                      {formData.consultancyLogoUrl && (
                        <button
                          type="button"
                          onClick={handleClearProfileLogo}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 hover:underline"
                          title="Remover logotipo do perfil"
                        >
                          <Trash2 size={12} />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>

                    {formData.consultancyLogoUrl ? (
                      <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <img 
                          src={formData.consultancyLogoUrl} 
                          alt="Logo" 
                          className="w-14 h-14 object-contain bg-slate-50 rounded border p-1 shrink-0" 
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700 truncate">Logotipo Ativo no Cabeçalho do Laudo</p>
                          <p className="text-[10px] text-slate-400 truncate font-mono">{formData.consultancyLogoUrl}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum logotipo vinculado ao perfil técnico.</p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBucket('company-assets');
                        setActiveTab('storage');
                      }}
                      className="w-full py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud size={14} />
                      <span>{formData.consultancyLogoUrl ? 'Trocar Logotipo na Galeria de Storage' : 'Adicionar Logotipo da Galeria'}</span>
                    </button>
                  </div>

                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Salvar Alterações no Perfil</span>
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>

            {/* Lateral Preview & Current Assets */}
            <div className="space-y-4">
              
              {/* Visual Profile Card Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Identificação do Responsável no Laudo
                </h3>
                
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : 'E'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">{formData.name || 'Nome do Especialista'}</div>
                      <div className="text-[11px] font-semibold text-emerald-700 font-mono">{formData.councilRegister || 'Registro no Conselho'}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
                    <div className="text-slate-600 font-medium">{formData.specialty || 'Especialidade Técnica'}</div>
                    <div className="text-[11px] text-slate-400">{formData.consultancyName}</div>
                    {formData.email && <div className="text-[10px] text-slate-400 font-mono truncate">{formData.email}</div>}
                  </div>
                </div>

                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('storage')}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <UploadCloud size={13} />
                    <span>Gerenciar Logotipos e Documentos no Storage</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CENTRAL DE STORAGE & EXCLUSÃO DE IMAGENS */}
      {/* ========================================================================= */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          
          {/* Informative Note: Google Avatar + Supabase Buckets */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-950">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
              <UploadCloud size={18} />
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold">Gerenciamento de Imagens e Arquivos do Sistema:</p>
              <p className="text-emerald-800 leading-relaxed">
                Faça upload de novos logotipos de empresas e consultorias, laudos e anexos, ou <strong>exclua definitivamente as imagens que não desejar mais</strong>. As fotos de avatar dos usuários são vinculadas automaticamente à conta Google/Gmail de login.
              </p>
            </div>
          </div>

          {/* Bucket Category Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <button
              onClick={() => setSelectedBucket('company-assets')}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                selectedBucket === 'company-assets'
                  ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Building2 className={`w-6 h-6 mb-2 ${selectedBucket === 'company-assets' ? 'text-emerald-700' : 'text-slate-500'}`} />
              <div>
                <div className="font-bold text-xs text-slate-900">Logotipos de Empresas & Consultoria</div>
                <div className="text-[10px] text-slate-500 font-mono">company-assets</div>
              </div>
            </button>

            <button
              onClick={() => setSelectedBucket('reports')}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                selectedBucket === 'reports'
                  ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileText className={`w-6 h-6 mb-2 ${selectedBucket === 'reports' ? 'text-emerald-700' : 'text-slate-500'}`} />
              <div>
                <div className="font-bold text-xs text-slate-900">Documentos & Anexos de Laudos</div>
                <div className="text-[10px] text-slate-500 font-mono">reports</div>
              </div>
            </button>

          </div>

          {/* Upload Dropzone & New File Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Enviar Novo Arquivo para o Bucket <span className="font-mono text-emerald-700">"{selectedBucket}"</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Formatos aceitos: PNG (com transparência para assinaturas/logos), JPG, SVG, WebP ou PDF.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                Até 10MB por arquivo
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Dropzone Container */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="lg:col-span-2 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf"
                  className="hidden" 
                />

                {uploadPreviewUrl ? (
                  <div className="relative group">
                    <img 
                      src={uploadPreviewUrl} 
                      alt="Preview" 
                      className="max-h-36 rounded-xl object-contain border border-slate-200 shadow-xs bg-white p-2" 
                    />
                    <span className="text-[10px] font-bold text-emerald-700 block mt-2">Clique para trocar de arquivo</span>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {uploadFile ? uploadFile.name : 'Arraste ou clique para selecionar uma imagem'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Upload direto com processamento seguro
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome / Identificador do Arquivo
                  </label>
                  <input
                    type="text"
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    placeholder="Ex: logo_consultoria_2025"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExecuteUpload}
                  disabled={!uploadFile || isUploading}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Enviando arquivo...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={15} />
                      <span>Realizar Upload</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>

          {/* Galeria Completa de Arquivos com Opção de Exclusão */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon size={18} className="text-emerald-700" />
                  Galeria de Imagens & Arquivos Salvos
                </h3>
                <p className="text-xs text-slate-500">
                  Visualize, copie links ou <strong>exclua as imagens indesejadas</strong> com 1 clique.
                </p>
              </div>

              {/* Filtros e Busca */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadStoredFiles}
                  disabled={isLoadingFiles}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
                  title="Atualizar lista com o Supabase Storage em tempo real"
                >
                  <RefreshCw size={13} className={isLoadingFiles ? 'animate-spin text-emerald-600' : 'text-slate-500'} />
                  <span>{isLoadingFiles ? 'Atualizando...' : 'Atualizar'}</span>
                </button>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={gallerySearch}
                    onChange={(e) => setGallerySearch(e.target.value)}
                    placeholder="Filtrar imagens..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none w-40 sm:w-52"
                  />
                </div>

                <select
                  value={galleryFilterBucket}
                  onChange={(e) => setGalleryFilterBucket(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="ALL">Todos os Buckets</option>
                  <option value="company-assets">Logotipos (company-assets)</option>
                  <option value="reports">Documentos (reports)</option>
                </select>
              </div>
            </div>

            {/* Grid de Cards de Imagens */}
            {isLoadingFiles ? (
              <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <RefreshCw size={28} className="mx-auto text-emerald-600 animate-spin" />
                <p className="text-xs font-bold text-slate-700">Carregando arquivos do Supabase Storage...</p>
                <p className="text-[11px] text-slate-400">Consultando os buckets públicos em tempo real.</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <ImageIcon size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Nenhuma imagem encontrada nesta categoria.</p>
                <p className="text-[11px] text-slate-400">Faça upload de novos arquivos acima para compor sua biblioteca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredFiles.map((file) => {
                  const isCurrentlyLogo = formData.consultancyLogoUrl === file.url;

                  return (
                    <div 
                      key={file.id}
                      className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-3.5 transition-all shadow-xs flex flex-col justify-between group space-y-3"
                    >
                      {/* Image Thumbnail Container */}
                      <div className="relative bg-white rounded-xl border border-slate-200/80 p-2 h-32 flex items-center justify-center overflow-hidden">
                        {file.url && (file.url.startsWith('http') || file.url.startsWith('data:')) ? (
                          <img 
                            src={file.url} 
                            alt={file.name} 
                            className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <FileText size={32} className="text-slate-400" />
                        )}

                        {/* Badges de Uso */}
                        {isCurrentlyLogo && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded-md shadow-xs">
                            Logo Ativo
                          </span>
                        )}

                        {/* Hover Overlay Button to Preview */}
                        <button
                          onClick={() => setPreviewModalFile(file)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 backdrop-blur-xs"
                        >
                          <Eye size={16} />
                          <span>Ampliar</span>
                        </button>
                      </div>

                      {/* File Metadata */}
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-900 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded">
                            {file.bucket}
                          </span>
                          <span>
                            {new Date(file.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-1.5">
                        
                        {/* Vincular ao Perfil */}
                        {file.bucket === 'company-assets' && (
                          <button
                            onClick={() => applyAssetToProfile(file.bucket, file.url)}
                            title="Definir como Logotipo da Consultoria"
                            className="px-2 py-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex-1 text-center truncate"
                          >
                            Usar no Laudo
                          </button>
                        )}

                        {/* Copiar Link */}
                        <button
                          onClick={() => copyToClipboard(file.url, file.id)}
                          title="Copiar URL pública da imagem"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          {copiedUrl === file.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>

                        {/* Botão de Excluir Imagem (com destaque) */}
                        <button
                          onClick={() => setFileToDelete(file)}
                          title="Excluir esta imagem permanentemente"
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PARÂMETROS NR-01 & ISO 45003 */}
      {/* ========================================================================= */}
      {activeTab === 'normative' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 pb-3 border-b border-slate-100">
              <ShieldCheck size={20} className="text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Fundamentação Técnica e Normativa</h2>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Portaria MTE nº 1.419/2024 (NR-01)</span>
                Estabelece a obrigatoriedade da inclusão formal e contínua dos fatores psicossociais e ergonômicos no Programa de Gerenciamento de Riscos (PGR) e Inventário de Riscos das empresas.
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">ISO 45003:2021 (Saúde Psicológica no Trabalho)</span>
                Diretrizes globais de gestão da segurança psicológica, abordando aspectos de organização do trabalho, estressores cognitivos e apoio da liderança.
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Metodologia HSE-IT & Escala Likert 4 Pontos</span>
                Instrumento psicométrico com 35 itens distribuídos em 7 dimensões: Demandas de Trabalho, Controle/Autonomia, Apoio da Gestão, Apoio dos Colegas, Relacionamentos Interpessoais, Clareza de Papel e Gestão de Mudanças.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 pb-3 border-b border-slate-100">
              <Sparkles size={20} className="text-teal-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Régua de Classificação de Risco</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-900">Risco Baixo (1.00 a 2.49)</span>
                  <p className="text-[11px] text-emerald-700">Ambiente favorável, medidas de manutenção de bem-estar.</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-lg">Favorável</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-900">Risco Médio (2.50 a 2.99)</span>
                  <p className="text-[11px] text-amber-700">Atenção e intervenções preventivas recomendadas no plano de ação.</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-lg">Moderado</span>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-orange-900">Risco Alto (3.00 a 3.49)</span>
                  <p className="text-[11px] text-orange-700">Plano de intervenção prioritário exigido pelo PGR / NR-01.</p>
                </div>
                <span className="px-2.5 py-1 bg-orange-200 text-orange-900 text-[10px] font-bold rounded-lg">Prioritário</span>
              </div>

              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-red-900">Risco Crítico (3.50 a 4.00)</span>
                  <p className="text-[11px] text-red-700">Intervenção imediata e plano de contingência obrigatório.</p>
                </div>
                <span className="px-2.5 py-1 bg-red-200 text-red-900 text-[10px] font-bold rounded-lg">Urgente</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INFRAESTRUTURA SUPABASE (SUPER ADMIN MASTER) */}
      {/* ========================================================================= */}
      {activeTab === 'cloud' && isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <Crown size={22} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Painel de Governança Supabase & Banco de Dados
                </h2>
                <p className="text-xs text-slate-500">
                  Acesso exclusivo do Super Admin Master (<span className="font-mono text-slate-800 font-semibold">{currentUser?.email}</span>)
                </p>
              </div>
            </div>

            {onOpenSupabaseModal && (
              <button
                onClick={onOpenSupabaseModal}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-2"
              >
                <Database size={14} />
                <span>Abrir Modal de Configuração Supabase</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Tabelas Ativas no PostgreSQL:</span>
              <ul className="text-xs text-slate-600 space-y-1 font-mono">
                <li>• companies (Empresas e Setores)</li>
                <li>• questionnaire_templates (Templates HSE-IT)</li>
                <li>• assessment_sessions (Respostas dos Questionários)</li>
                <li>• technical_reports (Laudos Técnicos Periciais)</li>
                <li>• consultancy_profiles (Perfil do Responsável Técnico)</li>
                <li>• user_profiles (Usuários e RBAC)</li>
                <li>• audit_logs (Trilha de Auditoria NR-01)</li>
              </ul>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Buckets de Storage Configurados:</span>
              <ul className="text-xs text-slate-600 space-y-1 font-mono">
                <li>• company-assets (Logos das empresas)</li>
                <li>• signatures (Assinaturas digitais)</li>
                <li>• reports (Laudos e anexos PDF)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE IMAGEM */}
      {/* ========================================================================= */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Imagem do Armazenamento</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              {fileToDelete.url && (fileToDelete.url.startsWith('http') || fileToDelete.url.startsWith('data:')) ? (
                <img 
                  src={fileToDelete.url} 
                  alt={fileToDelete.name} 
                  className="w-12 h-12 object-contain bg-white rounded-lg border border-slate-200 shrink-0 p-1" 
                />
              ) : (
                <FileText size={24} className="text-slate-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{fileToDelete.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">Bucket: {fileToDelete.bucket}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente excluir esta imagem? Se ela estiver sendo utilizada em algum laudo ou perfil, a referência será removida.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirmar e Excluir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE PRÉ-VISUALIZAÇÃO AMPLIADA DA IMAGEM */}
      {/* ========================================================================= */}
      {previewModalFile && (
        <div 
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewModalFile(null)}
        >
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 truncate">{previewModalFile.name}</h3>
                <span className="text-[10px] text-slate-400 font-mono">Bucket: {previewModalFile.bucket}</span>
              </div>
              <button
                onClick={() => setPreviewModalFile(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center max-h-[60vh] overflow-hidden">
              <img 
                src={previewModalFile.url} 
                alt={previewModalFile.name} 
                className="max-h-full max-w-full object-contain rounded-lg" 
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => copyToClipboard(previewModalFile.url, previewModalFile.id)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Copy size={13} />
                <span>Copiar Link do Arquivo</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const target = previewModalFile;
                    setPreviewModalFile(null);
                    setFileToDelete(target);
                  }}
                  className="px-3.5 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
                <button
                  onClick={() => setPreviewModalFile(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
