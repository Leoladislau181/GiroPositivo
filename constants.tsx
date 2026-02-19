
import React from 'react';
import { Home, ClipboardList, PlusCircle, BarChart3, Menu } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'home', label: 'Início', icon: <Home size={24} /> },
  { id: 'records', label: 'Registros', icon: <ClipboardList size={24} /> },
  { id: 'add', label: 'Novo', icon: <PlusCircle size={28} /> },
  { id: 'reports', label: 'Relatórios', icon: <BarChart3 size={24} /> },
  { id: 'menu', label: 'Menu', icon: <Menu size={24} /> },
];

export const COLORS = {
  primary: '#10b981', // emerald-500
  secondary: '#3b82f6', // blue-500
  danger: '#ef4444', // red-500
  warning: '#f59e0b', // amber-500
  neutral: '#64748b', // slate-500
};
