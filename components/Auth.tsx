
import React, { useState } from 'react';
import { authService } from '../utils/auth';
import { User } from '../types';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const user = await authService.login(formData.email, formData.password);
        onLogin(user);
      } else {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (formData.password.length < 6) {
          throw new Error('A senha deve ter no mínimo 6 caracteres.');
        }
        const user = await authService.register(formData.name, formData.email, formData.password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center p-6 text-white overflow-y-auto">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center">
          <h1 className="text-4xl font-black italic tracking-tighter">GIRO POSITIVO</h1>
          <p className="mt-2 text-emerald-100 font-medium">Controle financeiro para motoristas</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-gray-800">
          <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-2xl">
            <button 
              onClick={() => { 
                setIsLogin(true); 
                setError('');
                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); 
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isLogin ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
            >
              <LogIn size={16} /> Entrar
            </button>
            <button 
              onClick={() => { 
                setIsLogin(false); 
                setError('');
                setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isLogin ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
            >
              <UserPlus size={16} /> Cadastro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 p-3 rounded-xl text-[10px] font-bold flex items-center gap-2 animate-in shake duration-300">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    required
                    type="text"
                    placeholder="Seu nome"
                    className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input
                  required
                  type="email"
                  placeholder="exemplo@email.com"
                  className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input
                  required
                  type="password"
                  placeholder="******"
                  className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    required
                    type="password"
                    placeholder="******"
                    className="w-full bg-gray-50 border border-gray-100 p-4 pl-12 rounded-2xl text-sm focus:outline-none focus:border-emerald-500 transition-all"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (isLogin ? 'Entrar no Sistema' : 'Criar minha Conta')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
