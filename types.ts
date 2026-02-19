
export enum VehicleType {
  RENTED = 'RENTED',
  OWNED = 'OWNED'
}

export enum ContractStatus {
  FUTURE = 'Futuro',
  ACTIVE = 'Ativo',
  FINISHED = 'Finalizado'
}

export enum EntryType {
  REVENUE = 'REVENUE',
  FUEL = 'FUEL',
  APP_TAX = 'APP_TAX',
  EXPENSE = 'EXPENSE'
}

export enum Platform {
  UBER = 'Uber',
  P99 = '99',
  INDRIVE = 'inDrive',
  PARTICULAR = 'Particular',
  OUTRO = 'Outro'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  userId: string;
  status: ContractStatus;
  type: VehicleType;
  name: string;
  profitGoal: number;
  currentOdometer: number;
  appBalance: number; 
  contractValue: number; // Reserva Manutenção (Próprio) ou Aluguel (Alugado)
  carInstallment?: number; // Parcela do Financiamento (Apenas Próprio)
  contractStart: string; // ISO Datetime
  contractEnd: string;   // ISO Datetime
}

export interface Journey {
  id: string;
  userId: string;
  dataReferencia: string; // YYYY-MM-DD
  dataInicioReal: string; // ISO Datetime
  dataFimReal?: string;   // ISO Datetime
  kmInicio: number;
  kmFim?: number;
  balanceStart: number;   
  balanceEnd?: number;    
  encerrada: boolean;
}

export interface Entry {
  id: string;
  userId: string;
  type: EntryType;
  category: string;
  amount: number;
  date: string;
  description: string;
  platform?: Platform;
  journeyId?: string; 
  isRecharge?: boolean; 
  origin?: 'automatic' | 'manual' | 'manual_recharge';
  kmRecorded?: number;
  pricePerLiter?: number;
  discount?: number;
  balanceBefore?: number;
  balanceAfter?: number;
}

export interface DailyStats {
  revenue: number;
  expenses: number;
  fuelCost: number;
  fuelCostPerKm: number;
  appTaxCost: number;
  rentalCost: number;
  appBalance: number; 
  netProfit: number;
  profitGoal: number;
  journeyDistance: number;
  journeyTimeMinutes: number;
  estimatedDailyContractCost: number;
}
