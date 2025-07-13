
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getAdminByUsername } from '@/services/admin-service';
import { getSuperAdminByUsername } from '@/services/super-admin-service';
import { getToolAdminByUsername } from '@/services/tool-admin-service';
import { getPlazaUserByUsername } from '@/services/plaza-user-service';
import type { PlazaAccess } from '@/lib/data';

interface User {
  id: string;
  username: string;
  isSuperAdmin: boolean;
  isToolAdmin: boolean;
  isPlazaUser: boolean;
  accessibleTools?: string[];
  plazaAccess?: PlazaAccess[];
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUsername: string, pass: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  hasPermission: (plazaId: string, permission: string) => boolean;
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
       if (user.isSuperAdmin) router.push('/');
       else if (user.isPlazaUser) {
         const firstPlaza = user.plazaAccess?.[0]?.plazaId;
         if(firstPlaza) router.push(`/tools/overdue-portfolio/plaza/${firstPlaza}`);
         else router.push('/tools');
       }
       else router.push('/tools');
    }
  }, [user, loading, pathname, router]);


  const login = async (emailOrUsername: string, pass: string): Promise<boolean> => {
    try {
      // 1. Check for Super Admin
      const superAdmin = await getSuperAdminByUsername(emailOrUsername);
      if (superAdmin && superAdmin.password === pass) {
          const userData: User = { id: superAdmin.id, username: superAdmin.username, isSuperAdmin: true, isToolAdmin: false, isPlazaUser: false };
          localStorage.setItem('appUser', JSON.stringify(userData));
          setUser(userData);
          return true;
      }
      
      // 2. Check for Global Admin
      const admin = await getAdminByUsername(emailOrUsername);
      if (admin && admin.password === pass && admin.status === "Activo") {
         const userData: User = { id: admin.id, username: admin.name, isSuperAdmin: false, isToolAdmin: false, isPlazaUser: false, accessibleTools: admin.accessibleTools || [] };
         localStorage.setItem('appUser', JSON.stringify(userData));
         setUser(userData);
         return true;
      } else if (admin && admin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      // 3. Check for Tool Admin
      const toolAdmin = await getToolAdminByUsername(emailOrUsername);
      if (toolAdmin && toolAdmin.password === pass && toolAdmin.status === "Activo") {
         const userData: User = { id: toolAdmin.id, username: toolAdmin.name, isSuperAdmin: false, isToolAdmin: true, isPlazaUser: false, accessibleTools: [toolAdmin.toolId] };
         localStorage.setItem('appUser', JSON.stringify(userData));
         setUser(userData);
         return true;
      } else if (toolAdmin && toolAdmin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      // 4. Check for Plaza User
      const plazaUser = await getPlazaUserByUsername(emailOrUsername);
      if (plazaUser && plazaUser.password === pass && plazaUser.status === "Activo") {
         const userData: User = { id: plazaUser.id, username: plazaUser.name, isSuperAdmin: false, isToolAdmin: false, isPlazaUser: true, plazaAccess: plazaUser.plazaAccess };
         localStorage.setItem('appUser', JSON.stringify(userData));
         setUser(userData);
         return true;
      } else if (plazaUser && plazaUser.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }
      
      throw new Error('Usuario/Email o contraseña incorrectos.');
    } catch (error) {
        console.error(error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Ocurrió un error inesperado durante el inicio de sesión.');
    }
  };

  const logout = () => {
    localStorage.removeItem('appUser');
    setUser(null);
    router.push('/login');
  };

  const hasPermission = (plazaId: string, permission: string): boolean => {
    if (!user) return false;
    // SuperAdmins, ToolAdmins, and global Admins with access have all permissions
    if (user.isSuperAdmin || user.isToolAdmin || user.accessibleTools?.includes('cartera-vencida')) {
      return true;
    }
    if (user.isPlazaUser) {
      const plazaAccess = user.plazaAccess?.find(p => p.plazaId === plazaId);
      return !!plazaAccess?.permissions.includes(permission as any);
    }
    return false;
  }

  const value = { user, login, logout, loading, hasPermission };

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
