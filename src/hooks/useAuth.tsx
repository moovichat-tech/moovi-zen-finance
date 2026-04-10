import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { PlanTier } from '@/components/PlanGuard';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  telefone: string | null;
  token: string | null;
  plano: PlanTier;
  login: (token: string, userId: string, telefone: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  telefone: null,
  token: null,
  plano: 'basico',
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [telefone, setTelefone] = useState<string | null>(null);
  const [plano, setPlano] = useState<PlanTier>('basico');
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
        const p = data.plano as PlanTier;
        if (p === 'basico' || p === 'pro' || p === 'premium') {
          setPlano(p);
        }
      }
    } catch {
      // keep default basico
    }
  }, []);

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
    localStorage.removeItem('moovi-auth');
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      userId,
      telefone,
      token,
      plano,
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
