'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AuthMode = 'view' | 'admin';

interface AuthContextType {
  mode: AuthMode;
  isAdmin: boolean;
  sheetUrl: string;
  loginAdmin: (username: string, password: string, url: string) => Promise<boolean>;
  enterViewMode: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AuthMode>('view');
  const [isAdmin, setIsAdmin] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('mtc_auth_mode') as AuthMode | null;
    const savedUrl = localStorage.getItem('mtc_script_url') || '';
    if (savedMode === 'admin') {
      setMode('admin');
      setIsAdmin(true);
      setSheetUrl(savedUrl);
    } else if (savedMode === 'view') {
      setMode('view');
      setIsAdmin(false);
    }
    setHydrated(true);
  }, []);

  const loginAdmin = async (username: string, password: string, url: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setMode('admin');
        setIsAdmin(true);
        setSheetUrl(url);
        localStorage.setItem('mtc_auth_mode', 'admin');
        localStorage.setItem('mtc_script_url', url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const enterViewMode = () => {
    setMode('view');
    setIsAdmin(false);
    localStorage.setItem('mtc_auth_mode', 'view');
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout API failed', e);
    }
    setMode('view');
    setIsAdmin(false);
    setSheetUrl('');
    localStorage.removeItem('mtc_auth_mode');
    localStorage.removeItem('mtc_script_url');
  };

  // Don't render until hydrated to avoid flash
  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ mode, isAdmin, sheetUrl, loginAdmin, enterViewMode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
