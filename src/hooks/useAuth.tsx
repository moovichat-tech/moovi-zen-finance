import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { PlanTier } from '@/components/PlanGuard';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  telefone: string | null;
  token: string | null;
  plano: PlanTier;
  gatewayPagamento: string | null;
  renovacaoAutomatica: boolean;
  statusUsuario: string;
  planoFuturo: string | null;
  login: (token: string, userId: string, telefone: string) => void;
  logout: () => void;
  refreshPlano: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  telefone: null,
  token: null,
  plano: 'basico',
  gatewayPagamento: null,
  renovacaoAutomatica: true,
  statusUsuario: 'Ativo',
  planoFuturo: null,
  login: () => {},
  logout: () => {},
  refreshPlano: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [telefone, setTelefone] = useState<string | null>(null);
  const [plano, setPlano] = useState<PlanTier>('basico');
  const [gatewayPagamento, setGatewayPagamento] = useState<string | null>(null);
  const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(true);
  const [statusUsuario, setStatusUsuario] = useState('Ativo');
  const [planoFuturo, setPlanoFuturo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlano = useCallback(async (authToken: string) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-plano`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const p = String(data.plano || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") as PlanTier;
        if (p === 'basico' || p === 'pro' || p === 'premium') {
          setPlano(p);
        }
        setGatewayPagamento(data.gateway_pagamento || null);
        setRenovacaoAutomatica(data.renovacao_automatica !== false);
        setStatusUsuario(data.status || 'Ativo');
        setPlanoFuturo(data.plano_futuro || null);
      }
    } catch {
      // keep default basico
    }
  }, []);

  const lastFetchRef = useCallback(() => ({ ts: 0 }), []);
  const lastFetch = useState(() => ({ ts: 0 }))[0];

  // Revalidate plan on tab focus (30s throttle)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastFetch.ts < 30_000) return;
        const currentToken = localStorage.getItem('moovi-auth');
        if (currentToken) {
          try {
            const parsed = JSON.parse(currentToken);
            const payload = JSON.parse(atob(parsed.token.split('.')[1]));
            if (payload.exp * 1000 > Date.now()) {
              lastFetch.ts = now;
              fetchPlano(parsed.token);
            }
          } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchPlano, lastFetch]);

  useEffect(() => {
    const saved = localStorage.getItem('moovi-auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const payload = JSON.parse(atob(parsed.token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setToken(parsed.token);
          setUserId(parsed.userId);
          setTelefone(parsed.telefone);
          fetchPlano(parsed.token);
        } else {
          localStorage.removeItem('moovi-auth');
        }
      } catch {
        localStorage.removeItem('moovi-auth');
      }
    }
    setIsLoading(false);
  }, [fetchPlano]);

  const login = useCallback((token: string, userId: string, telefone: string) => {
    setToken(token);
    setUserId(userId);
    setTelefone(telefone);
    localStorage.setItem('moovi-auth', JSON.stringify({ token, userId, telefone }));
    fetchPlano(token);
  }, [fetchPlano]);

  const logout = useCallback(() => {
    setToken(null);
    setUserId(null);
    setTelefone(null);
    setPlano('basico');
    setGatewayPagamento(null);
    setRenovacaoAutomatica(true);
    setStatusUsuario('Ativo');
    setPlanoFuturo(null);
    localStorage.removeItem('moovi-auth');
  }, []);

  const refreshPlano = useCallback(() => {
    if (token) fetchPlano(token);
  }, [token, fetchPlano]);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      userId,
      telefone,
      token,
      plano,
      gatewayPagamento,
      renovacaoAutomatica,
      statusUsuario,
      planoFuturo,
      login,
      logout,
      refreshPlano,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
