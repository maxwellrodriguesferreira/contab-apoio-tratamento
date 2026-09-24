import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { AuthService } from '../services/auth/authService';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAttendant: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      const current = AuthService.getCurrentUser();
      setUser(current);
    } catch (e) {
      console.error('Erro ao inicializar sessão de autenticação:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const loggedUser = await AuthService.login(email, password);
      setUser(loggedUser);
      showToast(`Bem-vindo, ${loggedUser.name}!`, 'success', 'Login Concluído');
      return loggedUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao autenticar.';
      showToast(msg, 'error', 'Falha no Acesso');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    AuthService.clearSession();
    setUser(null);
    showToast('Sessão encerrada com sucesso.', 'info');
  };

  const refreshUser = () => {
    const current = AuthService.getCurrentUser();
    setUser(current);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user && user.active,
    isAdmin: !!user && user.role === 'ADMIN',
    isAttendant: !!user && user.role === 'ATENDENTE',
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
