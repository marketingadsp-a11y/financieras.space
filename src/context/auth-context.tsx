

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { getAdminByUsername, getAdminById } from '@/services/admin-service';
import { getSuperAdminByUsername, getSuperAdminById } from '@/services/super-admin-service';
import { getToolAdminByUsername, getToolAdminById } from '@/services/tool-admin-service';
import { getPlazaUserByUsername } from '@/services/plaza-user-service';
import { getCompanyProfileByPrefix } from "@/services/company-profile-service";
import type { PlazaAccess, Admin, SucursalAccess, IncomeExpensesPermission, LoanControlPermission, LoanControlPermissions, LinkedAdminAccess, FlujoPermissions, FlujoPermission, Permission, OverduePortfolioPermissions, OverduePortfolioPermission, RegistroOficinaAccess, RegistroOficinaPermission } from '@/lib/data';
import { getCustomizedTools } from '@/lib/data';

interface User {
  id: string;
  username: string;
  name: string;
  isSuperAdmin: boolean;
  isToolAdmin: boolean;
  isPlazaUser: boolean;
  accessibleTools?: string[];
  plazaAccess?: PlazaAccess[];
  sucursalAccess?: SucursalAccess[];
  loanControlPermissions?: LoanControlPermissions;
  flujoPermissions?: FlujoPermissions;
  overduePortfolioPermissions?: OverduePortfolioPermissions;
  registroOficinaAccess?: RegistroOficinaAccess[];
  prefix?: string;
  createdBy?: string; // SuperAdmin ID
  linkedAdmins?: LinkedAdminAccess[];
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
  hasPermission: (id: string, permission: string) => boolean;
  impersonateUser: (userId: string, role: 'Admin' | 'ToolAdmin' | 'PlazaUser', allowedTools?: string[]) => Promise<void>;
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
            role: 'Admin',
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
    const superAdminOnlyPaths = ['/settings/super-admins', '/admin-users'];
    const adminRootPath = '/settings/admins';

    if (!user && !pathIsPublic) {
      router.push('/login');
    } else if (user) {
        if (pathIsPublic) {
            if (user.isSuperAdmin && !impersonation) {
                router.replace(adminRootPath);
            } else {
                router.replace('/tools');
            }
            return;
        }
        
        if (!user.isSuperAdmin && (superAdminOnlyPaths.some(p => pathname.startsWith(p)) || pathname === adminRootPath)) {
            router.replace('/tools');
            return;
        }

        if (pathname === '/') {
            if (user.isSuperAdmin && !impersonation) {
                router.replace(adminRootPath);
            } else {
                router.replace('/tools');
            }
        }
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
          const userData: User = { id: superAdmin.id, username: superAdmin.username, name: superAdmin.username, isSuperAdmin: true, isToolAdmin: false, isPlazaUser: false, prefix: superAdmin.prefix };
          handleSuccessfulLogin(userData);
          return true;
      }
      
      const admin = await getAdminByUsername(usernamePart, prefix);
      if (admin && admin.password === pass && admin.status === "Activo") {
         const userData: User = { id: admin.id, username: admin.username, name: admin.name, isSuperAdmin: false, isToolAdmin: false, isPlazaUser: false, accessibleTools: admin.accessibleTools || [], prefix: admin.prefix, createdBy: admin.createdBy, linkedAdmins: admin.linkedAdmins };
         handleSuccessfulLogin(userData);
         return true;
      } else if (admin && admin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      const toolAdmin = await getToolAdminByUsername(usernamePart, prefix);
      if (toolAdmin && toolAdmin.password === pass && toolAdmin.status === "Activo") {
         const userData: User = { id: toolAdmin.id, username: toolAdmin.username, name: toolAdmin.name, isSuperAdmin: false, isToolAdmin: true, isPlazaUser: false, accessibleTools: [toolAdmin.toolId], prefix: toolAdmin.prefix, createdBy: toolAdmin.createdBy, sucursalAccess: toolAdmin.sucursalAccess };
         handleSuccessfulLogin(userData);
         return true;
      } else if (toolAdmin && toolAdmin.status === "Inactivo") {
          throw new Error('Este usuario se encuentra inactivo.');
      }

      const plazaUser = await getPlazaUserByUsername(usernamePart, prefix);
      if (plazaUser && plazaUser.password === pass && plazaUser.status === "Activo") {
         const userData: User = { 
             id: plazaUser.id, 
             username: plazaUser.username, 
             name: plazaUser.name, 
             isSuperAdmin: false, isToolAdmin: false, isPlazaUser: true, 
             plazaAccess: plazaUser.plazaAccess, 
             accessibleTools: plazaUser.accessibleTools, 
             prefix: plazaUser.prefix, 
             loanControlPermissions: plazaUser.loanControlPermissions, 
             flujoPermissions: plazaUser.flujoPermissions, 
             overduePortfolioPermissions: plazaUser.overduePortfolioPermissions,
             registroOficinaAccess: plazaUser.registroOficinaAccess,
         };
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
  
  const impersonateUser = async (userId: string, role: 'Admin' | 'ToolAdmin' | 'PlazaUser', allowedTools?: string[]) => {
    if (!user) return;
    
    let impersonatedUser: any | null = null;
    let userRole = '';
    
    switch (role) {
        case 'Admin':
            impersonatedUser = await getAdminById(userId);
            userRole = 'Admin';
            break;
        case 'ToolAdmin':
             impersonatedUser = await getToolAdminById(userId);
             userRole = 'Admin de Herramienta';
            break;
        // Add PlazaUser case if needed
    }
    
    if (impersonatedUser) {
        let userData: User;
        if (role === 'Admin') {
            userData = {
                id: impersonatedUser.id,
                username: impersonatedUser.username,
                name: impersonatedUser.name,
                isSuperAdmin: false, isToolAdmin: false, isPlazaUser: false,
                accessibleTools: allowedTools || impersonatedUser.accessibleTools || [],
                prefix: impersonatedUser.prefix,
                createdBy: impersonatedUser.createdBy,
                linkedAdmins: impersonatedUser.linkedAdmins,
            };
        } else if (role === 'ToolAdmin') {
            userData = {
                id: impersonatedUser.id,
                username: impersonatedUser.username,
                name: impersonatedUser.name,
                isSuperAdmin: false, isToolAdmin: true, isPlazaUser: false,
                accessibleTools: [impersonatedUser.toolId],
                sucursalAccess: impersonatedUser.sucursalAccess || [],
                prefix: impersonatedUser.prefix,
                createdBy: impersonatedUser.createdBy,
            };
        } else {
            return;
        }

        localStorage.setItem('originalAppUser', JSON.stringify(user));
        localStorage.setItem('appUser', JSON.stringify(userData));
        setUser(userData);
        updateTitle(userData.prefix);
        setImpersonation({ 
            username: impersonatedUser.name || impersonatedUser.username, 
            role: userRole,
            prefix: impersonatedUser.prefix,
        });
        router.push('/tools'); // Redirect to the user's main view
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

  const hasPermission = (id: string, permission: string): boolean => {
    if (!user) return false;
    
    if (user.isSuperAdmin || (!user.isToolAdmin && !user.isPlazaUser)) {
      return true;
    }
    
    if (user.isToolAdmin) {
      const toolId = user.accessibleTools?.[0];
      if (toolId === 'income-expenses') {
        const sucursalAccess = user.sucursalAccess?.find(sa => sa.sucursalId === id);
        return !!sucursalAccess?.permissions.includes(permission as IncomeExpensesPermission);
      }
    }

    if (user.isPlazaUser) {
        const currentPathToolId = getCustomizedTools().find(t => pathname.startsWith(t.href))?.id;

        if (currentPathToolId === 'cartera-vencida') {
             // For cartera-vencida, permissions are not tied to a specific plazaId
            return !!user.overduePortfolioPermissions?.permissions.includes(permission as OverduePortfolioPermission);
        }
        if (currentPathToolId === 'loan-control') {
            return !!user.loanControlPermissions?.permissions.includes(permission as LoanControlPermission);
        }
        if (currentPathToolId === 'flujo') {
            return !!user.flujoPermissions?.permissions.includes(permission as FlujoPermission);
        }
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
