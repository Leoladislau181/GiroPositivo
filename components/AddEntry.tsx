
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EntryType, Platform, Entry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { X, Calendar as CalendarIcon, Tag, Gauge, Droplets, TicketPercent, Info, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { formatToBRDate, getNowInBR, parseISO } from '../utils/calculations';
import { formatMoneyInput, parseMoneyInput } from '../utils/formatters';

interface AddEntryProps {
  userId: string;
  onAdd: (entry: Entry) => void;
  onCancel: () => void;
  initialEntry?: Entry;
}

enum TabType {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

type DiscountType = 'MONEY' | 'PERCENT';

export const AddEntry: React.FC<AddEntryProps> = ({ userId, onAdd, onCancel, initialEntry }) => {
  const [tab, setTab] = useState<TabType>(initialEntry?.type === EntryType.REVENUE ? TabType.REVENUE : (initialEntry ? TabType.EXPENSE : TabType.REVENUE));
  const [category, setCategory] = useState<string>(initialEntry?.category || '');
  const [platform, setPlatform] = useState<string>(initialEntry?.platform || '');
  const [date, setDate] = useState(initialEntry ? format(parseISO(initialEntry.date), 'yyyy-MM-dd') : formatToBRDate(getNowInBR()));
  const [amountDisplay, setAmountDisplay] = useState(initialEntry ? formatMoneyInput((initialEntry.amount * 100).toString()) : '0,00');
  const [description, setDescription] = useState(initialEntry?.description || '');
  const [kmRecorded, setKmRecorded] = useState(initialEntry?.kmRecorded?.toString() || '');
  const [pricePerLiterDisplay, setPricePerLiterDisplay] = useState(initialEntry?.pricePerLiter ? formatMoneyInput((initialEntry.pricePerLiter * 100).toString()) : '0,00');
  
  const [discountDisplay, setDiscountDisplay] = useState(initialEntry?.discount ? formatMoneyInput((initialEntry.discount * 100).toString()) : '0,00');
  const [discountType, setDiscountType] = useState<DiscountType>('MONEY');

  const backups = useRef<Record<string, string>>({});

  const isRechargeCategory = tab === TabType.EXPENSE && category === 'Taxa de Aplicativo';
  const isFuelCategory = tab === TabType.EXPENSE && category === 'Combustível';

  const moveCursorToEnd = (el: HTMLInputElement) => {
    window.requestAnimationFrame(() => {
      if (el) el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const handleFocus = (field: string, currentVal: string, setter: (v: string) => void, e: React.FocusEvent<HTMLInputElement>) => {
    backups.current[field] = currentVal;
    setter('');
    moveCursorToEnd(e.currentTarget);
  };

  const handleBlur = (field: string, currentVal: string, setter: (v: string) => void, isCurrency: boolean = true) => {
    if (!currentVal || (isCurrency && (currentVal === '0,00' || currentVal === ''))) {
      setter(backups.current[field] || (isCurrency ? '0,00' : ''));
    }
  };

  const calculatedLiters = useMemo(() => {
    if (!isFuelCategory) return 0;
    const amount = parseMoneyInput(amountDisplay);
    const price = parseMoneyInput(pricePerLiterDisplay);
    if (amount > 0 && price > 0) return amount / price;
    return 0;
  }, [amountDisplay, pricePerLiterDisplay, isFuelCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return alert('Selecione uma data válida.');
    if (tab === TabType.REVENUE && !platform) return alert('Selecione uma plataforma.');
    if (tab === TabType.EXPENSE && !category) return alert('Selecione uma categoria.');

    let finalType: EntryType;
    let finalCategory: string;
    let finalPlatform: Platform | undefined = undefined;
    let finalAmount = parseMoneyInput(amountDisplay);
    let isRecharge = false;
    let origin: Entry['origin'] = 'manual';
    
    let finalDiscountValue = 0;
    const rawDiscountInput = parseMoneyInput(discountDisplay);
    if (discountType === 'PERCENT') {
        finalDiscountValue = (finalAmount * rawDiscountInput) / 100;
    } else {
        finalDiscountValue = rawDiscountInput;
    }

    if (tab === TabType.REVENUE) {
        finalType = EntryType.REVENUE;
        finalCategory = platform; 
        finalPlatform = platform as Platform;
    } else {
        if (category === 'Combustível') finalType = EntryType.FUEL;
        else if (category === 'Taxa de Aplicativo') {
            finalType = EntryType.APP_TAX;
            isRecharge = true; 
            origin = 'manual_recharge';
        }
        else finalType = EntryType.EXPENSE;
        finalCategory = category;
    }

    try {
      const newEntry: Entry = {
        id: initialEntry?.id || uuidv4(),
        userId: userId,
        type: finalType,
        category: finalCategory,
        amount: finalAmount,
        date: new Date(date + 'T12:00:00Z').toISOString(),
        description,
        platform: finalPlatform,
        kmRecorded: kmRecorded ? parseFloat(kmRecorded) : undefined,
        pricePerLiter: finalType === EntryType.FUEL ? parseMoneyInput(pricePerLiterDisplay) : undefined,
        discount: finalDiscountValue > 0 ? finalDiscountValue : undefined,
        isRecharge,
        origin
      };
      onAdd(newEntry);
    } catch (err) {
      alert('Erro ao salvar registro.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col animate-in fade-in slide-in-from-bottom-10 duration-300 text-gray-800">
      <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm">
        <h2 className="text-xl font-black italic tracking-tighter text-gray-800 uppercase">
          {isRechargeCategory ? 'Nova Recarga' : (initialEntry ? 'Editar Registro' : 'Novo Registro')}
        </h2>
        <button onClick={onCancel} className="p-2 rounded-full bg-gray-100 text-gray-400 hover:text-gray-800 transition-colors">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-32 space-y-6 pt-6">
        {!isRechargeCategory && (
          <div className="flex p-1 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <button type="button" onClick={() => setTab(TabType.REVENUE)} className={`flex-1 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${tab === TabType.REVENUE ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-400 hover:text-gray-600'}`}>Receita</button>
            <button type="button" onClick={() => setTab(TabType.EXPENSE)} className={`flex-1 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all ${tab === TabType.EXPENSE ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'text-gray-400 hover:text-gray-600'}`}>Despesa</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                <div className="relative">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border border-gray-200 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
            </div>
            <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{tab === TabType.REVENUE ? 'Plataforma' : 'Categoria'}</label>
                {tab === TabType.REVENUE ? (
                  <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-white border border-gray-200 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors appearance-none">
                    <option value="" disabled>Selecionar</option>
                    {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                ) : (
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white border border-gray-200 p-4 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors appearance-none">
                    <option value="" disabled>Selecionar</option>
                    <option value="Combustível">Combustível</option>
                    <option value="Taxa de Aplicativo">Taxa (Recarga)</option>
                    <option value="Alimentação">Alimentação</option>
                    <option value="Outros">Outros</option>
                  </select>
                )}
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isRechargeCategory ? 'Valor da Recarga' : 'Valor Total'}</label>
            <div className="bg-white border-2 border-gray-100 p-6 rounded-3xl flex items-center justify-end relative shadow-sm group focus-within:border-emerald-500 transition-all">
                <span className="absolute left-6 text-gray-300 font-black text-xl group-focus-within:text-emerald-500 transition-colors">R$</span>
                <input 
                    type="tel"
                    value={amountDisplay}
                    onFocus={e => handleFocus('amount', amountDisplay, setAmountDisplay, e)}
                    onBlur={() => handleBlur('amount', amountDisplay, setAmountDisplay)}
                    onChange={e => setAmountDisplay(formatMoneyInput(e.target.value))}
                    className="bg-transparent text-gray-800 text-4xl font-black text-right focus:outline-none w-full"
                />
            </div>
        </div>

        {isFuelCategory && (
          <div className="bg-white p-4 rounded-[2rem] border border-gray-100 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Detalhes do Abastecimento</h4>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Preço / Litro</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs font-black">R$</span>
                    <input 
                      type="tel" 
                      className="w-full bg-gray-50 border border-gray-100 p-4 pl-10 rounded-2xl text-sm font-bold focus:bg-white focus:border-amber-400 focus:outline-none transition-all" 
                      value={pricePerLiterDisplay}
                      onFocus={e => handleFocus('price', pricePerLiterDisplay, setPricePerLiterDisplay, e)}
                      onBlur={() => handleBlur('price', pricePerLiterDisplay, setPricePerLiterDisplay)}
                      onChange={e => setPricePerLiterDisplay(formatMoneyInput(e.target.value))}
                    />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Litros</label>
                  <div className="relative">
                    <Droplets className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400" size={16} />
                    <input 
                      readOnly
                      type="text" 
                      className="w-full bg-amber-50 border border-amber-100 p-4 pl-10 rounded-2xl text-sm font-black text-amber-700" 
                      value={calculatedLiters.toFixed(2) + ' L'}
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex justify-between items-center">
                    Desconto <span className="text-[8px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400">OPCIONAL</span>
                  </label>
                  <div className="relative flex">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                       <button 
                         type="button"
                         onClick={() => setDiscountType(discountType === 'MONEY' ? 'PERCENT' : 'MONEY')}
                         className="p-1.5 rounded-lg bg-gray-200 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                       >
                         {discountType === 'MONEY' ? <Tag size={12} /> : <Percent size={12} />}
                       </button>
                    </div>
                    <input 
                      type="tel" 
                      placeholder="0,00"
                      className="w-full bg-gray-50 border border-gray-100 p-4 pl-14 rounded-2xl text-sm font-bold text-right focus:bg-white focus:border-emerald-400 focus:outline-none transition-all" 
                      value={discountDisplay}
                      onFocus={e => handleFocus('disc', discountDisplay, setDiscountDisplay, e)}
                      onBlur={() => handleBlur('disc', discountDisplay, setDiscountDisplay)}
                      onChange={e => setDiscountDisplay(formatMoneyInput(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Odômetro</label>
                   <input 
                     type="tel" 
                     placeholder="KM" 
                     className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl text-sm font-bold focus:bg-white focus:border-amber-400 focus:outline-none transition-all" 
                     value={kmRecorded}
                     onFocus={e => handleFocus('km', kmRecorded, setKmRecorded, e)}
                     onBlur={() => handleBlur('km', kmRecorded, setKmRecorded, false)}
                     onChange={e => setKmRecorded(e.target.value)}
                   />
                </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observação</label>
            <textarea rows={3} placeholder={isRechargeCategory ? "Ex: Recarga via Pix..." : "Ex: Posto Ipiranga..."} value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white border border-gray-200 p-4 rounded-2xl text-sm font-medium text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors resize-none" />
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 max-w-md mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <button type="submit" className={`w-full text-white font-black py-5 rounded-2xl text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all ${isRechargeCategory || tab === TabType.REVENUE ? 'bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700' : 'bg-red-500 shadow-red-200 hover:bg-red-600'}`}>
                {isRechargeCategory ? 'Confirmar Recarga' : 'Salvar Registro'}
            </button>
        </div>
      </form>
    </div>
  );
};
