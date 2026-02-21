
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
import { Vehicle, Entry, User, Journey, EntryType, ContractStatus } from './src/types';
import { getContractStatus, parseISO } from './utils/calculations';
import { isWithinInterval } from 'date-fns';

import { dataService } from '/src/services/dataService';

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
      const updatedEntries = dataService.syncEntries(allEntries, newEntries, currentUser);
      const updatedJourneys = dataService.syncJourneys(allJourneys, newJourneys, currentUser);
      setAllEntries(updatedEntries);
      setAllJourneys(updatedJourneys);
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
      const user = await authService.getCurrentUser();
      setCurrentUser(user);
      
      try {
        if (user) {
          const { contracts, entries, journeys } = await dataService.loadAllData();
          setAllContracts(contracts);
          setAllEntries(entries);
          setAllJourneys(journeys);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const handleAddEntry = async (entry: Omit<Entry, 'id' | 'userId'>) => {
    if (!currentUser || !activeContract) return;

    let journeyId = entry.journeyId;
    if (entry.type === EntryType.APP_RECHARGE && activeJourney) {
      journeyId = activeJourney.id;
    }

                const newEntry = await dataService.addEntry({ 
      ...entry, 
      contractId: activeContract.id,
      journeyId: journeyId
    });
    if (newEntry) setAllEntries(prev => [newEntry, ...prev]);

    setEditingEntry(null);
    setActiveTab(entry.isRecharge ? 'home' : 'records');
  };

    const handleAddJourney = async (journey: Omit<Journey, 'id' | 'userId'>) => {
    if (!currentUser || !activeContract) return;
            const newJourney = await dataService.addJourney({ ...journey, contractId: activeContract.id });
    if (newJourney) {
      setAllJourneys(prev => [newJourney, ...prev]);
    }
  };

  const handleUpdateJourney = async (journey: Journey) => {
    if (!currentUser || !activeContract) return;

    const updatedJourney = await dataService.updateJourney({ ...journey, contractId: activeContract.id });
    if (updatedJourney) setAllJourneys(prev => prev.map(j => j.id === updatedJourney.id ? updatedJourney : j));
    
    if (journey.encerrada) {
      // ... (rest of the function remains the same)
    }
  };

  const handleDeleteJourney = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Excluir Jornada',
      message: 'Ao excluir esta jornada, a taxa automática de aplicativo vinculada também será removida. Deseja continuar?',
      confirmLabel: 'Excluir',
      isDestructive: true,
      onConfirm: async () => {
        await handleDeleteJourney(id);
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
      onConfirm: async () => {
        await handleCloseContract();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setActiveTab('home');
      }
    });
  };

  const handleDeleteContract = async (id: string) => {
    await dataService.deleteContract(id);
    setAllContracts(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateVehicle = async (vehicle: Partial<Vehicle>) => {
    if (!activeContract) return;
    const updatedContract = await dataService.updateContract({ ...activeContract, ...vehicle });
    if (updatedContract) setAllContracts(prev => prev.map(c => c.id === updatedContract.id ? updatedContract : c));
  };

  const handleVehicleSetupComplete = async (vehicle: Omit<Vehicle, 'id' | 'userId'>) => {
    if (!currentUser) return;
    try {
                        const newContract = await dataService.addContract(vehicle);
      if (newContract) {
        setAllContracts(prev => [newContract, ...prev]);
        setActiveTab('home');
      } else {
        alert('Ocorreu um erro ao salvar o contrato. Por favor, tente novamente.');
      }
    } catch (error: any) {
      console.error("Erro ao criar contrato:", error);
      alert(`Não foi possível salvar o contrato: ${error.message}`);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await dataService.deleteEntry(id);
      setAllEntries(prev => prev.filter(e => e.id !== id));
    } catch (error: any) {
      console.error("Erro ao excluir registro:", error);
      alert(`Não foi possível excluir o registro: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    // Clear local data on logout
    setAllContracts([]);
    setAllEntries([]);
    setAllJourneys([]);
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
          onAddJourney={handleAddJourney} 
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
          onConfirm: async () => {
            await handleDeleteEntry(id);
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
          onDeleteContract={handleDeleteContract} 
          onUpdateVehicle={handleUpdateVehicle} 
          journeys={activeContractJourneys} 
          onDeleteJourney={handleDeleteJourney} 
          onUpdateJourney={handleUpdateJourney} 
          onOpenSetup={() => setActiveTab('setup')} 
        />
      )}
      {activeTab === 'setup' && <VehicleSetup userId={currentUser.id} onComplete={(v) => { handleVehicleSetupComplete(v); }} onCancel={() => setActiveTab('menu')} />}
      
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
