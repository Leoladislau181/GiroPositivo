import { Vehicle, Entry, Journey, ContractStatus, VehicleType } from '../src/types';
import { 
  differenceInMinutes, 
  isBefore, 
  isAfter, 
  differenceInCalendarDays,
  getDaysInMonth,
  eachDayOfInterval
} from 'date-fns';
import { toZonedTime, format as formatTZ } from 'date-fns-tz';

export const BR_TZ = 'America/Sao_Paulo';

// Polyfills for missing date-fns exports
export const parseISO = (str: string) => new Date(str);
export const max = (dates: Date[]) => new Date(Math.max(...dates.map(d => d.getTime())));
export const min = (dates: Date[]) => new Date(Math.min(...dates.map(d => d.getTime())));
export const startOfDay = (d: Date) => { const n = new Date(d); n.setHours(0,0,0,0); return n; };
export const endOfDay = (d: Date) => { const n = new Date(d); n.setHours(23,59,59,999); return n; };
export const subDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() - n); return r; };

/**
 * Retorna o momento atual ajustado para o fuso de Brasília.
 */
export const getNowInBR = (): Date => {
  return toZonedTime(new Date(), BR_TZ);
};

/**
 * Formata uma data para o padrão YYYY-MM-DD no fuso de Brasília.
 */
export const formatToBRDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatTZ(toZonedTime(d, BR_TZ), 'yyyy-MM-dd', { timeZone: BR_TZ });
};

export const getContractDurationMinutes = (vehicle: Vehicle): number => {
  try {
    const start = parseISO(vehicle.contractStart);
    const end = parseISO(vehicle.contractEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    // Evita divisão por zero retornando pelo menos 1 minuto
    return Math.max(differenceInMinutes(end, start), 1);
  } catch (e) {
    return 1;
  }
};

export const getContractDurationHours = (vehicle: Vehicle): number => {
  return getContractDurationMinutes(vehicle) / 60;
};

export const getContractStatus = (vehicle: Vehicle): ContractStatus => {
  if (vehicle.status === ContractStatus.FINISHED) return ContractStatus.FINISHED;
  
  try {
    const now = new Date();
    const start = parseISO(vehicle.contractStart);
    const end = parseISO(vehicle.contractEnd);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return ContractStatus.ACTIVE;

    if (isBefore(now, start)) return ContractStatus.FUTURE;
    if (isAfter(now, end)) return ContractStatus.FINISHED;
  } catch (e) {}
  
  return ContractStatus.ACTIVE;
};

/**
 * Calcula o custo do contrato proporcional ao período selecionado.
 * Suporta lógica diferente para Carro Alugado (Total Período) e Carro Próprio (Mensalidade + Parcela / Dias do Mês).
 */
export const getContractCostInPeriod = (vehicle: Vehicle, rangeStart: Date, rangeEnd: Date): number => {
  try {
    const contractStart = parseISO(vehicle.contractStart);
    const contractEnd = parseISO(vehicle.contractEnd);
    
    if (isNaN(contractStart.getTime()) || isNaN(contractEnd.getTime())) return 0;
    
    // Determina a interseção entre o período do relatório e a vigência do contrato
    const actualStart = max([rangeStart, contractStart]);
    const actualEnd = min([rangeEnd, contractEnd]);
    
    // Se não houver sobreposição válida (início após fim)
    if (isAfter(actualStart, actualEnd)) return 0;

    // LÓGICA PARA CARRO PRÓPRIO (Reserva de Manutenção Mensal + Parcela do Carro)
    if (vehicle.type === VehicleType.OWNED) {
      let totalCost = 0;
      
      // Soma a Reserva de Manutenção com a Parcela do Carro (se existir)
      const monthlyTotal = vehicle.contractValue + (vehicle.carInstallment || 0);
      
      // Itera por cada dia do período de sobreposição para calcular o custo exato daquele dia
      // baseando-se na quantidade de dias do mês daquele dia específico.
      const days = eachDayOfInterval({ start: actualStart, end: actualEnd });
      
      days.forEach(day => {
        const daysInCurrentMonth = getDaysInMonth(day);
        const dailyCost = monthlyTotal / daysInCurrentMonth;
        totalCost += dailyCost;
      });

      return totalCost;
    }

    // LÓGICA PARA CARRO ALUGADO (Valor fixo pelo período total do contrato)
    const overlapMinutes = differenceInMinutes(actualEnd, actualStart);
    const totalContractMinutes = getContractDurationMinutes(vehicle);
    
    if (overlapMinutes <= 0) return 0;

    // Custo = (Minutos Sobrepostos / Total Minutos Contrato) * Valor Total Contrato
    const ratio = overlapMinutes / totalContractMinutes;
    return vehicle.contractValue * ratio;

  } catch (e) {
    console.error("Erro no cálculo de custo:", e);
    return 0;
  }
};

export const getDailyStats = (date: Date, entries: Entry[], vehicle: Vehicle, journeys: Journey[]): DailyStats => {
  const dateStrBR = formatToBRDate(date);
  
  // Define o início e fim do dia para cálculo preciso do custo proporcional
  const dayStart = startOfDay(toZonedTime(date, BR_TZ));
  const dayEnd = endOfDay(toZonedTime(date, BR_TZ));

  const dayEntries = entries.filter(e => formatToBRDate(e.date) === dateStrBR);
  
  const revenue = dayEntries.filter(e => e.type === EntryType.REVENUE).reduce((sum, e) => sum + e.amount, 0);
  // Explicitly exclude APP_RECHARGE from expenses
  const expenses = dayEntries.filter(e => e.type === EntryType.EXPENSE).reduce((sum, e) => sum + e.amount, 0);
  const fuelCost = dayEntries.filter(e => e.type === EntryType.FUEL).reduce((sum, e) => sum + e.amount, 0);
  const appTaxCost = dayEntries.filter(e => e.type === EntryType.APP_TAX && !e.isRecharge).reduce((sum, e) => sum + e.amount, 0);

  const dayJourneys = journeys.filter(j => j.dataReferencia === dateStrBR);
  const journeyDistance = dayJourneys.reduce((sum, j) => (j.encerrada && j.kmFim !== undefined) ? sum + (j.kmFim - j.kmInicio) : sum, 0);
  const journeyTimeMinutes = dayJourneys.reduce((sum, j) => (j.encerrada && j.dataFimReal) ? sum + differenceInMinutes(parseISO(j.dataFimReal), parseISO(j.dataInicioReal)) : sum, 0);

  // Custo de aluguel/manutenção calculado proporcionalmente para este dia específico
  const rentalCost = getContractCostInPeriod(vehicle, dayStart, dayEnd);
  
  const netProfit = revenue - (rentalCost + fuelCost + appTaxCost + expenses);
  
  // Meta diária
  let dailyProfitGoal = 0;
  if (vehicle.type === VehicleType.OWNED) {
    // Para carro próprio, a meta diária é baseada nos dias do mês atual
    const daysInCurrentMonth = getDaysInMonth(date);
    dailyProfitGoal = (vehicle.profitGoal || 0) / daysInCurrentMonth;
  } else {
    // Para alugado, divide pelo total de dias do contrato
    const totalDays = Math.max(differenceInCalendarDays(parseISO(vehicle.contractEnd), parseISO(vehicle.contractStart)), 1);
    dailyProfitGoal = (vehicle.profitGoal || 0) / totalDays;
  }

  return {
    revenue,
    expenses,
    fuelCost,
    fuelCostPerKm: journeyDistance > 0 ? fuelCost / journeyDistance : 0,
    appTaxCost,
    rentalCost,
    appBalance: vehicle.appBalance || 0,
    netProfit,
    profitGoal: dailyProfitGoal,
    journeyDistance,
    journeyTimeMinutes,
    estimatedDailyContractCost: rentalCost
  };
};

export const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}h ${m}m`;
};