import React, { useState, useRef } from 'react';
import { Vehicle, VehicleType, Journey, ContractStatus, User as UserType } from '../src/types';
import { getContractDurationHours, parseISO } from '../utils/calculations';
import { User, Car, Target, Power, ChevronRight, Settings, Calendar, Check, X, Gauge, History, Trash2, Clock, Edit2, FileText, TrendingUp, LogOut, Mail, Phone, Lock, AlertCircle, Loader2, MapPin, Wallet, CreditCard } from 'lucide-react';
import { formatMoneyInput, parseMoneyInput } from '../utils/formatters';
import { format } from 'date-fns';
import { authService } from '../utils/auth';

interface MenuProps {
  vehicle: Vehicle | null;
  contracts: Vehicle[];
  user: UserType;
  onUpdateUser: (u: UserType) => void;
  onCloseContract: () => void;
  onLogout: () => void;
  onDeleteContract: (id: string) => Promise<void>;
  onUpdateVehicle: (v: Partial<Vehicle>) => Promise<void>;
  journeys: Journey[];
  onDeleteJourney: (id: string) => Promise<void>;
  onUpdateJourney: (j: Journey) => Promise<void>;
  onOpenSetup: () => void;
}

export const Menu: React.FC<MenuProps> = ({ vehicle, contracts, user, onUpdateUser, onCloseContract, onLogout, onDeleteContract, onUpdateVehicle, journeys, onDeleteJourney, onUpdateJourney, onOpenSetup }) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showContractHistory, setShowContractHistory] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);

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

  // States para o modal de perfil
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    password: '',
    confirmPassword: ''
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const startEdit = (field: string, currentVal: any) => {
    setEditingField(field);
    if (field === 'currentOdometer') {
      setTempValue(currentVal.toString());
    } else if (typeof currentVal === 'number') {
      setTempValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(currentVal));
    } else {
      setTempValue(currentVal);
    }
  };

  const saveEdit = () => {
    if (!editingField) return;
    
    if (editingField === 'currentOdometer') {
      const val = parseInt(tempValue);
      if (!isNaN(val)) {
        onUpdateVehicle({ currentOdometer: val });
      }
    } else if (editingField === 'contractValue') {
       const val = parseMoneyInput(tempValue);
       if (val >= 0) {
        onUpdateVehicle({ contractValue: val });
       }
    } else if (editingField === 'carInstallment') {
       const val = parseMoneyInput(tempValue);
       if (val >= 0) {
        onUpdateVehicle({ carInstallment: val });
       }
    }
    setEditingField(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileLoading(true);

    try {
      if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
        throw new Error('As senhas não coincidem.');
      }
      
      const updated = await authService.updateProfile(user.id, {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        password: profileForm.password || undefined
      });

      onUpdateUser(updated);
      setShowProfileEdit(false);
      setProfileForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveJourneyEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingJourney) {
      onUpdateJourney(editingJourney);
      setEditingJourney(null);
    }
  };

  const finishedContracts = contracts.filter(c => c.status === ContractStatus.FINISHED);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* User Info Button */}
      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => setShowProfileEdit(true)}
          className="flex items-center gap-4 flex-1 text-left active:scale-[0.98] transition-all"
        >
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border-2 border-emerald-50 relative">
            <User size={32} />
            <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full border border-gray-100 shadow-sm text-emerald-500">
                <Edit2 size={10} />
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-bold text-gray-800 leading-tight truncate">{user.name}</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight truncate">{user.email}</p>
            {user.phone && <p className="text-[8px] text-emerald-500 font-bold tracking-widest">{user.phone}</p>}
          </div>
        </button>
        <button onClick={onLogout} className="p-3 text-red-400 hover:text-red-600 bg-red-50 rounded-2xl transition-all active:scale-95 ml-2" title="Sair do Sistema">
          <LogOut size={20} />
        </button>
      </div>

      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Configurações do Contrato</h3>
        
        {vehicle ? (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-3"><Car className="text-emerald-500" size={20} /><span className="text-sm font-medium text-gray-700">Tipo de Veículo</span></div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{vehicle.type === VehicleType.RENTED ? 'ALUGADO' : 'PRÓPRIO'}</span>
            </div>

            <div className={`p-4 flex items-center justify-between border-b border-gray-50 transition-colors ${editingField === 'currentOdometer' ? 'bg-emerald-50/30' : 'hover:bg-gray-50 cursor-pointer'}`} onClick={() => editingField !== 'currentOdometer' && startEdit('currentOdometer', vehicle.currentOdometer || 0)}>
              <div className="flex items-center gap-3"><Gauge className="text-emerald-500" size={20} /><span className="text-sm font-medium text-gray-700">Odômetro Atual</span></div>
              {editingField === 'currentOdometer' ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus 
                    type="tel" 
                    value={tempValue} 
                    onFocus={e => handleFocus('odo', tempValue, setTempValue, e)}
                    onBlur={() => handleBlur('odo', tempValue, setTempValue, false)}
                    onChange={e => setTempValue(e.target.value)} 
                    className="w-24 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-right focus:outline-none" 
                  />
                  <button onClick={saveEdit} className="p-1.5 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button>
                  <button onClick={() => setEditingField(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg"><X size={14}/></button>
                </div>
              ) : (<span className="text-xs font-bold text-gray-800">{vehicle.currentOdometer?.toLocaleString('pt-BR')} KM</span>)}
            </div>
            
            <div className={`p-4 flex items-center justify-between border-b border-gray-50 transition-colors ${editingField === 'contractValue' ? 'bg-emerald-50/30' : 'hover:bg-gray-50 cursor-pointer'}`} onClick={() => editingField !== 'contractValue' && startEdit('contractValue', vehicle.contractValue)}>
              <div className="flex items-center gap-3"><Settings className="text-emerald-500" size={20} /><span className="text-sm font-medium text-gray-700">{vehicle.type === VehicleType.RENTED ? 'Custo Período' : 'Reserva Mensal'}</span></div>
              {editingField === 'contractValue' ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus 
                    type="tel" 
                    value={tempValue} 
                    onFocus={e => handleFocus('val', tempValue, setTempValue, e)}
                    onBlur={() => handleBlur('val', tempValue, setTempValue)}
                    onChange={e => setTempValue(formatMoneyInput(e.target.value))} 
                    className="w-24 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-right focus:outline-none" 
                  />
                  <button onClick={saveEdit} className="p-1.5 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button>
                  <button onClick={() => setEditingField(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg"><X size={14}/></button>
                </div>
              ) : (<span className="text-xs font-bold text-gray-800">{formatCurrency(vehicle.contractValue)}</span>)}
            </div>

            {vehicle.type === VehicleType.OWNED && (
              <div className={`p-4 flex items-center justify-between border-b border-gray-50 transition-colors ${editingField === 'carInstallment' ? 'bg-emerald-50/30' : 'hover:bg-gray-50 cursor-pointer'}`} onClick={() => editingField !== 'carInstallment' && startEdit('carInstallment', vehicle.carInstallment || 0)}>
                <div className="flex items-center gap-3"><CreditCard className="text-emerald-500" size={20} /><span className="text-sm font-medium text-gray-700">Parcela do Carro</span></div>
                {editingField === 'carInstallment' ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                      autoFocus 
                      type="tel" 
                      value={tempValue} 
                      onFocus={e => handleFocus('install', tempValue, setTempValue, e)}
                      onBlur={() => handleBlur('install', tempValue, setTempValue)}
                      onChange={e => setTempValue(formatMoneyInput(e.target.value))} 
                      className="w-24 bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-right focus:outline-none" 
                    />
                    <button onClick={saveEdit} className="p-1.5 bg-emerald-600 text-white rounded-lg"><Check size={14}/></button>
                    <button onClick={() => setEditingField(null)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg"><X size={14}/></button>
                  </div>
                ) : (<span className="text-xs font-bold text-gray-800">{formatCurrency(vehicle.carInstallment || 0)}</span>)}
              </div>
            )}

            <div className="p-4 border-b border-gray-50">
              <div className="flex items-center gap-3 mb-2"><Calendar className="text-emerald-500" size={20} /><span className="text-sm font-medium text-gray-700">Vigência</span></div>
              <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase font-bold ml-8">
                {vehicle.type === VehicleType.RENTED ? (
                  <>
                    <div>INÍCIO: {format(parseISO(vehicle.contractStart), "dd/MM/yy")}</div>
                    <div>FIM: {format(parseISO(vehicle.contractEnd), "dd/MM/yy")}</div>
                  </>
                ) : (
                   <>
                    <div>INÍCIO: {format(parseISO(vehicle.contractStart), "dd/MM/yy")}</div>
                    <div>CICLO MENSAL (RENOVA DIA 01)</div>
                   </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <button onClick={onOpenSetup} className="w-full bg-emerald-600 text-white p-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
            <Target size={18} /> Iniciar Novo Contrato
          </button>
        )}

        <div className="pt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setShowHistory(true)} className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-600 hover:bg-emerald-50 transition-colors">
              <History size={20} className="text-emerald-500 mb-1" />
              <span className="text-[9px] font-bold uppercase tracking-tight">Jornadas</span>
            </button>
            <button onClick={() => setShowContractHistory(true)} className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 shadow-sm text-gray-600 hover:bg-emerald-50 transition-colors">
              <FileText size={20} className="text-blue-500 mb-1" />
              <span className="text-[9px] font-bold uppercase tracking-tight">Contratos</span>
            </button>
        </div>

        {vehicle && (
          <button onClick={onCloseContract} className="w-full flex items-center justify-between p-4 bg-white rounded-3xl border border-gray-100 shadow-sm text-red-500 hover:bg-red-50 transition-colors mt-2 active:scale-[0.99]">
            <div className="flex items-center gap-3"><Power size={20} /><span className="text-sm font-bold uppercase tracking-tight">Fechar Contrato Atual</span></div>
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Perfil Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom-10 duration-300">
          <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-emerald-600 text-white">
            <h2 className="text-xl font-bold">Gerenciar Perfil</h2>
            <button onClick={() => setShowProfileEdit(false)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
            {profileError && (
              <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} /> {profileError}
              </div>
            )}

            <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        required
                        type="text" 
                        value={profileForm.name}
                        onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        required
                        type="email" 
                        value={profileForm.email}
                        onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Celular (Opcional)</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="tel" 
                        placeholder="(00) 00000-0000"
                        value={profileForm.phone}
                        onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm font-bold focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alterar Senha (Opcional)</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="password" 
                        placeholder="******"
                        value={profileForm.password}
                        onChange={e => setProfileForm({...profileForm, password: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                        type="password" 
                        placeholder="******"
                        value={profileForm.confirmPassword}
                        onChange={e => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>
            </div>

            <div className="pt-6 pb-12">
                <button
                    disabled={profileLoading}
                    type="submit"
                    className="w-full bg-emerald-600 text-white font-black py-5 rounded-3xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {profileLoading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
                </button>
            </div>
          </form>
        </div>
      )}

      {/* Histórico e Contratos Modals seguem abaixo... */}
      {showHistory && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom-10 duration-300">
          <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Histórico de Jornadas</h2>
            <button onClick={() => setShowHistory(false)} className="p-2 rounded-full bg-gray-200 text-gray-500 transition-all active:rotate-90"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {journeys.length === 0 ? <div className="text-center py-20 text-gray-400">Nenhuma jornada registrada.</div> : 
              [...journeys].sort((a, b) => parseISO(b.dataInicioReal).getTime() - parseISO(a.dataInicioReal).getTime()).map(j => (
                <div key={j.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-gray-800 capitalize">{new Date(j.dataReferencia + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</p>
                            {!j.encerrada && <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">ATIVA</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{format(parseISO(j.dataInicioReal), 'HH:mm')} às {j.dataFimReal ? format(parseISO(j.dataFimReal), 'HH:mm') : '--:--'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={!j.encerrada}
                        title={!j.encerrada ? "Encerre a jornada para editar" : "Editar Jornada"}
                        onClick={() => setEditingJourney(j)} 
                        className={`p-2 rounded-xl transition-all ${!j.encerrada ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        disabled={!j.encerrada}
                        title={!j.encerrada ? "Encerre a jornada para excluir" : "Excluir Jornada"}
                        onClick={() => onDeleteJourney(j.id)} 
                        className={`p-2 rounded-xl transition-all ${!j.encerrada ? 'text-gray-300 cursor-not-allowed bg-gray-50' : 'text-red-300 hover:text-red-500 hover:bg-red-50'}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Edit Journey Sub-Modal */}
      {editingJourney && (
        <div className="fixed inset-0 z-[110] bg-white flex flex-col animate-in zoom-in-95 duration-200">
           <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-emerald-600 text-white shadow-md">
              <h2 className="text-xl font-bold">Editar Jornada</h2>
              <button onClick={() => setEditingJourney(null)} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all">
                <X size={20} />
              </button>
           </div>
           
            <form onSubmit={handleSaveJourneyEdit} className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Seção Início */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Início da Jornada</h4>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data e Hora de Início</label>
                  <div className="grid grid-cols-5 gap-2">
                    <div className="relative col-span-3">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input 
                        type="date" 
                        className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-[11px] font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                        value={format(new Date(editingJourney.dataInicioReal), 'yyyy-MM-dd')}
                        onChange={e => {
                           const time = format(new Date(editingJourney.dataInicioReal), 'HH:mm');
                           const newDate = new Date(`${e.target.value}T${time}`);
                           setEditingJourney({
                               ...editingJourney, 
                               dataInicioReal: newDate.toISOString(),
                               dataReferencia: e.target.value
                           });
                        }}
                      />
                    </div>
                    <div className="relative col-span-2">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                      <input 
                        type="time" 
                        className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-[11px] font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                        value={format(new Date(editingJourney.dataInicioReal), 'HH:mm')}
                        onChange={e => {
                           const date = format(new Date(editingJourney.dataInicioReal), 'yyyy-MM-dd');
                           const newDate = new Date(`${date}T${e.target.value}`);
                           setEditingJourney({...editingJourney, dataInicioReal: newDate.toISOString()});
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">KM Inicial</label>
                      <div className="relative">
                        <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <input 
                          type="tel" 
                          className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-xs font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                          value={editingJourney.kmInicio}
                          onChange={e => setEditingJourney({...editingJourney, kmInicio: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Saldo Inicial App</label>
                      <div className="relative">
                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                        <input 
                          type="tel" 
                          className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-xs font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition-all outline-none"
                          value={formatMoneyInput((editingJourney.balanceStart * 100).toString())}
                          onChange={e => setEditingJourney({...editingJourney, balanceStart: parseMoneyInput(e.target.value)})}
                        />
                      </div>
                    </div>
                </div>
              </div>

              {editingJourney.encerrada && (
                  <div className="space-y-4 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fechamento</h4>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data e Hora de Fim</label>
                      <div className="grid grid-cols-5 gap-2">
                        <div className="relative col-span-3">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input 
                            type="date" 
                            className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-[11px] font-bold text-gray-700 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            value={editingJourney.dataFimReal ? format(new Date(editingJourney.dataFimReal), 'yyyy-MM-dd') : ''}
                            onChange={e => {
                               if (!editingJourney.dataFimReal) return;
                               const time = format(new Date(editingJourney.dataFimReal), 'HH:mm');
                               const newDate = new Date(`${e.target.value}T${time}`);
                               setEditingJourney({...editingJourney, dataFimReal: newDate.toISOString()});
                            }}
                          />
                        </div>
                        <div className="relative col-span-2">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input 
                            type="time" 
                            className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-[11px] font-bold text-gray-700 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            value={editingJourney.dataFimReal ? format(new Date(editingJourney.dataFimReal), 'HH:mm') : ''}
                            onChange={e => {
                               if (!editingJourney.dataFimReal) return;
                               const date = format(new Date(editingJourney.dataFimReal), 'yyyy-MM-dd');
                               const newDate = new Date(`${date}T${e.target.value}`);
                               setEditingJourney({...editingJourney, dataFimReal: newDate.toISOString()});
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">KM Final</label>
                        <div className="relative">
                          <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input 
                            type="tel" 
                            className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-xs font-bold text-gray-700 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            value={editingJourney.kmFim || ''}
                            onChange={e => setEditingJourney({...editingJourney, kmFim: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Saldo Final App</label>
                        <div className="relative">
                          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                          <input 
                            type="tel" 
                            className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-xs font-bold text-gray-700 focus:bg-white focus:border-blue-500 transition-all outline-none"
                            value={formatMoneyInput(((editingJourney.balanceEnd || 0) * 100).toString())}
                            onChange={e => setEditingJourney({...editingJourney, balanceEnd: parseMoneyInput(e.target.value)})}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
              )}

              <div className="pt-6 pb-20">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 text-white font-black py-5 rounded-3xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-emerald-700"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingJourney(null)}
                    className="w-full py-4 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-600 transition-colors mt-2"
                  >
                    Cancelar
                  </button>
              </div>
           </form>
        </div>
      )}

      {showContractHistory && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-bottom-10 duration-300">
          <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Histórico de Contratos</h2>
            <button onClick={() => setShowContractHistory(false)} className="p-2 rounded-full bg-gray-200 text-gray-500 transition-all active:rotate-90"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {finishedContracts.length === 0 ? <div className="text-center py-20 text-gray-400">Nenhum contrato finalizado.</div> : 
              finishedContracts.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Finalizado</p>
                      <h4 className="text-base font-black text-gray-800 tracking-tight">{format(parseISO(c.contractStart), 'dd/MM/yy')} a {format(parseISO(c.contractEnd), 'dd/MM/yy')}</h4>
                    </div>
                    <button onClick={() => onDeleteContract(c.id)} className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><p className="text-[9px] font-bold text-gray-400 uppercase">Custo Total</p><p className="text-sm font-bold text-gray-700">{formatCurrency(c.contractValue)}</p></div>
                    <div className="space-y-1 text-right"><p className="text-[9px] font-bold text-gray-400 uppercase">Duração</p><p className="text-sm font-bold text-gray-700">{getContractDurationHours(c).toFixed(0)}h</p></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
