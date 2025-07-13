
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getAdminByUsername } from '@/services/admin-service';
import { getSuperAdminByUsername, getSuperAdminById } from '@/services/super-admin-service';
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
  prefix?: string;
  createdBy?: string; // SuperAdmin ID
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
      const parsedUser = JSON.parse(storedUser);
       // Eagerly load prefix for super admins if missing
      if (parsedUser.isSuperAdmin && !parsedUser.prefix) {
          getSuperAdminById(parsedUser.id).then(fullSuperAdmin => {
              if(fullSuperAdmin) {
                  const updatedUser = {...parsedUser, prefix: fullSuperAdmin.prefix};
                  setUser(updatedUser);
                  localStorage.setItem('appUser', JSON.stringify(updatedUser));
              }
          })
      } else {
        setUser(parsedUser);
      }
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
         // Redirect PlazaUser to their first accessible tool
         const firstToolPath = user.accessibleTools?.[0];
         if (firstToolPath) {
           router.push(`/tools/${firstToolPath}`);
         } else {
           // Fallback if no tools assigned, though this shouldn't happen with validation
           router.push('/tools');
         }
       }
       else router.push('/tools');
    }
  }, [user, loading, pathname, router]);


  const login = async (emailOrUsername: string, pass: string): Promise<boolean> => {
    try {
       // Handle prefixed usernames
      let prefix: string | undefined = undefined;
      let usernamePart = emailOrUsername;
      if (emailOrUsername.includes('.')) {
        const parts = emailOrUsername.split('.');
        prefix = parts[0];
        usernamePart = parts.slice(1).join('.');
      }


      // 1. Check for Super Admin (no prefix for login usually, but could be typed)
      const superAdmin = await getSuperAdminByUsername(emailOrUsername);
      if (superAdmin && superAdmin.password === pass) {
          const userData: User = { id: superAdmin.id, username: superAdmin.username, isSuperAdmin: true, isToolAdmin: false, isPlazaUser: false, prefix: superAdmin.prefix };
          localStorage.setItem('appUser', JSON.stringify(userData));
          setUser(userData);
          return true;
      }
      
      // 2. Check for Global Admin (with prefix)
      const admin = await getAdminByUsername(usernamePart, prefix);
      if (admin && admin.password === pass && admin.status === "Activo") {
         const userData: User = { id: admin.id, username: admin.name, isSuperAdmin: false, isToolAdmin: false, isPlazaUser: false, accessibleTools: admin.accessibleTools || [], prefix: admin.prefix, createdBy: admin.createdBy };
         localStorage.setItem('appUser', JSON.stringify(userData));
         setUser(userData);
         return true;
      } else if (admin && admin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      // 3. Check for Tool Admin (with prefix)
      const toolAdmin = await getToolAdminByUsername(usernamePart, prefix);
      if (toolAdmin && toolAdmin.password === pass && toolAdmin.status === "Activo") {
         const userData: User = { id: toolAdmin.id, username: toolAdmin.name, isSuperAdmin: false, isToolAdmin: true, isPlazaUser: false, accessibleTools: [toolAdmin.toolId], prefix: toolAdmin.prefix, createdBy: toolAdmin.createdBy };
         localStorage.setItem('appUser', JSON.stringify(userData));
         setUser(userData);
         return true;
      } else if (toolAdmin && toolAdmin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      // 4. Check for Plaza User (with prefix)
      const plazaUser = await getPlazaUserByUsername(usernamePart, prefix);
      if (plazaUser && plazaUser.password === pass && plazaUser.status === "Activo") {
         const userData: User = { id: plazaUser.id, username: plazaUser.name, isSuperAdmin: false, isToolAdmin: false, isPlazaUser: true, plazaAccess: plazaUser.plazaAccess, accessibleTools: plazaUser.accessibleTools, prefix: plazaUser.prefix };
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

    