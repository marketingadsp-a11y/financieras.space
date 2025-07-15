
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getAdminByUsername, getAdminById } from '@/services/admin-service';
import { getSuperAdminByUsername, getSuperAdminById } from '@/services/super-admin-service';
import { getToolAdminByUsername } from '@/services/tool-admin-service';
import { getPlazaUserByUsername } from '@/services/plaza-user-service';
import { getCompanyProfileByPrefix } from "@/services/company-profile-service";
import type { PlazaAccess, Admin } from '@/lib/data';

interface User {
  id: string;
  username: string;
  name?: string; // name for Admins, username for SuperAdmins
  isSuperAdmin: boolean;
  isToolAdmin: boolean;
  isPlazaUser: boolean;
  accessibleTools?: string[];
  plazaAccess?: PlazaAccess[];
  prefix?: string;
  createdBy?: string; // SuperAdmin ID
}

interface ImpersonationInfo {
    username: string;
    role: string;
    prefix?: string;
}

interface AuthContextType {
  user: User | null;
  impersonation: ImpersonationInfo | null;
  login: (emailOrUsername: string, pass: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  hasPermission: (plazaId: string, permission: string) => boolean;
  impersonateUser: (userId: string, role: 'Admin' | 'ToolAdmin' | 'PlazaUser') => Promise<void>;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const updateTitle = async (prefix?: string) => {
    if (prefix) {
        try {
            const profile = await getCompanyProfileByPrefix(prefix);
            if (profile?.companyName) {
                document.title = profile.companyName;
                return;
            }
        } catch (error) {
            console.error("Could not fetch company profile for title", error);
        }
    }
    // Fallback to app name from localStorage or default
    const storedAppName = localStorage.getItem('appName');
    document.title = storedAppName || "Panel de Administración";
};


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const originalUser = localStorage.getItem('originalAppUser');
    const currentUser = localStorage.getItem('appUser');
    
    if (currentUser) {
      const parsedUser = JSON.parse(currentUser);
      setUser(parsedUser);
      updateTitle(parsedUser.prefix); // Update title on initial load

      if (originalUser) {
        const parsedOriginalUser = JSON.parse(originalUser);
        setImpersonation({ 
            username: parsedUser.name || parsedUser.username, 
            role: parsedOriginalUser.isSuperAdmin ? 'Admin' : 'Unknown',
            prefix: parsedUser.prefix,
        });
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
       if (user.isSuperAdmin && !impersonation) router.push('/');
       else if (user.isPlazaUser) {
         const firstToolPath = user.accessibleTools?.[0] ? `/tools/${user.accessibleTools[0]}` : '/tools';
         router.push(firstToolPath);
       }
       else router.push('/tools');
    }
  }, [user, loading, pathname, router, impersonation]);


  const login = async (emailOrUsername: string, pass: string): Promise<boolean> => {
    try {
      let prefix: string | undefined = undefined;
      let usernamePart = emailOrUsername;
      if (emailOrUsername.includes('.')) {
        const parts = emailOrUsername.split('.');
        prefix = parts[0];
        usernamePart = parts.slice(1).join('.');
      }

      const handleSuccessfulLogin = (userData: User) => {
          localStorage.setItem('appUser', JSON.stringify(userData));
          setUser(userData);
          updateTitle(userData.prefix);
      };

      const superAdmin = await getSuperAdminByUsername(emailOrUsername);
      if (superAdmin && superAdmin.password === pass) {
          const userData: User = { id: superAdmin.id, username: superAdmin.username, isSuperAdmin: true, isToolAdmin: false, isPlazaUser: false, prefix: superAdmin.prefix };
          handleSuccessfulLogin(userData);
          return true;
      }
      
      const admin = await getAdminByUsername(usernamePart, prefix);
      if (admin && admin.password === pass && admin.status === "Activo") {
         const userData: User = { id: admin.id, username: admin.username, name: admin.name, isSuperAdmin: false, isToolAdmin: false, isPlazaUser: false, accessibleTools: admin.accessibleTools || [], prefix: admin.prefix, createdBy: admin.createdBy };
         handleSuccessfulLogin(userData);
         return true;
      } else if (admin && admin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      const toolAdmin = await getToolAdminByUsername(usernamePart, prefix);
      if (toolAdmin && toolAdmin.password === pass && toolAdmin.status === "Activo") {
         const userData: User = { id: toolAdmin.id, username: toolAdmin.username, name: toolAdmin.name, isSuperAdmin: false, isToolAdmin: true, isPlazaUser: false, accessibleTools: [toolAdmin.toolId], prefix: toolAdmin.prefix, createdBy: toolAdmin.createdBy };
         handleSuccessfulLogin(userData);
         return true;
      } else if (toolAdmin && toolAdmin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      const plazaUser = await getPlazaUserByUsername(usernamePart, prefix);
      if (plazaUser && plazaUser.password === pass && plazaUser.status === "Activo") {
         const userData: User = { id: plazaUser.id, username: plazaUser.username, name: plazaUser.name, isSuperAdmin: false, isToolAdmin: false, isPlazaUser: true, plazaAccess: plazaUser.plazaAccess, accessibleTools: plazaUser.accessibleTools, prefix: plazaUser.prefix };
         handleSuccessfulLogin(userData);
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
  
  const impersonateUser = async (userId: string, role: 'Admin' | 'ToolAdmin' | 'PlazaUser') => {
    if (!user || !user.isSuperAdmin) return;
    
    let impersonatedAdmin: Admin | null = null;
    if (role === 'Admin') {
        impersonatedAdmin = await getAdminById(userId);
    }
    // Add logic for other roles if needed
    
    if (impersonatedAdmin) {
        const impersonatedUserData: User = {
            id: impersonatedAdmin.id,
            username: impersonatedAdmin.username,
            name: impersonatedAdmin.name,
            isSuperAdmin: false,
            isToolAdmin: false,
            isPlazaUser: false,
            accessibleTools: impersonatedAdmin.accessibleTools || [],
            prefix: impersonatedAdmin.prefix,
            createdBy: impersonatedAdmin.createdBy,
        };
        localStorage.setItem('originalAppUser', JSON.stringify(user));
        localStorage.setItem('appUser', JSON.stringify(impersonatedUserData));
        setUser(impersonatedUserData);
        updateTitle(impersonatedUserData.prefix);
        setImpersonation({ 
            username: impersonatedAdmin.name, 
            role: 'Admin',
            prefix: impersonatedAdmin.prefix,
        });
        router.push('/tools'); // Redirect to the admin's main view
    }
  };

  const stopImpersonating = () => {
    const originalUserJson = localStorage.getItem('originalAppUser');
    if (originalUserJson) {
        const originalUser = JSON.parse(originalUserJson);
        localStorage.setItem('appUser', JSON.stringify(originalUser));
        localStorage.removeItem('originalAppUser');
        setUser(originalUser);
        updateTitle(originalUser.prefix);
        setImpersonation(null);
        router.push('/panel-viewer');
    }
  };

  const logout = () => {
    localStorage.removeItem('appUser');
    localStorage.removeItem('originalAppUser');
    setUser(null);
    setImpersonation(null);
    router.push('/login');
  };

  const hasPermission = (plazaId: string, permission: string): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin || user.isToolAdmin || (user.accessibleTools?.includes('cartera-vencida') && !user.isPlazaUser) ) {
      return true;
    }
    if (user.isPlazaUser) {
      const plazaAccess = user.plazaAccess?.find(p => p.plazaId === plazaId);
      return !!plazaAccess?.permissions.includes(permission as any);
    }
    return false;
  }

  const value = { user, impersonation, login, logout, loading, hasPermission, impersonateUser, stopImpersonating };

  return (
    <AuthContext.Provider value={value}>
        {loading ? (
             <div className="flex h-screen items-center justify-center">Cargando...</div>
        ) : user && pathname !== '/login' ? (
            <AppShell>{children}</AppShell>
        ) : (
             children
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
