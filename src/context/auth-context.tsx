"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getAdminByEmail } from '@/services/admin-service';

interface User {
  id: string;
  username: string;
  email: string;
  isSuperAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
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
    const storedUser = localStorage.getItem('appUser');
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
      router.push(user.isSuperAdmin ? '/' : '/tools');
    }
  }, [user, loading, pathname, router]);


  const login = async (email: string, pass: string) => {
    // Super Admin login
    if (email.toLowerCase() === 'cristobal' && pass === '0120') {
      const userData: User = { id: 'superadmin01', username: 'Cristobal', email: 'cristobal', isSuperAdmin: true };
      localStorage.setItem('appUser', JSON.stringify(userData));
      setUser(userData);
      router.push('/');
      return;
    }

    // Normal Admin login
    const admin = await getAdminByEmail(email);
    
    if (admin && admin.password === pass && admin.status === "Activo") {
       const userData: User = { id: admin.id, username: admin.name, email: admin.email, isSuperAdmin: false };
       localStorage.setItem('appUser', JSON.stringify(userData));
       setUser(userData);
       router.push('/tools');
    } else if (admin && admin.status === "Inactivo") {
        throw new Error('Este usuario se encuentra inactivo.');
    }
    else {
      throw new Error('Email o contraseña incorrectos.');
    }
  };

  const logout = () => {
    localStorage.removeItem('appUser');
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
