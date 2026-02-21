
import React, { useState } from 'react';
import { Entry, EntryType } from '../src/types';
import { parseISO } from '../utils/calculations';
import { Trash2, Edit2, TrendingUp, TrendingDown, Fuel, Smartphone, Lock, Filter } from 'lucide-react';

interface RecordsProps {
  entries: Entry[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (entry: Entry) => void;
}

type FilterType = 'ALL' | 'REVENUE' | 'EXPENSES';

export const Records: React.FC<RecordsProps> = ({ entries, onDelete, onEdit }) => {
  const [filter, setFilter] = useState<FilterType>('ALL');

  const filtered = entries
    .filter(e => {
      if (filter === 'ALL') return true;
      if (filter === 'REVENUE') return e.type === EntryType.REVENUE;
      if (filter === 'EXPENSES') return e.type !== EntryType.REVENUE;
      return true;
    })
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

  const getIcon = (type: EntryType) => {
    switch(type) {
      case EntryType.REVENUE: return <TrendingUp className="text-emerald-500" size={20} />;
      case EntryType.FUEL: return <Fuel className="text-amber-500" size={20} />;
      case EntryType.APP_TAX: return <Smartphone className="text-blue-500" size={20} />;
      case EntryType.EXPENSE: return <TrendingDown className="text-red-500" size={20} />;
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Filtros em Pílula */}
      <div className="bg-white p-1.5 rounded-[1.5rem] border border-gray-100 shadow-sm flex gap-1">
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filter === 'ALL' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('REVENUE')}
          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filter === 'REVENUE' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          Receitas
        </button>
        <button
          onClick={() => setFilter('EXPENSES')}
          className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            filter === 'EXPENSES' ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          Despesas
        </button>
      </div>

      <div className="space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
               <Filter size={24} />
             </div>
             <p className="text-sm font-bold text-gray-400">Nenhum registro encontrado.</p>
          </div>
        ) : (
          filtered.map(entry => {
            const isAutomatic = entry.origin === 'automatic';
            const isRecharge = entry.isRecharge;
            const displayCategory = isRecharge ? 'Saldo do App' : entry.category;
            const amountColor = entry.type === EntryType.REVENUE ? 'text-emerald-600' : (isRecharge ? 'text-blue-600' : 'text-red-500');
            const indicatorColor = entry.type === EntryType.REVENUE ? 'bg-emerald-500' : (isRecharge ? 'bg-blue-500' : 'bg-red-500');

            return (
              <div key={entry.id} className={`bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex items-center justify-between group active:scale-[0.99] transition-all cursor-default relative overflow-hidden ${isAutomatic ? 'bg-blue-50/20' : ''}`}>
                
                {/* Indicador lateral colorido */}
                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${indicatorColor}`}></div>

                <div className="flex items-center gap-4 pl-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 ${isAutomatic ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    {getIcon(entry.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-black text-gray-800 uppercase tracking-tight line-clamp-1">{displayCategory}</p>
                      {isAutomatic && (
                        <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                          <Lock size={8} /> AUTO
                        </span>
                      )}
                      {entry.isRecharge && (
                        <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                          RECARGA
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                      {new Date(entry.date).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {entry.description && <span className="normal-case font-medium text-gray-300"> • {entry.description}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 pl-2">
                  <p className={`text-sm font-black tracking-tight ${amountColor}`}>
                    {entry.type === EntryType.REVENUE ? '+' : ''}{formatCurrency(entry.amount)}
                  </p>
                  
                  {!isAutomatic ? (
                    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(entry); }} 
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }} 
                        className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[8px] text-blue-400 font-black uppercase mt-2 opacity-60">Via Jornada</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
