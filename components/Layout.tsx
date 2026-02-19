
import React from 'react';
import { NAV_ITEMS } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
  title: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, title }) => {
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 overflow-hidden relative border-x border-gray-200 shadow-2xl">
      {/* Header com Identidade Visual Forte */}
      <header className="bg-emerald-600 pt-8 pb-6 px-6 shadow-lg z-10 rounded-b-[2rem] mb-[-1rem] relative">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase drop-shadow-md">
              {title === 'GiroPositivo' ? 'GIRO POSITIVO' : title}
            </h1>
            <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest opacity-80">
              Controle Financeiro Inteligente
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-inner">
            <span className="text-xs font-black text-white">GP</span>
          </div>
        </div>
      </header>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 overflow-y-auto pb-28 pt-8 px-4 scroll-smooth">
        {children}
      </main>

      {/* Navigation Bar Flutuante e Moderna */}
      <nav className="fixed bottom-6 left-4 right-4 max-w-[calc(28rem-2rem)] mx-auto bg-white/90 backdrop-blur-md border border-gray-100 px-2 py-3 flex justify-around items-center z-50 rounded-[2rem] shadow-2xl shadow-gray-200/50">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 relative group ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 translate-y-[-8px]' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            >
              <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                {item.icon}
              </div>
              {isActive && (
                <span className="absolute -bottom-6 text-[9px] font-black uppercase tracking-widest text-emerald-600 animate-in fade-in slide-in-from-top-1">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
