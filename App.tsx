
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

    if (active) return active;

    // 2. Fail-safe: Se não houver contrato ativo, mas houver uma JORNADA ATIVA,
    // retornamos o contrato mais recente (mesmo que expirado) para permitir o encerramento da jornada.
    if (activeJourney && userContracts.length > 0) {
       const sortedContracts = [...userContracts].sort((a, b) => 
         new Date(b.contractEnd).getTime() - new Date(a.contractEnd).getTime()
       );
       return sortedContracts[0];
    }

    return undefined;
  }, [userContracts, activeJourney]);

  const currentAppBalance = useMemo(() => {
    if (!currentUser) return 0;
    const recharges = userEntries
      .filter(e => e.isRecharge)
      .reduce((sum, e) => sum + e.amount, 0);
    const spentFees = userEntries
      .filter(e => e.type === EntryType.APP_TAX && !e.isRecharge)
      .reduce((sum, e) => sum + e.amount, 0);
    return recharges - spentFees;
  }, [userEntries, currentUser]);

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

    const newEntries = [entry, ...userEntries.filter(e => e.id !== entry.id)];
    syncData('entries', newEntries);

    setEditingEntry(null);
    setActiveTab(entry.isRecharge ? 'home' : 'records');
  };

  const handleUpdateJourney = (journey: Journey) => {
    if (!currentUser || !activeContract) return;

    const newJourneys = [journey, ...userJourneys.filter(j => j.id !== journey.id)];
    syncData('journeys', newJourneys);
    
    if (journey.encerrada) {
      const rechargesInJourney = userEntries
        .filter(e => e.isRecharge && isWithinInterval(parseISO(e.date), { 
          start: parseISO(journey.dataInicioReal), 
          end: parseISO(journey.dataFimReal || new Date().toISOString()) 
        }))
        .reduce((sum, e) => sum + e.amount, 0);

      const bStart = Number(journey.balanceStart) || 0;
      const bEnd = Number(journey.balanceEnd) || 0;
      
      const spent = Math.max((bStart + rechargesInJourney) - bEnd, 0);

      if (spent > 0) {
        const autoEntry: Entry = {
          id: `tax-auto-${journey.id}`,
          userId: currentUser.id,
          type: EntryType.APP_TAX,
          category: 'Taxa de Aplicativo',
          amount: spent,
          // IMPORTANTE: A data da taxa deve ser o FIM da jornada para consistência contábil no dia correto
          date: journey.dataFimReal || journey.dataInicioReal, 
          description: `Consumo automático (Km: ${journey.kmInicio} - ${journey.kmFim})`,
          journeyId: journey.id,
          isRecharge: false,
          origin: 'automatic'
        };
        const updatedEntries = [autoEntry, ...userEntries.filter(e => e.journeyId !== journey.id)];
        syncData('entries', updatedEntries);
      } else {
        syncData('entries', userEntries.filter(e => e.journeyId !== journey.id));
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
      message: 'Tem certeza que deseja encerrar o contrato atual? O cálculo de custos será interrompido na data de hoje.',
      confirmLabel: 'Encerrar Agora',
      isDestructive: true,
      onConfirm: () => {
        const now = new Date();
        const updatedContract: Vehicle = {
          ...activeContract,
          status: ContractStatus.FINISHED,
          contractEnd: now.toISOString() // Atualiza a data final para o momento do encerramento
        };
        
        // Atualiza a lista de contratos
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
          entries={userEntries} 
          vehicle={activeContract ? { ...activeContract, appBalance: currentAppBalance } : null} 
          journeys={userJourneys} 
          onUpdateJourney={handleUpdateJourney} 
          onDeleteJourney={handleDeleteJourney} 
          onSetupContract={() => setActiveTab('setup')} 
        />
      )}
      {activeTab === 'records' && <Records entries={userEntries} onDelete={(id) => {
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
      {activeTab === 'reports' && <Reports entries={userEntries} vehicle={activeContract || userContracts[0] || null} journeys={userJourneys} />}
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
          journeys={userJourneys} 
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
