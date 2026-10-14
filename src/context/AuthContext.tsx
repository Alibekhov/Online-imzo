import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/client';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('docsign_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('docsign_token');
    if (!savedToken) {
      // Auto-authenticate with seeded demo account for immediate zero-barrier access
      try {
        const res = await api.auth.login({ email: 'sender@example.com', password: 'password123' });
        api.setToken(res.token);
        setToken(res.token);
        setUser(res.user);
      } catch (err) {
        console.warn('Auto-login fallback:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const res = await api.auth.getMe();
      setUser(res.user);
    } catch (err) {
      console.warn('Session expired or invalid, reconnecting demo account:', err);
      try {
        const res = await api.auth.login({ email: 'sender@example.com', password: 'password123' });
        api.setToken(res.token);
        setToken(res.token);
        setUser(res.user);
      } catch {
        api.clearToken();
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (fullName: string, email: string, password: string, phone?: string) => {
    const res = await api.auth.register({ full_name: fullName, email, password, phone });
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    api.clearToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
