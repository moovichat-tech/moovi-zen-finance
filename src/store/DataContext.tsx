import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  status: 'planned' | 'paid' | 'received';
  recurrence: 'once' | 'monthly' | 'weekly' | 'yearly';
  installments?: number;
  currentInstallment?: number;
  accountId: string;
  cardId?: string;
  tags: string[];
  fixed?: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  lastDigits: string;
  limit: number;
  usedLimit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'checking' | 'business' | 'international' | 'investment';
  balance: number;
  color: string;
  institution: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  limit: number;
  spent: number;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
}

interface Categories {
  income: string[];
  expense: string[];
}

const defaultProfile: Profile = {
  name: 'Usuário Moovi',
  email: 'usuario@email.com',
  phone: '+55 11 99999-9999',
};

const defaultAccounts: Account[] = [
  { id: 'acc-1', name: 'Nubank', type: 'checking', balance: 12450.80, color: 'hsl(280, 60%, 55%)', institution: 'Nubank' },
  { id: 'acc-2', name: 'Itaú', type: 'checking', balance: 8320.50, color: 'hsl(38, 92%, 50%)', institution: 'Itaú' },
  { id: 'acc-3', name: 'Wise', type: 'international', balance: 3200.00, color: 'hsl(152, 60%, 42%)', institution: 'Wise' },
];

const defaultCards: CreditCard[] = [
  { id: 'card-1', name: 'Nubank Platinum', lastDigits: '4521', limit: 15000, usedLimit: 4200, closingDay: 3, dueDay: 10, color: 'hsl(280, 60%, 55%)' },
  { id: 'card-2', name: 'Itaú Black', lastDigits: '8734', limit: 25000, usedLimit: 8500, closingDay: 15, dueDay: 22, color: 'hsl(38, 92%, 50%)' },
];

const defaultCategories: Categories = {
  income: ['Salário', 'Freelance', 'Investimentos', 'Vendas', 'Outros'],
  expense: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Vestuário', 'Serviços', 'Outros'],
};

const defaultTransactions: Transaction[] = [
  { id: 't-1', type: 'income', description: 'Salário', amount: 8500, category: 'Salário', date: '2026-03-01', status: 'received', recurrence: 'monthly', accountId: 'acc-2', tags: [] },
  { id: 't-2', type: 'income', description: 'Freelance Website', amount: 2700, category: 'Freelance', date: '2026-03-05', status: 'received', recurrence: 'once', accountId: 'acc-1', tags: ['web'] },
  { id: 't-3', type: 'expense', description: 'Aluguel', amount: 2800, category: 'Moradia', date: '2026-03-05', status: 'paid', recurrence: 'monthly', accountId: 'acc-2', tags: [], fixed: true },
  { id: 't-4', type: 'expense', description: 'Supermercado Extra', amount: 450, category: 'Alimentação', date: '2026-03-08', status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [] },
  { id: 't-5', type: 'expense', description: 'Uber', amount: 85, category: 'Transporte', date: '2026-03-10', status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [] },
  { id: 't-6', type: 'expense', description: 'Netflix', amount: 55.90, category: 'Lazer', date: '2026-03-10', status: 'paid', recurrence: 'monthly', accountId: 'acc-1', tags: [], fixed: true },
  { id: 't-7', type: 'expense', description: 'Farmácia', amount: 120, category: 'Saúde', date: '2026-03-12', status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [] },
  { id: 't-8', type: 'expense', description: 'iPhone 16 Pro', amount: 1200, category: 'Outros', date: '2026-03-01', status: 'paid', recurrence: 'once', accountId: 'acc-1', cardId: 'card-1', installments: 12, currentInstallment: 1, tags: ['tech'] },
  { id: 't-9', type: 'income', description: 'Dividendos PETR4', amount: 320, category: 'Investimentos', date: '2026-03-15', status: 'planned', recurrence: 'once', accountId: 'acc-2', tags: ['ações'] },
  { id: 't-10', type: 'expense', description: 'Condomínio', amount: 680, category: 'Moradia', date: '2026-03-10', status: 'paid', recurrence: 'monthly', accountId: 'acc-2', tags: [], fixed: true },
  { id: 't-11', type: 'expense', description: 'Restaurante japonês', amount: 180, category: 'Alimentação', date: '2026-03-14', status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [] },
  { id: 't-12', type: 'expense', description: 'Curso Udemy', amount: 27.90, category: 'Educação', date: '2026-03-06', status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: ['dev'] },
];

const defaultBudgets: BudgetItem[] = [
  { id: 'b-1', category: 'Moradia', limit: 3500, spent: 3480 },
  { id: 'b-2', category: 'Alimentação', limit: 1500, spent: 630 },
  { id: 'b-3', category: 'Transporte', limit: 500, spent: 85 },
  { id: 'b-4', category: 'Lazer', limit: 600, spent: 55.90 },
  { id: 'b-5', category: 'Saúde', limit: 400, spent: 120 },
  { id: 'b-6', category: 'Educação', limit: 300, spent: 27.90 },
];

interface DataContextType {
  transactions: Transaction[];
  accounts: Account[];
  cards: CreditCard[];
  budgets: BudgetItem[];
  categories: Categories;
  profile: Profile;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, data: Partial<Omit<Transaction, 'id'>>) => void;
  deleteTransaction: (id: string) => void;
  addAccount: (a: Omit<Account, 'id'>) => void;
  deleteAccount: (id: string) => void;
  addCard: (c: Omit<CreditCard, 'id'>) => void;
  updateCard: (id: string, data: Partial<Omit<CreditCard, 'id'>>) => void;
  deleteCard: (id: string) => void;
  updateBudget: (id: string, limit: number) => void;
  addBudget: (category: string, limit: number) => void;
  deleteBudget: (id: string) => void;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number) => void;
  addCategory: (type: 'income' | 'expense', name: string) => void;
  deleteCategory: (type: 'income' | 'expense', name: string) => void;
  updateCategory: (type: 'income' | 'expense', oldName: string, newName: string) => void;
  updateProfile: (data: Partial<Profile>) => void;
}

const DataContext = createContext<DataContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage('moovi_transactions', defaultTransactions));
  const [accounts, setAccounts] = useState<Account[]>(() => loadFromStorage('moovi_accounts', defaultAccounts));
  const [cards, setCards] = useState<CreditCard[]>(() => loadFromStorage('moovi_cards', defaultCards));
  const [budgets, setBudgets] = useState<BudgetItem[]>(() => loadFromStorage('moovi_budgets', defaultBudgets));
  const [categories, setCategories] = useState<Categories>(() => loadFromStorage('moovi_categories', defaultCategories));
  const [profile, setProfile] = useState<Profile>(() => loadFromStorage('moovi_profile', defaultProfile));

  useEffect(() => { localStorage.setItem('moovi_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('moovi_accounts', JSON.stringify(accounts)); }, [accounts]);
  useEffect(() => { localStorage.setItem('moovi_cards', JSON.stringify(cards)); }, [cards]);
  useEffect(() => { localStorage.setItem('moovi_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('moovi_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('moovi_profile', JSON.stringify(profile)); }, [profile]);

  const addTransaction = useCallback((t: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [{ ...t, id: `t-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` }, ...prev]);
  }, []);

  const updateTransaction = useCallback((id: string, data: Partial<Omit<Transaction, 'id'>>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addAccount = useCallback((a: Omit<Account, 'id'>) => {
    setAccounts(prev => [...prev, { ...a, id: `acc-${Date.now()}` }]);
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

  const addCard = useCallback((c: Omit<CreditCard, 'id'>) => {
    setCards(prev => [...prev, { ...c, id: `card-${Date.now()}` }]);
  }, []);

  const updateCard = useCallback((id: string, data: Partial<Omit<CreditCard, 'id'>>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateBudget = useCallback((id: string, limit: number) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, limit } : b));
  }, []);

  const addBudget = useCallback((category: string, limit: number) => {
    setBudgets(prev => {
      if (prev.some(b => b.category === category)) return prev;
      return [...prev, { id: `b-${Date.now()}`, category, limit, spent: 0 }];
    });
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  const transferBetweenAccounts = useCallback((fromId: string, toId: string, amount: number) => {
    setAccounts(prev => prev.map(a => {
      if (a.id === fromId) return { ...a, balance: a.balance - amount };
      if (a.id === toId) return { ...a, balance: a.balance + amount };
      return a;
    }));
  }, []);

  const addCategory = useCallback((type: 'income' | 'expense', name: string) => {
    setCategories(prev => {
      const list = prev[type];
      if (list.includes(name)) return prev;
      return { ...prev, [type]: [...list, name] };
    });
  }, []);

  const deleteCategory = useCallback((type: 'income' | 'expense', name: string) => {
    setCategories(prev => ({ ...prev, [type]: prev[type].filter(c => c !== name) }));
    // Also remove budget for this category
    if (type === 'expense') {
      setBudgets(prev => prev.filter(b => b.category !== name));
    }
  }, []);

  const updateCategory = useCallback((type: 'income' | 'expense', oldName: string, newName: string) => {
    setCategories(prev => ({ ...prev, [type]: prev[type].map(c => c === oldName ? newName : c) }));
    setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
    // Also update budgets
    setBudgets(prev => prev.map(b => b.category === oldName ? { ...b, category: newName } : b));
  }, []);

  const updateProfile = useCallback((data: Partial<Profile>) => {
    setProfile(prev => ({ ...prev, ...data }));
  }, []);

  return (
    <DataContext.Provider value={{
      transactions, accounts, cards, budgets, categories, profile,
      addTransaction, updateTransaction, deleteTransaction,
      addAccount, deleteAccount,
      addCard, updateCard, deleteCard,
      updateBudget, addBudget, deleteBudget, transferBetweenAccounts,
      addCategory, deleteCategory, updateCategory,
      updateProfile,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
