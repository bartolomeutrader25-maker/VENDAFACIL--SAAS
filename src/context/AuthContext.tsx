import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Company, SubscriptionStatus } from '../types/index.js';
import { api } from '../lib/api.js';
import { useToast } from './ToastContext.js';

export interface CompanyAccessState {
  allowed: boolean;
  reason?: string;
  status: SubscriptionStatus;
  daysRemaining: number;
  plan: string;
  isTrial: boolean;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  access: CompanyAccessState | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: (data: { email: string; name?: string; avatar?: string; googleId?: string; companyName?: string; businessType?: string }) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  updateCompanyData: (company: Company) => void;
  setCompany: (company: Company) => void;
  isOnboardingCompleted: boolean;
  completeOnboarding: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [access, setAccess] = useState<CompanyAccessState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    return localStorage.getItem('vf_onboarding_done') === 'true';
  });

  const { success, error } = useToast();

  const loadCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      // Clean up legacy mock IDs if stored
      const storedCompId = localStorage.getItem('vf_company_id');
      if (storedCompId === 'comp-demo-01' || storedCompId === 'comp-02') {
        localStorage.removeItem('vf_company_id');
        localStorage.removeItem('vf_user_id');
        localStorage.removeItem('vf_token');
        setUser(null);
        setCompany(null);
        setAccess(null);
        return;
      }

      const res = await api.getMe();
      if (res && res.user && res.company) {
        setUser(res.user);
        setCompany(res.company);
        if (res.access) {
          setAccess(res.access);
        }
        localStorage.setItem('vf_user_id', res.user.id);
        localStorage.setItem('vf_company_id', res.company.id);
      } else {
        setUser(null);
        setCompany(null);
        setAccess(null);
      }
    } catch {
      setUser(null);
      setCompany(null);
      setAccess(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.login({ email, password: pass });
      setUser(res.user);
      setCompany(res.company);
      if (res.access) setAccess(res.access);
      localStorage.setItem('vf_token', res.token);
      localStorage.setItem('vf_user_id', res.user.id);
      localStorage.setItem('vf_company_id', res.company.id);
      success(`Bem-vindo de volta, ${res.user.name}!`);
      return true;
    } catch (err: any) {
      error(err.message || 'Erro ao efetuar login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (googleData: { email: string; name?: string; avatar?: string; googleId?: string; companyName?: string; businessType?: string }): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.loginWithGoogle(googleData);
      setUser(res.user);
      setCompany(res.company);
      if (res.access) setAccess(res.access);
      localStorage.setItem('vf_token', res.token);
      localStorage.setItem('vf_user_id', res.user.id);
      localStorage.setItem('vf_company_id', res.company.id);
      success(`🎉 Bem-vindo ao VendaFácil, ${res.user.name}!`);
      return true;
    } catch (err: any) {
      error(err.message || 'Erro ao autenticar com a conta Google');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.register(data);
      setUser(res.user);
      setCompany(res.company);
      if (res.trial) {
        setAccess({
          allowed: true,
          status: 'trial',
          daysRemaining: res.trial.daysRemaining,
          plan: res.company.planId || 'pro',
          isTrial: true
        });
      }
      localStorage.setItem('vf_token', res.token);
      localStorage.setItem('vf_user_id', res.user.id);
      localStorage.setItem('vf_company_id', res.company.id);
      setIsOnboardingCompleted(false);
      localStorage.removeItem('vf_onboarding_done');
      success(`🎉 Empresa ${res.company.name} criada com sucesso com ${res.trial?.daysRemaining || 7} dias de teste gratuito!`);
      return true;
    } catch (err: any) {
      error(err.message || 'Erro ao criar conta');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    try {
      setIsLoading(true);
      localStorage.setItem('vf_user_id', userId);
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
        setCompany(res.company);
        if (res.access) setAccess(res.access);
        localStorage.setItem('vf_company_id', res.company.id);
        success(`Alternado para ${res.user.name} (${res.user.role})`);
      }
    } catch (err: any) {
      error('Erro ao alternar utilizador');
    } finally {
      setIsLoading(false);
    }
  };

  const switchCompany = async (companyId: string) => {
    try {
      setIsLoading(true);
      localStorage.setItem('vf_company_id', companyId);
      localStorage.removeItem('vf_user_id');
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
        setCompany(res.company);
        if (res.access) setAccess(res.access);
        success(`Alternado para empresa: ${res.company.name}`);
      }
    } catch (err: any) {
      error('Erro ao alternar empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setCompany(null);
    setAccess(null);
    localStorage.removeItem('vf_token');
    localStorage.removeItem('vf_user_id');
    localStorage.removeItem('vf_company_id');
    success('Sessão terminada');
  };

  const updateCompanyData = (updated: Company) => {
    setCompany(updated);
  };

  const completeOnboarding = () => {
    setIsOnboardingCompleted(true);
    localStorage.setItem('vf_onboarding_done', 'true');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        access,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        switchUser,
        switchCompany,
        updateCompanyData,
        setCompany: updateCompanyData,
        isOnboardingCompleted,
        completeOnboarding,
        refreshAuth: loadCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
