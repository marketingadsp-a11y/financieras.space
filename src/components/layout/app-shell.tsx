
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  LogOut,
  UserCog,
  Wrench,
  Settings,
  Building,
  ShieldCheck,
  Users2,
  ChevronLeft,
  Loader2,
  ListTree,
  BookCheck
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { allTools, type Tool, type Plaza } from "@/lib/data";
import { getPlazas } from "@/services/plaza-service";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator
} from "@/components/ui/sidebar"


type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
};

const superAdminNavItems: NavItem[] = [
  { href: "/", label: "Administradores", icon: Users, superAdminOnly: true },
  { href: "/plazas", label: "Gestionar Plazas", icon: Building, superAdminOnly: true },
  { href: "/users", label: "Gestionar Usuarios", icon: Users2, superAdminOnly: true },
  { href: "/tools", label: "Herramientas", icon: Wrench, superAdminOnly: true },
  { href: "/settings", label: "Configuración", icon: Settings, superAdminOnly: true },
];

const carteraVencidaNavItems: NavItem[] = [
    { href: "/tools/overdue-portfolio", label: "Resumen General", icon: Building },
    { href: "/tools/overdue-portfolio/admins", label: "Gestionar Admins", icon: ShieldCheck },
];

const dailyControlNavItems: NavItem[] = [
    { href: "/tools/daily-control", label: "Resumen Diario", icon: BookCheck },
];

const dailyControlSettingsItems: NavItem[] = [
    { href: "/tools/daily-control/categories", label: "Gestionar Categorías", icon: ListTree },
]

function PlazaNavLinks() {
    const { user } = useAuth();
    const pathname = usePathname();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchUserPlazas = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // Fetch all for super/tool admins, prefixed for global admins
                const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
                const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
                setPlazas(plazasFromDb.sort((a,b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Failed to fetch plazas for nav", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserPlazas();
    }, [user]);

    if (isLoading) {
        return (
            <div className="p-2 space-y-2">
                <div className="flex items-center gap-2 p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Cargando plazas...</span>
                </div>
            </div>
        )
    }

    if (plazas.length === 0) {
        return null;
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>PLAZAS</SidebarGroupLabel>
            <SidebarMenu>
                {plazas.map((plaza) => (
                    <SidebarMenuItem key={plaza.id}>
                        <Link href={`/tools/overdue-portfolio/plaza/${plaza.id}`}>
                            <SidebarMenuButton isActive={pathname === `/tools/overdue-portfolio/plaza/${plaza.id}`} tooltip={plaza.name}>
                                <Building />
                                <span>{plaza.name}</span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isCarteraVencidaPath = pathname.startsWith('/tools/overdue-portfolio');
  const isDailyControlPath = pathname.startsWith('/tools/daily-control');

  if (isCarteraVencidaPath) {
    const hasAccessToTool = user?.isSuperAdmin || user?.isToolAdmin || user?.accessibleTools?.includes('cartera-vencida');
    const items = hasAccessToTool ? carteraVencidaNavItems : [];
    
    return (
        <>
            {hasAccessToTool && <PlazaNavLinks />}
            <SidebarGroup>
                <SidebarGroupLabel>GESTIÓN</SidebarGroupLabel>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                        <Link href={item.href}>
                            <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                                <item.icon />
                                <span>{item.label}</span>
                            </SidebarMenuButton>
                        </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
       </>
    );
  }

  if (isDailyControlPath) {
    return (
      <>
        <SidebarGroup>
          <SidebarGroupLabel>CONTROL DIARIO</SidebarGroupLabel>
          <SidebarMenu>
            {dailyControlNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>CONFIGURACIÓN</SidebarGroupLabel>
          <SidebarMenu>
            {dailyControlSettingsItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </>
    );
  }

  const getNavItems = () => {
    if (user?.isSuperAdmin) {
      return superAdminNavItems;
    }
     if (user?.isPlazaUser) {
      // Plaza users see a list of their assigned plazas
      return user.plazaAccess?.map(pa => ({
        href: `/tools/overdue-portfolio/plaza/${pa.plazaId}`,
        label: pa.plazaName,
        icon: Building,
        superAdminOnly: false,
      })) || [];
    }
    // For regular admins, show their accessible tools
    const adminNavItems = [];
    
    // Centralized Plaza Management for Admins
    adminNavItems.push({ href: "/plazas", label: "Gestionar Plazas", icon: Building, superAdminOnly: false });
    adminNavItems.push({ href: "/users", label: "Gestionar Usuarios", icon: Users2, superAdminOnly: false });
    adminNavItems.push({ href: "/tools", label: "Herramientas", icon: Wrench, superAdminOnly: false });


    return adminNavItems;
  }

  const availableNavItems = getNavItems();

  return (
    <SidebarMenu>
      {availableNavItems.map((item) => (
         <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
             <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                <item.icon />
                <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}


export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return <>{children}</>
  }
  
  const isCarteraVencidaPath = pathname.startsWith('/tools/overdue-portfolio');
  const isDailyControlPath = pathname.startsWith('/tools/daily-control');
  
  const getToolFromPath = () => {
    if (isCarteraVencidaPath) return allTools.find(tool => tool.id === 'cartera-vencida');
    if (isDailyControlPath) return allTools.find(tool => tool.id === 'daily-control');
    return null;
  }

  const currentTool = getToolFromPath();
  
  const getUserRoleLabel = () => {
    if (user.isSuperAdmin) return 'Super Admin';
    if (user.isToolAdmin) return 'Admin de Herramienta';
    if (user.isPlazaUser) return 'Usuario de Plaza';
    return 'Admin';
  }

  const showBackButton = (isCarteraVencidaPath || isDailyControlPath) && !user.isSuperAdmin && !user.isToolAdmin;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <UserCog className="h-6 w-6 text-primary" />
             <div className="flex flex-col">
              <span className="font-semibold group-data-[collapsible=icon]:hidden">
                {getUserRoleLabel()}
              </span>
              {currentTool && (
                <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {currentTool.name}
                </span>
              )}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
           <NavLinks />
           { showBackButton && (
            <>
              <SidebarSeparator />
              <SidebarMenu>
                <SidebarMenuItem>
                   <Link href="/tools">
                      <SidebarMenuButton tooltip="Volver a Herramientas">
                        <ChevronLeft />
                        <span>Todas las Herramientas</span>
                      </SidebarMenuButton>
                   </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
           )}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <SidebarTrigger />
          <div className="flex-1" />
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
