"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getAdminByEmail } from '@/services/admin-service';
import { getSuperAdminByUsername } from '@/services/super-admin-service';

interface User {
  id: string;
  username: string;
  isSuperAdmin: boolean;
  accessibleTools?: string[];
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUsername: string, pass: string) => Promise<void>;
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
    const isToolsSubPath = pathname.startsWith('/tools/');

    if (!user && !pathIsPublic) {
      router.push('/login');
    } else if (user && pathIsPublic) {
       router.push(user.isSuperAdmin ? '/' : '/tools');
    } else if (user && !user.isSuperAdmin && pathname === '/') {
        // Redirect normal admin from root to tools page
        router.push('/tools');
    } else if (user && !user.isSuperAdmin && (pathname === '/settings' || pathname === '/')) {
        router.push('/tools');
    } else if (user && !user.isSuperAdmin && isToolsSubPath) {
        const toolId = 'cartera-vencida';
        const hasAccess = user.accessibleTools?.includes(toolId);
        if(!hasAccess) {
            router.push('/tools');
        }
    }


  }, [user, loading, pathname, router]);


  const login = async (emailOrUsername: string, pass: string) => {
    // Check for Super Admin first
    const superAdmin = await getSuperAdminByUsername(emailOrUsername);
    if (superAdmin && superAdmin.password === pass) {
        const userData: User = { id: superAdmin.id, username: superAdmin.username, isSuperAdmin: true };
        localStorage.setItem('appUser', JSON.stringify(userData));
        setUser(userData);
        router.push('/');
        return;
    }
    
    // Then check for normal Admin
    const admin = await getAdminByEmail(emailOrUsername);
    if (admin && admin.password === pass && admin.status === "Activo") {
       const userData: User = { id: admin.id, username: admin.name, isSuperAdmin: false, accessibleTools: admin.accessibleTools || [] };
       localStorage.setItem('appUser', JSON.stringify(userData));
       setUser(userData);
       router.push('/tools'); // This was the important part
       return;
    } else if (admin && admin.status === "Inactivo") {
        throw new Error('Este usuario se encuentra inactivo.');
    }
    
    throw new Error('Usuario/Email o contraseña incorrectos.');
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
