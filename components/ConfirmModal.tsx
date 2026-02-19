
import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative bg-white w-full max-w-xs rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
          <AlertCircle size={28} />
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-xs text-gray-500 mb-8 leading-relaxed">
          {message}
        </p>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 ${
              isDestructive ? 'bg-red-500 text-white shadow-red-100' : 'bg-emerald-600 text-white shadow-emerald-100'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
        
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
