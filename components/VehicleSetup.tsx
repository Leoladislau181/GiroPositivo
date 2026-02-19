
import React, { useState, useRef } from 'react';
import { Vehicle, VehicleType, ContractStatus } from '../types';
import { formatMoneyInput, parseMoneyInput } from '../utils/formatters';
import { v4 as uuidv4 } from 'uuid';
import { X, Target, DollarSign, CalendarCheck } from 'lucide-react';

interface VehicleSetupProps {
  userId: string;
  onComplete: (v: Vehicle) => void;
  onCancel?: () => void;
}

export const VehicleSetup: React.FC<VehicleSetupProps> = ({ userId, onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<VehicleType>(VehicleType.OWNED);
  const [profitGoalDisplay, setProfitGoalDisplay] = useState('4.500,00');
  const [contractValueDisplay, setContractValueDisplay] = useState('1.200,00');
  const [carInstallmentDisplay, setCarInstallmentDisplay] = useState('0,00');
  const [appBalanceDisplay, setAppBalanceDisplay] = useState('0,00');

  const [data, setData] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '', 
    endDate: '',
    endTime: '',   
    currentOdometer: '',
  });

  const backups = useRef<Record<string, string>>({});

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

  const handleSetType = (newType: VehicleType) => {
    setType(newType);
    setStep(2);
    // Limpa datas ao trocar o tipo para evitar inconsistências
    if (newType === VehicleType.OWNED) {
      setData(prev => ({ ...prev, startDate: '', startTime: '', endDate: '', endTime: '' }));
    } else {
      setData(prev => ({ 
        ...prev, 
        startDate: new Date().toISOString().split('T')[0],
        endDate: '' 
      }));
    }
  };

  const finish = () => {
    const { name, currentOdometer, startDate, startTime, endDate, endTime } = data;
    
    // Validação básica
    if (!name || !currentOdometer) return alert('Preencha os campos de Apelido e Odômetro.');
    
    // Validação de datas apenas para carro alugado
    if (type === VehicleType.RENTED && (!startDate || !endDate)) {
      return alert('Preencha as datas de início e término do contrato.');
    }

    let startDateTime: Date;
    let endDateTime: Date;

    if (type === VehicleType.RENTED) {
      const finalStartTime = startTime.trim() === '' ? '12:00' : startTime;
      const finalEndTime = endTime.trim() === '' ? '12:00' : endTime;
      startDateTime = new Date(`${startDate}T${finalStartTime}:00`);
      endDateTime = new Date(`${endDate}T${finalEndTime}:00`);
    } else {
      // Para carro próprio:
      // Início = Agora (data do cadastro). O cálculo de custo proporcional usará esta data como base.
      // Fim = Futuro distante (2099) para simular contrato vitalício/automático.
      const now = new Date();
      startDateTime = now;
      endDateTime = new Date('2099-12-31T23:59:59'); 
    }

    const finalVehicle: Vehicle = {
      id: uuidv4(),
      userId: userId,
      status: ContractStatus.ACTIVE,
      name,
      type,
      currentOdometer: parseInt(currentOdometer) || 0,
      appBalance: parseMoneyInput(appBalanceDisplay),
      profitGoal: parseMoneyInput(profitGoalDisplay),
      contractValue: parseMoneyInput(contractValueDisplay),
      carInstallment: type === VehicleType.OWNED ? parseMoneyInput(carInstallmentDisplay) : undefined,
      contractStart: startDateTime.toISOString(),
      contractEnd: endDateTime.toISOString(),
    };
    onComplete(finalVehicle);
  };

  const costLabel = type === VehicleType.RENTED ? 'Custo do Aluguel' : 'Reserva Manutenção';
  const costSubLabel = type === VehicleType.RENTED ? 'Valor total do período' : 'Manutenção, IPVA, Seguro...';
  // Ajuste do label da meta para refletir a realidade do contrato alugado
  const profitLabel = type === VehicleType.RENTED ? 'Meta Lucro (Período)' : 'Meta Lucro Mensal';

  return (
    <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white overflow-y-auto relative">
      {onCancel && (
        <button onClick={onCancel} className="absolute top-6 right-6 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
          <X size={20} />
        </button>
      )}

      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 my-8">
        <div className="text-center">
           <h1 className="text-4xl font-black italic tracking-tighter uppercase">Novo Contrato</h1>
           <p className="mt-2 text-emerald-100 font-medium">Configure seu período operacional</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-gray-800">
          {step === 1 ? (
            <div className="space-y-6 text-center">
              <h2 className="text-xl font-bold">Tipo de Operação</h2>
              <div className="grid gap-4">
                <button onClick={() => handleSetType(VehicleType.OWNED)} className="p-6 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group relative overflow-hidden">
                  <div className="flex items-center justify-between relative z-10">
                    <p className="text-lg font-extrabold text-emerald-700">🚗 Carro Próprio</p>
                    <Target size={20} className="text-emerald-300 group-hover:text-emerald-500 transition-colors"/>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium relative z-10">Custo calculado mensalmente</p>
                </button>
                <button onClick={() => handleSetType(VehicleType.RENTED)} className="p-6 rounded-2xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group relative overflow-hidden">
                  <div className="flex items-center justify-between relative z-10">
                    <p className="text-lg font-extrabold text-emerald-700">🔑 Carro Alugado</p>
                    <CalendarCheck size={20} className="text-emerald-300 group-hover:text-emerald-500 transition-colors"/>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium relative z-10">Data de início e fim definidos</p>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Apelido</label>
                  <input type="text" placeholder="Ex: Onix" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Odômetro</label>
                  <input 
                    type="tel" 
                    placeholder="0" 
                    className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors" 
                    value={data.currentOdometer} 
                    onFocus={e => handleFocus('odometer', data.currentOdometer, (v) => setData({...data, currentOdometer: v}), e)}
                    onBlur={() => handleBlur('odometer', data.currentOdometer, (v) => setData({...data, currentOdometer: v}), false)}
                    onChange={e => setData({...data, currentOdometer: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{costLabel}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">R$</span>
                    <input 
                      type="tel" 
                      className="w-full bg-gray-50 border border-gray-100 p-3 pl-8 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors" 
                      value={contractValueDisplay} 
                      onFocus={e => handleFocus('contract', contractValueDisplay, setContractValueDisplay, e)}
                      onBlur={() => handleBlur('contract', contractValueDisplay, setContractValueDisplay)}
                      onChange={e => setContractValueDisplay(formatMoneyInput(e.target.value))} 
                    />
                  </div>
                  <p className="text-[8px] text-gray-400 ml-1 truncate max-w-[120px]">{costSubLabel}</p>
                </div>
                {type === VehicleType.OWNED ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Parcela Carro</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">R$</span>
                      <input 
                        type="tel" 
                        className="w-full bg-gray-50 border border-gray-100 p-3 pl-8 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors" 
                        value={carInstallmentDisplay} 
                        onFocus={e => handleFocus('install', carInstallmentDisplay, setCarInstallmentDisplay, e)}
                        onBlur={() => handleBlur('install', carInstallmentDisplay, setCarInstallmentDisplay)}
                        onChange={e => setCarInstallmentDisplay(formatMoneyInput(e.target.value))} 
                      />
                    </div>
                    <p className="text-[8px] text-gray-400 ml-1">Se financiado (Opcional)</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{profitLabel}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">R$</span>
                      <input 
                        type="tel" 
                        className="w-full bg-gray-50 border border-gray-100 p-3 pl-8 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors" 
                        value={profitGoalDisplay} 
                        onFocus={e => handleFocus('goal', profitGoalDisplay, setProfitGoalDisplay, e)}
                        onBlur={() => handleBlur('goal', profitGoalDisplay, setProfitGoalDisplay)}
                        onChange={e => setProfitGoalDisplay(formatMoneyInput(e.target.value))} 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {type === VehicleType.OWNED && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">{profitLabel}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">R$</span>
                      <input 
                        type="tel" 
                        className="w-full bg-gray-50 border border-gray-100 p-3 pl-8 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors" 
                        value={profitGoalDisplay} 
                        onFocus={e => handleFocus('goal', profitGoalDisplay, setProfitGoalDisplay, e)}
                        onBlur={() => handleBlur('goal', profitGoalDisplay, setProfitGoalDisplay)}
                        onChange={e => setProfitGoalDisplay(formatMoneyInput(e.target.value))} 
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Saldo Atual App</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">R$</span>
                      <input 
                        type="tel" 
                        className="w-full bg-gray-50 border border-gray-100 p-3 pl-8 rounded-xl text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors" 
                        value={appBalanceDisplay} 
                        onFocus={e => handleFocus('appbal', appBalanceDisplay, setAppBalanceDisplay, e)}
                        onBlur={() => handleBlur('appbal', appBalanceDisplay, setAppBalanceDisplay)}
                        onChange={e => setAppBalanceDisplay(formatMoneyInput(e.target.value))} 
                      />
                    </div>
                </div>
              </div>

              {type === VehicleType.RENTED && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2 mb-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Início do Período</label>
                    <div className="flex gap-2">
                      <input type="date" className="flex-[2] bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold" value={data.startDate} onChange={e => setData({...data, startDate: e.target.value})} />
                      <input type="time" className="flex-1 bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold" value={data.startTime} onChange={e => setData({...data, startTime: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Término do Período</label>
                    <div className="flex gap-2">
                      <input type="date" className="flex-[2] bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold" value={data.endDate} onChange={e => setData({...data, endDate: e.target.value})} />
                      <input type="time" className="flex-1 bg-gray-50 border border-gray-100 p-3 rounded-xl text-xs font-bold" value={data.endTime} onChange={e => setData({...data, endTime: e.target.value})} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-6">
                <button onClick={() => setStep(1)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors">Voltar</button>
                <button onClick={finish} className="flex-[2] bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100 text-[10px] uppercase tracking-widest active:scale-95 transition-all">Salvar Contrato</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
