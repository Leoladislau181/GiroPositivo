
import React, { useState, useMemo } from 'react';
import { Entry, EntryType, Platform, Vehicle, Journey, ContractStatus, VehicleType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { isWithinInterval, differenceInMinutes, differenceInCalendarDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { getContractCostInPeriod, formatDuration, getNowInBR, formatToBRDate, BR_TZ, subDays, startOfDay, endOfDay, parseISO } from '../utils/calculations';
import { FileText, Droplets, Tag, Gauge, Activity, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface ReportsProps {
  entries: Entry[];
  vehicle: Vehicle | null;
  journeys: Journey[];
}

export const Reports: React.FC<ReportsProps> = ({ entries, vehicle, journeys }) => {
  const [period, setPeriod] = useState<number | 'custom' | 'contract'>(30);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'ALL'>('ALL');
  
  const nowBR = useMemo(() => getNowInBR(), []);
  const [customStart, setCustomStart] = useState(formatToBRDate(subDays(nowBR, 7)));
  const [customEnd, setCustomEnd] = useState(formatToBRDate(nowBR));

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6 border border-dashed border-gray-200">
          <FileText size={48} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic">Sem Dados</h2>
        <p className="text-xs text-gray-500 mt-3 mb-8 leading-relaxed max-w-[260px] font-medium">
          Você precisa de pelo menos um contrato registrado para visualizar relatórios.
        </p>
      </div>
    );
  }

  let rangeStart: Date;
  let rangeEnd: Date;

  if (period === 'custom') {
    rangeStart = startOfDay(toZonedTime(parseISO(customStart), BR_TZ));
    rangeEnd = endOfDay(toZonedTime(parseISO(customEnd), BR_TZ));
  } else if (period === 'contract') {
    rangeStart = startOfDay(toZonedTime(parseISO(vehicle.contractStart), BR_TZ));
    
    // Se for carro alugado, queremos ver o custo TOTAL do contrato quando selecionamos o filtro "Contrato",
    // independente de estarmos no meio dele.
    if (vehicle.type === VehicleType.RENTED) {
        rangeEnd = endOfDay(toZonedTime(parseISO(vehicle.contractEnd), BR_TZ));
    } else {
        // Para carro próprio (custo mensal contínuo), mantemos a lógica de "até agora" ou "até o fim" se finalizado.
        if (vehicle.status === ContractStatus.FINISHED) {
            rangeEnd = endOfDay(toZonedTime(parseISO(vehicle.contractEnd), BR_TZ));
        } else {
            rangeEnd = endOfDay(nowBR);
        }
    }
  } else {
    rangeStart = startOfDay(subDays(nowBR, period === 1 ? 0 : period - 1));
    rangeEnd = endOfDay(nowBR);
  }

  const contractCostInPeriod = getContractCostInPeriod(vehicle, rangeStart, rangeEnd);

  // Filtragem de Entradas
  const dateFilteredEntries = entries.filter(e => {
    const dBR = toZonedTime(parseISO(e.date), BR_TZ);
    return isWithinInterval(dBR, { start: rangeStart, end: rangeEnd });
  });

  // Filtragem de Jornadas
  const filteredJourneys = journeys.filter(j => {
    const dBR = toZonedTime(parseISO(j.dataInicioReal), BR_TZ);
    return isWithinInterval(dBR, { start: rangeStart, end: rangeEnd }) && j.encerrada && j.dataFimReal;
  });

  // Cálculos Financeiros
  const revenue = dateFilteredEntries
    .filter(e => e.type === EntryType.REVENUE && (selectedPlatform === 'ALL' || e.platform === selectedPlatform))
    .reduce((s, e) => s + e.amount, 0);

  const fuel = dateFilteredEntries
    .filter(e => e.type === EntryType.FUEL)
    .reduce((s, e) => s + e.amount, 0);
  
  const appTax = dateFilteredEntries
    .filter(e => e.type === EntryType.APP_TAX && !e.isRecharge && (selectedPlatform === 'ALL' || e.platform === selectedPlatform))
    .reduce((s, e) => s + e.amount, 0);

  const variableExpenses = dateFilteredEntries
    .filter(e => e.type === EntryType.EXPENSE)
    .reduce((s, e) => s + e.amount, 0);

  // APP_RECHARGE is intentionally excluded from expenses as it is just a balance movement
  const totalExpenses = fuel + appTax + variableExpenses + contractCostInPeriod;
  const netProfit = revenue - totalExpenses;

  // Cálculos Operacionais
  const totalMinutes = filteredJourneys.reduce((sum, j) => {
    if (j.dataFimReal) {
      return sum + differenceInMinutes(parseISO(j.dataFimReal), parseISO(j.dataInicioReal));
    }
    return sum;
  }, 0);

  const totalDistance = filteredJourneys.reduce((sum, j) => {
    if (j.kmInicio && j.kmFim) {
      return sum + (j.kmFim - j.kmInicio);
    }
    return sum;
  }, 0);

  const totalLiters = useMemo(() => {
    return dateFilteredEntries
      .filter(e => e.type === EntryType.FUEL && e.pricePerLiter && e.pricePerLiter > 0)
      .reduce((sum, e) => sum + (e.amount / e.pricePerLiter!), 0);
  }, [dateFilteredEntries]);

  const totalDiscounts = useMemo(() => {
    return dateFilteredEntries.reduce((sum, e) => sum + (e.discount || 0), 0);
  }, [dateFilteredEntries]);

  // KPIs
  const totalHours = totalMinutes / 60;
  const gainPerHour = totalHours > 0 ? revenue / totalHours : 0;
  const revenuePerKm = totalDistance > 0 ? revenue / totalDistance : 0;
  const kmPerLiter = totalLiters > 0 ? totalDistance / totalLiters : 0;

  // Gráfico
  const chartData = [
    { name: 'Combustível', value: fuel, color: '#f59e0b' },
    { name: 'Taxas App', value: appTax, color: '#3b82f6' },
    { name: 'Contrato', value: contractCostInPeriod, color: '#8b5cf6' },
    { name: 'Outras', value: variableExpenses, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const platforms = ['ALL', ...Object.values(Platform)];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
        {/* Date Range Buttons */}
        <div className="flex gap-1 p-1 bg-gray-50 rounded-2xl">
          {(['Hoje', '7 dias', '30 dias', 'Contrato', 'Custom'] as const).map((label, idx) => {
            const vals: (number | 'custom' | 'contract')[] = [1, 7, 30, 'contract', 'custom'];
            const val = vals[idx];
            const isActive = period === val;
            return (
              <button
                key={label}
                onClick={() => setPeriod(val)}
                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Custom Date Inputs */}
        {period === 'custom' && (
          <div className="flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex-1 relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors" 
                />
            </div>
            <span className="text-gray-300 font-black">-</span>
            <div className="flex-1 relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-3 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-emerald-500 transition-colors" 
                />
            </div>
          </div>
        )}

        {/* Platform Scrollable List */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
           {platforms.map((p) => (
             <button
                key={p}
                onClick={() => setSelectedPlatform(p as any)}
                className={`shrink-0 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                    selectedPlatform === p 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-105' 
                    : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
                }`}
             >
                {p === 'ALL' ? 'Todas' : p}
             </button>
           ))}
        </div>
      </div>

      {/* Card Principal - Resultado */}
      <div className={`p-6 rounded-[2.5rem] shadow-xl text-white transition-all duration-500 relative overflow-hidden ${netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-500'}`}>
         <div className="relative z-10 flex justify-between items-start">
             <div>
                <p className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1">Resultado Líquido</p>
                <h3 className="text-4xl font-black tracking-tighter">{formatCurrency(netProfit)}</h3>
                <p className="text-white/60 text-[10px] font-bold mt-2">No período selecionado</p>
             </div>
             <div className="bg-white/20 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                {netProfit >= 0 ? <TrendingUp size={24} /> : <Activity size={24} />}
             </div>
         </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-32 hover:border-blue-100 transition-colors group">
           <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Gauge size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Total KM</span>
           </div>
           <div>
              <p className="text-2xl font-black text-gray-800 tracking-tight">{totalDistance.toLocaleString('pt-BR')}</p>
              <p className="text-[9px] text-gray-400 font-bold">Rodados</p>
           </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-32 hover:border-emerald-100 transition-colors group">
           <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Activity size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">Ganho / Hora</span>
           </div>
           <div>
              <p className="text-2xl font-black text-gray-800 tracking-tight">{formatCurrency(gainPerHour)}</p>
              <p className="text-[9px] text-gray-400 font-bold">{formatDuration(totalMinutes)} totais</p>
           </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-32 hover:border-amber-100 transition-colors group">
           <div className="flex items-center gap-2 text-gray-400 mb-2">
              <DollarSign size={18} className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">R$ / KM</span>
           </div>
           <div>
              <p className="text-2xl font-black text-gray-800 tracking-tight">{formatCurrency(revenuePerKm)}</p>
              <p className="text-[9px] text-gray-400 font-bold">Eficiência</p>
           </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-32 hover:border-purple-100 transition-colors group">
           <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Droplets size={18} className="text-purple-500 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest">KM / Litro</span>
           </div>
           <div>
              <p className="text-2xl font-black text-gray-800 tracking-tight">{kmPerLiter.toFixed(1)}</p>
              <p className="text-[9px] text-gray-400 font-bold">Consumo</p>
           </div>
        </div>
      </div>

      {/* Extrato Financeiro Detalhado */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Balanço do Período</h3>
        </div>
        
        <div className="p-6 space-y-5">
            <div className="flex justify-between items-center group">
                <span className="text-xs font-bold text-gray-500 group-hover:text-emerald-600 transition-colors">Receita Bruta</span>
                <span className="font-black text-emerald-600 text-lg">{formatCurrency(revenue)}</span>
            </div>

            <div className="h-px bg-gray-100 my-2"></div>
            
            <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-purple-400 ring-2 ring-purple-100"></div> Custo Contrato</span>
                    <span className="font-bold text-gray-700">{formatCurrency(contractCostInPeriod)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-100"></div> Combustível</span>
                    <span className="font-bold text-gray-700">{formatCurrency(fuel)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-100"></div> Taxas App</span>
                    <span className="font-bold text-gray-700">{formatCurrency(appTax)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-red-400 ring-2 ring-red-100"></div> Outras Despesas</span>
                    <span className="font-bold text-gray-700">{formatCurrency(variableExpenses)}</span>
                </div>
            </div>
            
            <div className="h-px bg-gray-100 my-2"></div>

            <div className="flex justify-between items-center text-xs bg-blue-50 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-blue-600">
                    <Tag size={16} />
                    <span className="font-black uppercase tracking-wide">Descontos</span>
                </div>
                <span className="font-black text-blue-700">{formatCurrency(totalDiscounts)}</span>
            </div>
        </div>

        {chartData.length > 0 && (
            <div className="bg-gray-50/30 p-6 border-t border-gray-100">
                <p className="text-[10px] text-center font-black text-gray-400 uppercase tracking-widest mb-4">Gráfico de Custos</p>
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                              data={chartData} 
                              innerRadius={60} 
                              outerRadius={80} 
                              paddingAngle={5} 
                              dataKey="value"
                              stroke="none"
                              cornerRadius={4}
                            >
                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip 
                              formatter={(v: number) => formatCurrency(v)}
                              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Legend 
                                iconSize={8}
                                iconType="circle"
                                layout="horizontal"
                                verticalAlign="bottom"
                                align="center"
                                wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '12px', textTransform: 'uppercase' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
