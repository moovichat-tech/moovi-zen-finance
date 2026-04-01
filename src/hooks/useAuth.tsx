import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userId: string | null;
  telefone: string | null;
  token: string | null;
  login: (token: string, userId: string, telefone: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userId: null,
  telefone: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [telefone, setTelefone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('moovi-auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if token is still valid (basic expiry check)
        const payload = JSON.parse(atob(parsed.token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          setToken(parsed.token);
          setUserId(parsed.userId);
          setTelefone(parsed.telefone);
        } else {
          localStorage.removeItem('moovi-auth');
        }
      } catch {
        localStorage.removeItem('moovi-auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((token: string, userId: string, telefone: string) => {
    setToken(token);
    setUserId(userId);
    setTelefone(telefone);
    localStorage.setItem('moovi-auth', JSON.stringify({ token, userId, telefone }));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserId(null);
    setTelefone(null);
    localStorage.removeItem('moovi-auth');
  }, []);

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!token,
      userId,
      telefone,
      token,
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
