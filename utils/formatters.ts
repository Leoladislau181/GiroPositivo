
export const formatMoneyInput = (value: string): string => {
  if (!value || value === '-') return value === '-' ? '-0,00' : '0,00';
  
  const isNegative = value.startsWith('-') || value.includes('-');
  const digits = value.replace(/\D/g, '');
  const cents = parseInt(digits || '0', 10);
  
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
  
  return isNegative ? `-${formatted}` : formatted;
};

export const parseMoneyInput = (value: string): number => {
  if (!value) return 0;
  try {
    const isNegative = value.startsWith('-') || value.includes('-');
    const digits = value.replace(/\D/g, '');
    const cents = parseInt(digits || '0', 10);
    const amount = isNaN(cents) ? 0 : cents / 100;
    return isNegative ? -amount : amount;
  } catch (e) {
    return 0;
  }
};
