
import React, { useState, useRef, useMemo } from 'react';
import { Entry, Vehicle, DailyStats, Journey, ContractStatus, EntryType } from '../src/types';
import { getDailyStats, formatDuration, getContractStatus, getNowInBR, formatToBRDate, BR_TZ, parseISO } from '../utils/calculations';
import { TrendingUp, Fuel, Wallet, Calendar, Target, Play, Square, MapPin, Gauge, CheckCircle2, Clock, Smartphone, PlusCircle, TrendingDown, Tag, X, Layers, AlertCircle } from 'lucide-react';
import { format as formatTZ } from 'date-fns-tz';
import { v4 as uuidv4 } from 'uuid';
import { formatMoneyInput, parseMoneyInput } from '../utils/formatters';

interface DashboardProps {
  userId: string;
  entries: Entry[];
  vehicle: Vehicle | null;
  journeys: Journey[];
        onAddJourney: (j: Omit<Journey, 'id' | 'userId'>) => Promise<void>;
  onUpdateJourney: (j: Journey) => Promise<void>;
  onDeleteJourney: (id: string) => Promise<void>;
  onSetupContract: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userId, entries, vehicle, journeys, onUpdateJourney, onDeleteJourney, onSetupContract }) => {
  const [showJourneyModal, setShowJourneyModal] = useState<'START' | 'END' | 'HISTORY' | null>(null);
  const [showFirstJourneyAlert, setShowFirstJourneyAlert] = useState(false);
  const [showFirstEndJourneyAlert, setShowFirstEndJourneyAlert] = useState(false);
  const [kmInput, setKmInput] = useState<string>('');
  const [balanceInput, setBalanceInput] = useState<string>('');
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

  const today = useMemo(() => getNowInBR(), []);
  const todayStrBR = useMemo(() => formatToBRDate(today), [today]);
  
  const todayActivities = useMemo(() => {
    return entries
      .filter(e => formatToBRDate(e.date) === todayStrBR)
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [entries, todayStrBR]);

  // Lógica de Agrupamento
  const groupedActivities = useMemo(() => {
    const groups: Record<string, { total: number, type: EntryType, count: number, isRecharge: boolean, origin?: string, displayCategory: string }> = {};
    
    todayActivities.forEach(e => {
      let key = e.category;
      let displayCategory = e.category;

      if (e.type === EntryType.APP_RECHARGE) {
        key = 'recharge_group';
        displayCategory = 'Saldo do App';
      } else if (e.origin === 'automatic') {
        key = 'automatic_group';
        displayCategory = 'Saldo Utilizado';
      }

      if (!groups[key]) {
        groups[key] = { 
          total: 0, 
          type: e.type, 
          count: 0,
          isRecharge: e.type === EntryType.APP_RECHARGE,
          origin: e.origin,
          displayCategory
        };
      }
      groups[key].total += e.amount;
      groups[key].count += 1;
    });

    return Object.values(groups)
      .sort((a, b) => b.total - a.total);
  }, [todayActivities]);

  const todayDiscounts = useMemo(() => {
    return todayActivities.reduce((sum, e) => sum + (e.discount || 0), 0);
  }, [todayActivities]);

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-6 shadow-inner border border-emerald-100">
          <Calendar size={48} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic">Sem Contrato Ativo</h2>
        <p className="text-xs text-gray-500 mt-3 mb-8 leading-relaxed max-w-[260px] font-medium">
          Para começar a registrar seu lucro e controlar seus custos, você precisa configurar um novo contrato.
        </p>
        <button 
          onClick={onSetupContract} 
          className="bg-emerald-600 text-white px-8 py-5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-200 flex items-center gap-3 active:scale-95 transition-all hover:bg-emerald-700"
        >
          <PlusCircle size={18} /> Configurar Agora
        </button>
      </div>
    );
  }

  const stats = getDailyStats(today, entries, vehicle, journeys);

  let statusColor = 'bg-red-500';
  let badgeColor = 'bg-red-100 text-red-700 border-red-200';
  let badgeText = 'NO VERMELHO';

  if (stats.netProfit >= stats.profitGoal) {
    statusColor = 'bg-emerald-600';
    badgeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
    badgeText = 'META BATIDA';
  } else if (stats.netProfit >= 0) {
    statusColor = 'bg-amber-500';
    badgeColor = 'bg-amber-100 text-amber-700 border-amber-200';
    badgeText = 'NO AZUL';
  }

  const activeJourney = journeys.find(j => !j.encerrada);
  const todayJourneys = journeys.filter(j => j.dataReferencia === todayStrBR);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleStartJourney = () => {
    const parsedKm = parseInt(kmInput, 10);
    const finalKm = !isNaN(parsedKm) ? parsedKm : (vehicle.currentOdometer || 0);
    
    // Check if this is the first journey for the active contract
    const hasPriorJourneys = journeys.some(j => 
        parseISO(j.dataInicioReal) >= parseISO(vehicle.contractStart)
    );

                const newJourney: Omit<Journey, 'id' | 'userId'> = {
      contractId: vehicle.id, // Vínculo com o contrato ativo
      dataReferencia: todayStrBR,
      dataInicioReal: new Date().toISOString(), 
      kmInicio: finalKm,
      balanceStart: vehicle.appBalance || 0,
      encerrada: false
    };
    
    onAddJourney(newJourney);
    setShowJourneyModal(null);
    setKmInput('');

    if (!hasPriorJourneys) {
        setShowFirstJourneyAlert(true);
    }
  };

  const handleEndJourney = () => {
    if (!activeJourney) return;
    const finalKm = parseInt(kmInput, 10);
    const finalBalance = parseMoneyInput(balanceInput);

    if (isNaN(finalKm) || finalKm < activeJourney.kmInicio) {
        alert('O KM final deve ser maior ou igual ao inicial.');
        return;
    }

    const closedJourney: Journey = {
      ...activeJourney,
      dataFimReal: new Date().toISOString(), 
      kmFim: finalKm,
      balanceEnd: finalBalance,
      encerrada: true
    };
    onUpdateJourney(closedJourney);
    setShowJourneyModal(null);
  };

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { 
    timeZone: 'America/Sao_Paulo', 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  }).format(today).split(' ').map(word => {
    if (word.toLowerCase() === 'de') return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');

  const getEntryIcon = (type: EntryType) => {
    switch(type) {
      case EntryType.REVENUE: return <TrendingUp className="text-emerald-500" size={16} />;
      case EntryType.FUEL: return <Fuel className="text-amber-500" size={16} />;
      case EntryType.APP_TAX: return <Smartphone className="text-blue-500" size={16} />;
      case EntryType.APP_RECHARGE: return <Smartphone className="text-emerald-500" size={16} />;
      default: return <TrendingDown className="text-red-500" size={16} />;
    }
  };

  const totalDailyOperationalCost = stats.rentalCost + stats.appTaxCost + stats.expenses;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Date Header & Status Badge */}
      <div className="flex justify-between items-end px-2">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Visão Geral</p>
          <p className="text-gray-800 font-extrabold text-lg leading-none tracking-tight">
            {formattedDate}
          </p>
        </div>
        <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${badgeColor}`}>
          {badgeText}
        </div>
      </div>

      {/* Main Status Card */}
      <div className={`p-6 rounded-[2.5rem] shadow-xl text-white transition-all duration-500 relative overflow-hidden ${statusColor}`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4">
           {stats.netProfit >= 0 ? <TrendingUp size={120} /> : <TrendingDown size={120} />}
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest mb-1">Faturamento Bruto</p>
              <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(stats.revenue)}</h3>
            </div>
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm border border-white/10">
               <TrendingUp size={24} />
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/20 flex justify-between items-end">
              <div className="flex flex-col">
                  <span className="text-[10px] text-white/70 uppercase font-bold tracking-widest mb-1">Resultado Líquido</span>
                  <span className="text-2xl font-black tracking-tight">{formatCurrency(stats.netProfit)}</span>
              </div>
              <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] text-white/70 uppercase font-bold tracking-widest mb-1">Meta Diária</span>
                  <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-lg">
                      <Target size={12} className="text-white/90" />
                      <span className="text-sm font-bold">{formatCurrency(stats.profitGoal)}</span>
                  </div>
              </div>
          </div>
        </div>
      </div>

      {/* Journey Action Card */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
        {activeJourney ? (
          <div className="p-5 flex items-center justify-between bg-blue-50/50 border-b border-blue-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 animate-pulse border border-blue-200">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1.5">Em Movimento</p>
                <p className="text-base font-black text-gray-800 tracking-tight">{activeJourney.kmInicio} KM • {formatTZ(parseISO(activeJourney.dataInicioReal), 'HH:mm', { timeZone: BR_TZ })}</p>
              </div>
            </div>
            <button 
              onClick={() => { 
                setKmInput(vehicle.currentOdometer?.toString() || ''); 
                setBalanceInput(formatMoneyInput(((vehicle.appBalance || 0) * 100).toString())); 
                setShowJourneyModal('END'); 
                
                const hasCompletedJourneys = journeys.some(j => 
                  j.encerrada && 
                  parseISO(j.dataInicioReal) >= parseISO(vehicle.contractStart)
                );
                
                if (!hasCompletedJourneys) {
                  setShowFirstEndJourneyAlert(true);
                }
              }}
              className="px-5 py-3 bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center gap-2 hover:bg-red-600"
            >
              <Square size={12} fill="white" /> Encerrar
            </button>
          </div>
        ) : (
          <div className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${todayJourneys.length > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                {todayJourneys.length > 0 ? <CheckCircle2 size={24} /> : <Play size={24} className="ml-1" />}
              </div>
              <div>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${todayJourneys.length > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {todayJourneys.length > 0 ? 'Turno Finalizado' : 'Iniciar Turno'}
                </p>
                <p className="text-base font-black text-gray-800 tracking-tight">
                    {todayJourneys.length > 0 ? `${stats.journeyDistance} KM • ${formatDuration(stats.journeyTimeMinutes)}` : 'Começar dia'}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                let suggested = vehicle.currentOdometer || 0;
                try {
                  const sortedJourneys = [...journeys]
                    .filter(j => j.encerrada && j.kmFim !== undefined && !isNaN(parseISO(j.dataInicioReal).getTime()))
                    .sort((a,b) => parseISO(b.dataInicioReal).getTime() - parseISO(a.dataInicioReal).getTime());
                  if (sortedJourneys.length > 0) suggested = sortedJourneys[0].kmFim!;
                } catch(e) {}
                
                setKmInput(suggested.toString());
                setShowJourneyModal('START');
              }}
              className="px-5 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-200 active:scale-95 transition-all flex items-center gap-2 hover:bg-emerald-700"
            >
              <Play size={12} fill="white" /> Iniciar
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-32 hover:border-emerald-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Gauge size={20} />
              </div>
              <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Distância</p>
                  <p className="text-xl font-black text-gray-800 tracking-tight">{stats.journeyDistance} <span className="text-xs font-bold text-gray-400">KM</span></p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-32 hover:border-blue-100 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Clock size={20} />
              </div>
              <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Tempo Online</p>
                  <p className="text-xl font-black text-gray-800 tracking-tight">{formatDuration(stats.journeyTimeMinutes)}</p>
              </div>
          </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalhamento de Custos</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm group">
            <div className="flex items-center gap-4 text-gray-600 font-bold group-hover:text-purple-600 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                 <Wallet size={16} />
              </div>
              <span>Operacional</span>
            </div>
            <span className="font-black text-gray-800">{formatCurrency(totalDailyOperationalCost)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm group">
            <div className="flex items-center gap-4 text-gray-600 font-bold group-hover:text-amber-600 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                 <Fuel size={16} />
              </div>
              <span>Combustível</span>
            </div>
            <span className="font-black text-gray-800">{formatCurrency(stats.fuelCost)}</span>
          </div>

          {todayDiscounts > 0 && (
            <div className="flex items-center justify-between text-sm animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-4 text-emerald-600 font-bold">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                   <Tag size={16} />
                </div>
                <span>Descontos</span>
              </div>
              <span className="font-black text-emerald-600">-{formatCurrency(todayDiscounts)}</span>
            </div>
          )}

          <div className="pt-4 mt-2 border-t border-gray-50">
            <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${vehicle.appBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                        <Smartphone size={18} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Saldo no App</p>
                        <p className={`text-sm font-black ${vehicle.appBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {vehicle.appBalance >= 0 ? 'Disponível' : 'Negativo'}
                        </p>
                    </div>
                </div>
                <span className={`text-lg font-black tracking-tight ${vehicle.appBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {formatCurrency(vehicle.appBalance)}
                </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 overflow-hidden mb-24">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
             <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Movimentações</h4>
          </div>
          <span className="text-[9px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg font-black tracking-wide">{todayActivities.length} HOJE</span>
        </div>

        <div className="space-y-3">
          {groupedActivities.length === 0 ? (
            <div className="py-12 px-6 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
               <p className="text-sm font-bold text-gray-400 italic">
                 Nenhuma atividade registrada hoje.
               </p>
            </div>
          ) : (
            groupedActivities.map((group, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors group cursor-default">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm border border-gray-100 bg-white group-hover:scale-110 transition-transform duration-300`}>
                    {getEntryIcon(group.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{group.displayCategory}</p>
                      {group.origin === 'automatic' && <span className="text-[7px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">AUTO</span>}
                      {group.isRecharge && <span className="text-[7px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">RECARGA</span>}
                    </div>
                    {group.count > 1 ? (
                      <p className="text-[9px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                        <Layers size={10} /> {group.count} REGISTROS
                      </p>
                    ) : (
                      <p className="text-[9px] text-gray-400 font-bold mt-0.5">LANÇAMENTO ÚNICO</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black tracking-tight ${
                    group.type === EntryType.REVENUE ? 'text-emerald-600' : 
                    group.isRecharge ? 'text-blue-600' : 'text-red-500'
                  }`}>
                    {group.type === EntryType.REVENUE ? '+' : ''}{formatCurrency(group.total)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Jornada */}
      {showJourneyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-sm" onClick={() => setShowJourneyModal(null)} />
          <div className="relative bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowJourneyModal(null)} className="absolute top-6 right-6 p-2 text-gray-300 hover:text-gray-600 transition-colors bg-gray-50 rounded-full"><X size={18}/></button>
            
            <div className="text-center mb-8">
              <div className={`mx-auto w-20 h-20 rounded-[2rem] flex items-center justify-center mb-4 shadow-lg rotate-3 ${showJourneyModal === 'START' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-red-500 text-white shadow-red-200'}`}>
                {showJourneyModal === 'START' ? <Play size={36} className="ml-1" /> : <Square size={32} />}
              </div>
              <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">
                {showJourneyModal === 'START' ? 'Iniciar Turno' : 'Encerrar Turno'}
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                {showJourneyModal === 'START' ? 'Sincronize o odômetro' : 'Fechamento de caixa'}
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Odômetro (KM)</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                    <Gauge size={20} />
                  </div>
                  <input 
                    autoFocus
                    type="tel" 
                    value={kmInput}
                    onFocus={e => handleFocus('km', kmInput, setKmInput, e)}
                    onBlur={() => handleBlur('km', kmInput, setKmInput, false)}
                    onChange={e => setKmInput(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl text-xl font-black text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                  />
                </div>
              </div>

              {showJourneyModal === 'END' && (
                <div className="space-y-2 animate-in slide-in-from-bottom-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Saldo Final App</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black group-focus-within:text-emerald-500 transition-colors">R$</span>
                    <input 
                      type="tel" 
                      value={balanceInput}
                      onFocus={e => handleFocus('bal', balanceInput, setBalanceInput, e)}
                      onBlur={() => handleBlur('bal', balanceInput, setBalanceInput)}
                      onChange={e => setBalanceInput(formatMoneyInput(e.target.value))}
                      className="w-full bg-gray-50 border-2 border-gray-100 p-4 pl-12 rounded-2xl text-xl font-black text-gray-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all" 
                    />
                  </div>
                </div>
              )}

              <button 
                onClick={showJourneyModal === 'START' ? handleStartJourney : handleEndJourney}
                className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 hover:shadow-2xl mt-4 ${showJourneyModal === 'START' ? 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700' : 'bg-red-500 text-white shadow-red-200 hover:bg-red-600'}`}
              >
                {showJourneyModal === 'START' ? 'Confirmar Início' : 'Confirmar Encerramento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First Journey Alert Modal */}
      {showFirstJourneyAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFirstJourneyAlert(false)} />
          <div className="relative bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-6 shadow-lg shadow-blue-100">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-3">Atenção</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-8">
              Se utiliza uma plataforma que precise de créditos para trabalhar, faça um lançamento de "Despesa" com a categoria "Taxa (Recarga)".
            </p>
            <button 
              onClick={() => setShowFirstJourneyAlert(false)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all hover:bg-blue-700"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* First End Journey Alert Modal */}
      {showFirstEndJourneyAlert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFirstEndJourneyAlert(false)} />
          <div className="relative bg-white w-full max-w-xs rounded-[2rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight mb-3">Dica Importante</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-8">
              Adicione o Valor Atual de Crédito e nós faremos o cálculo de quanto foi gasto em sua Jornada.
            </p>
            <button 
              onClick={() => setShowFirstEndJourneyAlert(false)}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-200 active:scale-95 transition-all hover:bg-emerald-700"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
