"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem('superAdminUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;

    const publicPaths = ['/login'];
    const pathIsPublic = publicPaths.includes(pathname);

    if (!user && !pathIsPublic) {
      router.push('/login');
    } else if (user && pathIsPublic) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);


  const login = async (username: string, pass: string) => {
    // This is a mock login. In a real app, you'd call an API.
    if (username.toLowerCase() === 'cristobal' && pass === '0120') {
      const userData: User = { id: 'superadmin01', username: 'Cristobal' };
      localStorage.setItem('superAdminUser', JSON.stringify(userData));
      setUser(userData);
      router.push('/');
    } else {
      throw new Error('Nombre de usuario o contraseña incorrectos.');
    }
  };

  const logout = () => {
    localStorage.removeItem('superAdminUser');
    setUser(null);
    router.push('/login');
  };

  const value = { user, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
        {loading ? (
             <div className="flex h-screen items-center justify-center">Cargando...</div>
        ) : (
            <AppShell>{children}</AppShell>
        )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
