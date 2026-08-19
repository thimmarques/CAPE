import React, { useState } from 'react';
import { ProfessionalProfile } from '../types';
import { User, X, Check, Award } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  profile: ProfessionalProfile;
  onSaveProfile: (profile: ProfessionalProfile) => void;
  onClose: () => void;
}

export function ProfileSettingsModal({ isOpen, profile, onSaveProfile, onClose }: ProfileSettingsModalProps) {
  const [formData, setFormData] = useState<ProfessionalProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div id="profile-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div id="profile-modal-card" className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] text-white flex items-center justify-center font-bold shadow-xs">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Perfil do Especialista & Consultoria</h3>
              <p className="text-xs text-slate-500">Dados do Responsável Técnico para homologação dos Laudos Ocupacionais (NR-01)</p>
            </div>
          </div>
          <button 
            id="close-profile-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome Completo do Especialista *</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Dr. Roberto Almeida"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Registro de Classe (CRP / CRM / CREA / COREN) *</label>
                <input 
                  type="text" 
                  required
                  value={formData.councilRegister}
                  onChange={(e) => setFormData({...formData, councilRegister: e.target.value})}
                  placeholder="Ex: CRP 06/123456"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] outline-none font-mono transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Especialidade / Título</label>
                <input 
                  type="text" 
                  value={formData.specialty}
                  onChange={(e) => setFormData({...formData, specialty: e.target.value})}
                  placeholder="Ex: Psicologia Ocupacional e Saúde do Trabalho"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome da Consultoria / Clínica</label>
                <input 
                  type="text" 
                  value={formData.consultancyName}
                  onChange={(e) => setFormData({...formData, consultancyName: e.target.value})}
                  placeholder="Ex: Centro Avançado de Pedagogia Empresarial"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail Profissional</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="especialista@clinica.com.br"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone / WhatsApp</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(11) 98765-4321"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#2D6A4F] focus:border-[#2D6A4F] outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                id="cancel-profile-btn"
                type="button" 
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                id="save-profile-btn"
                type="submit"
                className="px-6 py-2 bg-[#2D6A4F] hover:bg-[#3A5A40] text-white text-sm font-bold rounded-lg shadow-xs flex items-center gap-2 transition-colors"
              >
                {savedSuccess ? <Check size={16} /> : null}
                {savedSuccess ? 'Salvo com Sucesso!' : 'Salvar Informações'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
