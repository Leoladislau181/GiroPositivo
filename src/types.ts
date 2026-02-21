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
  EXPENSE = 'EXPENSE',
  APP_RECHARGE = 'APP_RECHARGE'
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
  email: string;
}

export interface Vehicle {
  id?: string;
  userId: string;
  status: ContractStatus;
  type: VehicleType;
  vehicleName: string;
  vehiclePlate?: string;
  profitGoal: number;
  currentOdometer: number;
  appBalance: number; 
  contractValue: number;
  carInstallment?: number;
  contractStart: string;
  contractEnd: string;
}

export interface Journey {
  id?: string;
  userId: string;
  contractId: string;
  dataReferencia: string;
  dataInicioReal: string;
  dataFimReal?: string;
  kmInicio: number;
  kmFim?: number;
  balanceStart: number;
  balanceEnd?: number;
  encerrada: boolean;
}

export interface Entry {
  id?: string;
  userId: string;
  contractId: string;
  type: EntryType;
  category: string;
  amount: number;
  date: string;
  description: string;
  journeyId?: string; 
  isRecharge?: boolean; 
  origin?: 'automatic' | 'manual' | 'manual_recharge';
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
