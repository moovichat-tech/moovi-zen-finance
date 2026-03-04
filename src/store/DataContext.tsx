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

// Generate extensive seed data from Jan 2025 to Mar 2026
function generateSeedTransactions(): Transaction[] {
  const txs: Transaction[] = [];
  let id = 1;

  const incomeItems = [
    { desc: 'Salário', cat: 'Salário', amount: 8500, acc: 'acc-2', rec: 'monthly' as const },
    { desc: 'Freelance Design', cat: 'Freelance', amount: 2200, acc: 'acc-1', rec: 'once' as const },
    { desc: 'Freelance Website', cat: 'Freelance', amount: 2700, acc: 'acc-1', rec: 'once' as const },
    { desc: 'Dividendos PETR4', cat: 'Investimentos', amount: 320, acc: 'acc-2', rec: 'once' as const },
    { desc: 'Dividendos ITSA4', cat: 'Investimentos', amount: 180, acc: 'acc-2', rec: 'once' as const },
    { desc: 'Venda Mercado Livre', cat: 'Vendas', amount: 450, acc: 'acc-1', rec: 'once' as const },
  ];

  const expenseItems = [
    { desc: 'Aluguel', cat: 'Moradia', amount: 2800, acc: 'acc-2', rec: 'monthly' as const, fixed: true },
    { desc: 'Condomínio', cat: 'Moradia', amount: 680, acc: 'acc-2', rec: 'monthly' as const, fixed: true },
    { desc: 'Energia', cat: 'Moradia', amount: 220, acc: 'acc-1', rec: 'monthly' as const, fixed: true },
    { desc: 'Internet', cat: 'Moradia', amount: 120, acc: 'acc-1', rec: 'monthly' as const, fixed: true },
    { desc: 'Supermercado', cat: 'Alimentação', amount: 0, acc: 'acc-1', rec: 'once' as const },
    { desc: 'Restaurante', cat: 'Alimentação', amount: 0, acc: 'acc-1', rec: 'once' as const },
    { desc: 'iFood', cat: 'Alimentação', amount: 0, acc: 'acc-1', rec: 'once' as const },
    { desc: 'Uber', cat: 'Transporte', amount: 0, acc: 'acc-1', rec: 'once' as const },
    { desc: 'Gasolina', cat: 'Transporte', amount: 0, acc: 'acc-1', rec: 'once' as const },
    { desc: 'Netflix', cat: 'Lazer', amount: 55.90, acc: 'acc-1', rec: 'monthly' as const, fixed: true },
    { desc: 'Spotify', cat: 'Lazer', amount: 21.90, acc: 'acc-1', rec: 'monthly' as const, fixed: true },
    { desc: 'Academia', cat: 'Saúde', amount: 129, acc: 'acc-1', rec: 'monthly' as const, fixed: true },
    { desc: 'Farmácia', cat: 'Saúde', amount: 0, acc: 'acc-1', rec: 'once' as const },
    { desc: 'Curso Udemy', cat: 'Educação', amount: 0, acc: 'acc-1', rec: 'once' as const },
  ];

  const rand = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

  for (let year = 2025; year <= 2026; year++) {
    const maxMonth = year === 2026 ? 3 : 12;
    for (let month = 1; month <= maxMonth; month++) {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      
      // Salary every month
      txs.push({
        id: `t-${id++}`, type: 'income', description: 'Salário', amount: 8500,
        category: 'Salário', date: `${monthStr}-05`, status: 'received',
        recurrence: 'monthly', accountId: 'acc-2', tags: [], fixed: false,
      });

      // Random freelance (60% chance)
      if (Math.random() > 0.4) {
        const fl = incomeItems[Math.random() > 0.5 ? 1 : 2];
        txs.push({
          id: `t-${id++}`, type: 'income', description: fl.desc, amount: rand(1500, 4000),
          category: fl.cat, date: `${monthStr}-${String(rand(10, 25) | 0).padStart(2, '0')}`,
          status: 'received', recurrence: 'once', accountId: fl.acc, tags: ['web'],
        });
      }

      // Dividends (40% chance)
      if (Math.random() > 0.6) {
        const div = incomeItems[Math.random() > 0.5 ? 3 : 4];
        txs.push({
          id: `t-${id++}`, type: 'income', description: div.desc, amount: rand(100, 500),
          category: div.cat, date: `${monthStr}-15`, status: 'received',
          recurrence: 'once', accountId: div.acc, tags: ['ações'],
        });
      }

      // Fixed expenses every month
      for (const exp of expenseItems.filter(e => e.fixed)) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: exp.desc, amount: exp.amount + rand(-20, 20),
          category: exp.cat, date: `${monthStr}-${String(rand(1, 10) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'monthly', accountId: exp.acc, tags: [], fixed: true,
        });
      }

      // Variable expenses
      // Supermercado 2-4x/month
      const superCount = 2 + (Math.random() * 3 | 0);
      for (let s = 0; s < superCount; s++) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: `Supermercado ${['Extra', 'Pão de Açúcar', 'Carrefour', 'Assaí'][s % 4]}`,
          amount: rand(150, 600), category: 'Alimentação',
          date: `${monthStr}-${String(rand(1, 28) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [],
        });
      }

      // Restaurante 1-3x/month
      const restCount = 1 + (Math.random() * 3 | 0);
      for (let r = 0; r < restCount; r++) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: `${['Restaurante japonês', 'Pizzaria', 'Churrascaria', 'Café'][r % 4]}`,
          amount: rand(40, 250), category: 'Alimentação',
          date: `${monthStr}-${String(rand(1, 28) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [],
        });
      }

      // Uber 2-5x/month
      const uberCount = 2 + (Math.random() * 4 | 0);
      for (let u = 0; u < uberCount; u++) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: 'Uber',
          amount: rand(15, 85), category: 'Transporte',
          date: `${monthStr}-${String(rand(1, 28) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [],
        });
      }

      // Gasolina 1-2x/month
      if (Math.random() > 0.3) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: 'Gasolina',
          amount: rand(150, 350), category: 'Transporte',
          date: `${monthStr}-${String(rand(1, 28) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [],
        });
      }

      // Farmácia (50% chance)
      if (Math.random() > 0.5) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: 'Farmácia',
          amount: rand(30, 200), category: 'Saúde',
          date: `${monthStr}-${String(rand(1, 28) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: [],
        });
      }

      // Education (30% chance)
      if (Math.random() > 0.7) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: `Curso ${['Udemy', 'Alura', 'Rocketseat'][Math.random() * 3 | 0]}`,
          amount: rand(25, 150), category: 'Educação',
          date: `${monthStr}-${String(rand(1, 28) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'once', accountId: 'acc-1', tags: ['dev'],
        });
      }

      // Card purchases (some with card)
      if (Math.random() > 0.4) {
        txs.push({
          id: `t-${id++}`, type: 'expense', description: `${['Zara', 'Nike', 'Amazon', 'Magazine Luiza'][Math.random() * 4 | 0]}`,
          amount: rand(80, 800), category: ['Vestuário', 'Lazer', 'Outros'][Math.random() * 3 | 0],
          date: `${monthStr}-${String(rand(1, 28) | 0).padStart(2, '0')}`,
          status: 'paid', recurrence: 'once', accountId: 'acc-1',
          cardId: Math.random() > 0.5 ? 'card-1' : 'card-2', tags: [],
        });
      }
    }
  }

  return txs;
}

const defaultTransactions: Transaction[] = generateSeedTransactions();

const defaultBudgets: BudgetItem[] = [
  { id: 'b-1', category: 'Moradia', limit: 4000, spent: 0 },
  { id: 'b-2', category: 'Alimentação', limit: 2000, spent: 0 },
  { id: 'b-3', category: 'Transporte', limit: 800, spent: 0 },
  { id: 'b-4', category: 'Lazer', limit: 600, spent: 0 },
  { id: 'b-5', category: 'Saúde', limit: 500, spent: 0 },
  { id: 'b-6', category: 'Educação', limit: 300, spent: 0 },
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
  updateAccount: (id: string, data: Partial<Omit<Account, 'id'>>) => void;
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

  const updateAccount = useCallback((id: string, data: Partial<Omit<Account, 'id'>>) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  }, []);

  // When deleting account, reassign transactions to empty string (will show "Sem conta")
  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    setTransactions(prev => prev.map(t => t.accountId === id ? { ...t, accountId: '' } : t));
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
    if (type === 'expense') {
      setBudgets(prev => prev.filter(b => b.category !== name));
    }
  }, []);

  const updateCategory = useCallback((type: 'income' | 'expense', oldName: string, newName: string) => {
    setCategories(prev => ({ ...prev, [type]: prev[type].map(c => c === oldName ? newName : c) }));
    setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName } : t));
    setBudgets(prev => prev.map(b => b.category === oldName ? { ...b, category: newName } : b));
  }, []);

  const updateProfile = useCallback((data: Partial<Profile>) => {
    setProfile(prev => ({ ...prev, ...data }));
  }, []);

  return (
    <DataContext.Provider value={{
      transactions, accounts, cards, budgets, categories, profile,
      addTransaction, updateTransaction, deleteTransaction,
      addAccount, updateAccount, deleteAccount,
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
