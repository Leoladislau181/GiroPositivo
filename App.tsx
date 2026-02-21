
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Records } from './components/Records';
import { AddEntry } from './components/AddEntry';
import { Reports } from './components/Reports';
import { Menu } from './components/Menu';
import { VehicleSetup } from './components/VehicleSetup';
import { ConfirmModal } from './components/ConfirmModal';
import { Auth } from './components/Auth';
import { authService } from './utils/auth';
import { Vehicle, Entry, User, Journey, EntryType, ContractStatus } from './types';
import { getContractStatus, parseISO } from './utils/calculations';
import { isWithinInterval } from 'date-fns';

interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  isDestructive?: boolean;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  
  const [allContracts, setAllContracts] = useState<Vehicle[]>([]);
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [allJourneys, setAllJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const userContracts = useMemo(() => 
    currentUser ? allContracts.filter(c => c.userId === currentUser.id) : [], 
  [allContracts, currentUser]);

  const userEntries = useMemo(() => 
    currentUser ? allEntries.filter(e => e.userId === currentUser.id) : [], 
  [allEntries, currentUser]);

  const userJourneys = useMemo(() => 
    currentUser ? allJourneys.filter(j => j.userId === currentUser.id) : [], 
  [allJourneys, currentUser]);

  // Fail-safe: Detecta se existe alguma jornada não encerrada
  const activeJourney = useMemo(() => userJourneys.find(j => !j.encerrada), [userJourneys]);

  const activeContract = useMemo(() => {
    // 1. Tenta encontrar um contrato estritamente ativo ou futuro
    const active = userContracts.find(c => {
      const status = getContractStatus(c);
      return status === ContractStatus.ACTIVE || status === ContractStatus.FUTURE;
    });

    return active || undefined;
  }, [userContracts]);

  // Migration Effect: Backfill contractId for existing records
  useEffect(() => {
    if (isLoading || !currentUser || allContracts.length === 0) return;

    let hasChanges = false;
    
    // Sort contracts by date to ensure correct assignment
    const sortedContracts = [...allContracts].sort((a, b) => 
      new Date(a.contractStart).getTime() - new Date(b.contractStart).getTime()
    );

    const newEntries = allEntries.map(e => {
      if (e.contractId) return e;
      
      // Find matching contract
      const contract = sortedContracts.find(c => {
        const start = c.contractStart;
        const end = c.status === ContractStatus.FINISHED ? c.contractEnd : '2099-12-31';
        return e.date >= start && e.date <= end;
      });

      if (contract) {
        hasChanges = true;
        return { ...e, contractId: contract.id };
      }
      return e;
    });

    const newJourneys = allJourneys.map(j => {
      if (j.contractId) return j;

      const contract = sortedContracts.find(c => {
        const start = c.contractStart;
        const end = c.status === ContractStatus.FINISHED ? c.contractEnd : '2099-12-31';
        return j.dataInicioReal >= start && (j.dataFimReal ? j.dataFimReal <= end : true);
      });

      if (contract) {
        hasChanges = true;
        return { ...j, contractId: contract.id };
      }
      return j;
    });

    if (hasChanges) {
      console.log("Migrating data to include contractId...");
      setAllEntries(newEntries);
      setAllJourneys(newJourneys);
      localStorage.setItem('gp_entries', JSON.stringify(newEntries));
      localStorage.setItem('gp_journeys', JSON.stringify(newJourneys));
    }
  }, [isLoading, currentUser, allContracts, allEntries, allJourneys]);

  const activeContractEntries = useMemo(() => {
    if (!activeContract) return [];
    // Filter strictly by contractId
    return userEntries.filter(e => e.contractId === activeContract.id);
  }, [userEntries, activeContract]);

  const activeContractJourneys = useMemo(() => {
    if (!activeContract) return [];
    // Filter strictly by contractId
    return userJourneys.filter(j => j.contractId === activeContract.id);
  }, [userJourneys, activeContract]);

  const currentAppBalance = useMemo(() => {
    if (!currentUser || !activeContract) return 0;
    const recharges = activeContractEntries
      .filter(e => e.type === EntryType.APP_RECHARGE)
      .reduce((sum, e) => sum + e.amount, 0);
    const spentFees = activeContractEntries
      .filter(e => e.type === EntryType.APP_TAX && !e.isRecharge)
      .reduce((sum, e) => sum + e.amount, 0);
    return recharges - spentFees;
  }, [activeContractEntries, currentUser, activeContract]);

  useEffect(() => {
    const initApp = async () => {
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      
      try {
        const savedContracts = localStorage.getItem('gp_contracts');
        const savedEntries = localStorage.getItem('gp_entries');
        const savedJourneys = localStorage.getItem('gp_journeys');
        
        if (savedContracts) setAllContracts(JSON.parse(savedContracts));
        if (savedEntries) setAllEntries(JSON.parse(savedEntries));
        if (savedJourneys) setAllJourneys(JSON.parse(savedJourneys));
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const syncData = useCallback((type: 'contracts' | 'entries' | 'journeys', data: any[]) => {
    if (!currentUser) return;
    
    if (type === 'contracts') {
      setAllContracts(prev => {
        const otherUsers = prev.filter(c => c.userId !== currentUser.id);
        const newAll = [...otherUsers, ...data];
        localStorage.setItem('gp_contracts', JSON.stringify(newAll));
        return newAll;
      });
    } else if (type === 'entries') {
      setAllEntries(prev => {
        const otherUsers = prev.filter(e => e.userId !== currentUser.id);
        const newAll = [...otherUsers, ...data];
        localStorage.setItem('gp_entries', JSON.stringify(newAll));
        return newAll;
      });
    } else if (type === 'journeys') {
      setAllJourneys(prev => {
        const otherUsers = prev.filter(j => j.userId !== currentUser.id);
        const newAll = [...otherUsers, ...data];
        localStorage.setItem('gp_journeys', JSON.stringify(newAll));
        return newAll;
      });
    }
  }, [currentUser]);

  const handleAddEntry = (entry: Entry) => {
    if (!currentUser) return;
    
    if (!activeContract) {
      alert("Não existe contrato ativo.");
      return;
    }

    // Explicitly find active journey again to be safe
    const currentActiveJourney = userJourneys.find(j => !j.encerrada && j.contractId === activeContract.id);

    // Ensure contractId is set
    // Also link to active journey if exists (crucial for recharge calculation)
    // If it is a recharge, we MUST link it to the active journey if one exists
    let journeyId = entry.journeyId;
    if (entry.type === EntryType.APP_RECHARGE && currentActiveJourney) {
        journeyId = currentActiveJourney.id;
    } else if (currentActiveJourney) {
        // For other entries, we also link to active journey if available, as a general rule
        journeyId = currentActiveJourney.id;
    }

    const entryWithContract = { 
        ...entry, 
        contractId: activeContract.id,
        journeyId: journeyId
    };

    const newEntries = [entryWithContract, ...userEntries.filter(e => e.id !== entry.id)];
    syncData('entries', newEntries);

    setEditingEntry(null);
    setActiveTab(entry.isRecharge ? 'home' : 'records');
  };

  const handleUpdateJourney = (journey: Journey) => {
    if (!currentUser) return;
    
    if (!activeContract) {
      alert("Não existe contrato ativo.");
      return;
    }

    // Ensure contractId is set
    const journeyWithContract = { ...journey, contractId: activeContract.id };

    const newJourneys = [journeyWithContract, ...userJourneys.filter(j => j.id !== journey.id)];
    syncData('journeys', newJourneys);
    
    if (journey.encerrada) {
      // Calculate recharges within this specific journey's timeframe AND contract
      // Now using type 'APP_RECHARGE' as the definitive identifier for recharges
      // AND checking for explicit journey linkage OR time interval as fallback
      const rechargesInJourney = userEntries
        .filter(e => 
          e.contractId === activeContract.id && // Must belong to same contract
          e.type === EntryType.APP_RECHARGE && // Identify by type
          (
            e.journeyId === journey.id || // Explicit link (preferred)
            isWithinInterval(parseISO(e.date), { // Fallback for legacy/unlinked
                start: parseISO(journey.dataInicioReal), 
                end: parseISO(journey.dataFimReal || new Date().toISOString()) 
            })
          )
        )
        .reduce((sum, e) => sum + e.amount, 0);

      const bStart = Number(journey.balanceStart) || 0;
      const bEnd = Number(journey.balanceEnd) || 0;
      
      // Calculation: (Start + Recharges) - End
      const totalAvailable = bStart + rechargesInJourney;
      const tax = totalAvailable - bEnd;

      if (tax > 0) {
        const autoEntry: Entry = {
          id: `tax-auto-${journey.id}`,
          userId: currentUser.id,
          contractId: activeContract.id, // Link to active contract
          type: EntryType.APP_TAX,
          category: 'Taxa de Aplicativo',
          amount: tax,
          // IMPORTANTE: A data da taxa deve ser o FIM da jornada para consistência contábil no dia correto
          date: journey.dataFimReal || journey.dataInicioReal, 
          description: `Consumo automático (Km: ${journey.kmInicio} - ${journey.kmFim})`,
          journeyId: journey.id,
          isRecharge: false,
          origin: 'automatic'
        };
        // FIX: Only remove previous AUTOMATIC entries for this journey, preserving recharges (manual_recharge)
        const updatedEntries = [autoEntry, ...userEntries.filter(e => !(e.journeyId === journey.id && e.origin === 'automatic'))];
        syncData('entries', updatedEntries);
      } else {
        // If tax is <= 0, remove any existing automatic tax for this journey, but keep recharges
        syncData('entries', userEntries.filter(e => !(e.journeyId === journey.id && e.origin === 'automatic')));
      }

      const updatedContracts = userContracts.map(c => {
        if (c.id !== activeContract.id) return c;
        return { 
          ...c, 
          currentOdometer: journey.kmFim || c.currentOdometer,
          appBalance: bEnd
        };
      });
      syncData('contracts', updatedContracts);
    }
  };

  const handleDeleteJourney = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Jornada',
      message: 'Ao excluir esta jornada, a taxa automática de aplicativo vinculada também será removida. Deseja continuar?',
      confirmLabel: 'Excluir',
      isDestructive: true,
      onConfirm: () => {
        syncData('journeys', userJourneys.filter(j => j.id !== id));
        syncData('entries', userEntries.filter(e => e.journeyId !== id));
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleCloseContract = () => {
    if (!activeContract) return;

    setConfirmConfig({
      isOpen: true,
      title: 'Encerrar Contrato',
      message: 'Ao encerrar o Contrato Você terá acesso as informações do contrato mas Não podera edita-los.',
      confirmLabel: 'Encerrar Agora',
      isDestructive: true,
      onConfirm: () => {
        const now = new Date();
        const updatedContract: Vehicle = {
          ...activeContract,
          status: ContractStatus.FINISHED,
          contractEnd: now.toISOString() // Atualiza a data final para o momento do encerramento
        };
        
        // 1. Encerrar jornada ativa vinculada ao contrato, se houver
        const activeJourney = userJourneys.find(j => !j.encerrada && j.contractId === activeContract.id);
        let updatedJourneys = userJourneys;
        
        if (activeJourney) {
            const closedJourney: Journey = {
                ...activeJourney,
                encerrada: true,
                dataFimReal: now.toISOString(),
                // Mantém km e saldo do início se não foi informado (ou poderia pedir input, mas aqui é automático)
                kmFim: activeJourney.kmInicio, 
                balanceEnd: activeJourney.balanceStart
            };
            updatedJourneys = userJourneys.map(j => j.id === activeJourney.id ? closedJourney : j);
            syncData('journeys', updatedJourneys);
        }

        // 2. Atualiza a lista de contratos
        const updatedContracts = userContracts.map(c => 
          c.id === activeContract.id ? updatedContract : c
        );
        syncData('contracts', updatedContracts);
        
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setActiveTab('home');
      }
    });
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveTab('home');
  };

  const getPageTitle = (tab: string) => {
    switch(tab) {
      case 'home': return 'GiroPositivo';
      case 'records': return 'Registros';
      case 'add': return 'Novo Lançamento';
      case 'reports': return 'Relatórios';
      case 'menu': return 'Menu';
      case 'setup': return 'Configuração';
      default: return 'GiroPositivo';
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-emerald-600 text-white gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="font-bold animate-pulse uppercase tracking-widest text-xs">Sincronizando Giro...</p>
      </div>
    );
  }

  if (!currentUser) return <Auth onLogin={setCurrentUser} />;

  return (
    <Layout activeTab={activeTab === 'setup' ? 'menu' : activeTab} onTabChange={(tab) => { if(tab !== 'add') setEditingEntry(null); setActiveTab(tab); }} title={getPageTitle(activeTab)}>
      {activeTab === 'home' && (
        <Dashboard 
          userId={currentUser.id} 
          entries={activeContractEntries} 
          vehicle={activeContract ? { ...activeContract, appBalance: currentAppBalance } : null} 
          journeys={activeContractJourneys} 
          onUpdateJourney={handleUpdateJourney} 
          onDeleteJourney={handleDeleteJourney} 
          onSetupContract={() => setActiveTab('setup')} 
        />
      )}
      {activeTab === 'records' && <Records entries={activeContractEntries} onDelete={(id) => {
        const entry = userEntries.find(e => e.id === id);
        if (entry?.origin === 'automatic') return alert("Taxas automáticas devem ser editadas ou removidas através do histórico de jornadas.");
        setConfirmConfig({
          isOpen: true,
          title: 'Excluir Registro',
          message: 'Deseja realmente excluir este lançamento?',
          onConfirm: () => {
            syncData('entries', userEntries.filter(e => e.id !== id));
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          }
        });
      }} onEdit={(e) => { 
        if (e.origin === 'automatic') return alert("Taxas automáticas devem ser editadas via jornada.");
        setEditingEntry(e); 
        setActiveTab('add'); 
      }} />}
      {activeTab === 'add' && activeContract && <AddEntry userId={currentUser.id} onAdd={handleAddEntry} onCancel={() => { setEditingEntry(null); setActiveTab('home'); }} initialEntry={editingEntry || undefined} />}
      {activeTab === 'reports' && <Reports entries={activeContractEntries} vehicle={activeContract || userContracts[0] || null} journeys={activeContractJourneys} />}
      {activeTab === 'menu' && (
        <Menu 
          vehicle={activeContract || null} 
          contracts={userContracts} 
          user={currentUser} 
          onUpdateUser={setCurrentUser} 
          onCloseContract={handleCloseContract} 
          onLogout={handleLogout} 
          onDeleteContract={(id) => syncData('contracts', userContracts.filter(c => c.id !== id))} 
          onUpdateVehicle={(v) => activeContract && syncData('contracts', userContracts.map(c => c.id === activeContract.id ? { ...c, ...v } : c))} 
          journeys={activeContractJourneys} 
          onDeleteJourney={handleDeleteJourney} 
          onUpdateJourney={handleUpdateJourney} 
          onOpenSetup={() => setActiveTab('setup')} 
        />
      )}
      {activeTab === 'setup' && <VehicleSetup userId={currentUser.id} onComplete={(v) => { syncData('contracts', [v, ...userContracts]); setActiveTab('home'); }} onCancel={() => setActiveTab('menu')} />}
      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        confirmLabel={confirmConfig.confirmLabel}
        isDestructive={confirmConfig.isDestructive}
      />
    </Layout>
  );
};

export default App;
