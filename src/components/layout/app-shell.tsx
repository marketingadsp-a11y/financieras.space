
"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  BookCheck,
  LayoutDashboard,
  Undo2,
  ChevronDown,
  Contact,
  AppWindow,
  Briefcase,
  Folder,
  Home,
  ChevronRight,
  Folders,
  Landmark,
  ShieldAlert
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"


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
import { allTools, type Tool, type Plaza, type LoanControlCartera, type LoanControlGrupo } from "@/lib/data";
import { getPlazas, getPlazaById } from "@/services/plaza-service";
import { getCarterasByPlaza, getGruposByCartera, getGrupoById, getCarteraById } from "@/services/loan-control-service";


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
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"


type NavItem = {
  href?: string;
  label: string;
  icon: React.ElementType;
  superAdminOnly?: boolean;
  adminOnly?: boolean;
  children?: NavItem[];
};

const superAdminNavItems: NavItem[] = [
  { 
    label: "Clientes", 
    icon: Contact, 
    superAdminOnly: true,
    children: [
        { href: "/", label: "Administradores", icon: Users, superAdminOnly: true },
        { href: "/plazas", label: "Gestionar Plazas", icon: Building, superAdminOnly: true },
    ]
  },
  { href: "/panel-viewer", label: "Visualizador de Paneles", icon: LayoutDashboard, superAdminOnly: true },
  { href: "/tools", label: "Herramientas", icon: Wrench, superAdminOnly: true },
  { 
    label: "Ajustes", 
    icon: Settings, 
    superAdminOnly: true,
    children: [
        { href: "/settings", label: "Aplicación", icon: AppWindow, superAdminOnly: true },
        { href: "/settings/company-profile", label: "Perfil de Empresa", icon: Briefcase, superAdminOnly: true },
        { href: "/settings/super-admins", label: "Super Admins", icon: UserCog, superAdminOnly: true },
        { href: "/settings/users", label: "Usuarios de Plaza", icon: Users2, superAdminOnly: true },
    ]
  },
];

const adminNavItems: NavItem[] = [
    { href: "/plazas", label: "Gestionar Plazas", icon: Building, adminOnly: true },
    { href: "/settings/users", label: "Gestionar Usuarios", icon: Users2, adminOnly: true },
    { href: "/tools", label: "Herramientas", icon: Wrench, adminOnly: true },
    { 
        label: "Ajustes", 
        icon: Settings, 
        adminOnly: true,
        children: [
            { href: "/settings/company-profile", label: "Perfil de Empresa", icon: Briefcase, adminOnly: true },
        ]
    },
];

const carteraVencidaNavItems: NavItem[] = [
    { href: "/tools/overdue-portfolio", label: "Resumen General", icon: Building },
    { href: "/tools/overdue-portfolio/admins", label: "Gestionar Admins", icon: ShieldCheck },
];

const incomeExpensesNavItems: NavItem[] = [
    { href: "/tools/income-expenses", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tools/income-expenses/sucursales", label: "Gestionar Sucursales", icon: Building },
    { href: "/tools/income-expenses/users", label: "Gestionar Usuarios", icon: Users2 },
];
const incomeExpensesSettingsItems: NavItem[] = [
    { href: "/tools/income-expenses/categories", label: "Gestionar Categorías", icon: ListTree },
    { href: "/tools/income-expenses/danger-zone", label: "Zona de Peligro", icon: ShieldAlert },
]


const dailyControlNavItems: NavItem[] = [
    { href: "/tools/daily-control", label: "Resumen Diario", icon: BookCheck },
];

const dailyControlSettingsItems: NavItem[] = [
    { href: "/tools/daily-control/categories", label: "Gestionar Categorías", icon: ListTree },
];

function PlazaNavLinks({toolPrefix}: {toolPrefix: string}) {
    const { user } = useAuth();
    const pathname = usePathname();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchUserPlazas = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                // If the user is a plaza user, we use their direct plazaAccess list
                if (user.isPlazaUser) {
                    const userPlazas = user.plazaAccess?.map(pa => ({
                        id: pa.plazaId,
                        name: pa.plazaName,
                        pendingDebt: 0, // Not needed for nav
                        recoveryRate: 0, // Not needed for nav
                    })) || [];
                     setPlazas(userPlazas.sort((a,b) => a.name.localeCompare(b.name)));
                } else {
                    // For admins, fetch based on their prefix
                    const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
                    const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
                    setPlazas(plazasFromDb.sort((a,b) => a.name.localeCompare(b.name)));
                }

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
                        <Link href={`/${toolPrefix}/plaza/${plaza.id}`}>
                            <SidebarMenuButton asChild isActive={pathname === `/${toolPrefix}/plaza/${plaza.id}`} tooltip={plaza.name}>
                                <span>
                                    <Building />
                                    <span>{plaza.name}</span>
                                </span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function LoanControlNav() {
    const pathname = usePathname();
    const params = pathname.split('/').filter(Boolean);
    const { user } = useAuth();
    const [navState, setNavState] = React.useState<{ plazas: Plaza[], carteras: LoanControlCartera[], grupos: LoanControlGrupo[], activePlazaId: string | null, activeCarteraId: string | null }>({ plazas: [], carteras: [], grupos: [], activePlazaId: null, activeCarteraId: null });
    const [isLoading, setIsLoading] = React.useState(true);

    const currentPlazaId = params.includes('plaza') ? params[params.indexOf('plaza') + 1] : null;
    const currentCarteraId = params.includes('cartera') ? params[params.indexOf('cartera') + 1] : null;
    const currentGrupoId = params.includes('grupo') ? params[params.indexOf('grupo') + 1] : null;

    React.useEffect(() => {
        const fetchNavData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
                const plazas = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
                
                let activePlazaId: string | null = currentPlazaId;
                let activeCarteraId: string | null = currentCarteraId;
                let fetchedCarteras: LoanControlCartera[] = [];
                let fetchedGrupos: LoanControlGrupo[] = [];

                if (currentGrupoId) {
                    const grupo = await getGrupoById(currentGrupoId);
                    if (grupo) {
                        const cartera = await getCarteraById(grupo.carteraId);
                        if (cartera) {
                            activePlazaId = cartera.plazaId;
                            activeCarteraId = cartera.id;
                        }
                    }
                } else if (currentCarteraId) {
                    const cartera = await getCarteraById(currentCarteraId);
                    if (cartera) activePlazaId = cartera.plazaId;
                }
                
                if (activePlazaId) {
                    fetchedCarteras = await getCarterasByPlaza(activePlazaId);
                }
                
                if (activeCarteraId) {
                    fetchedGrupos = await getGruposByCartera(activeCarteraId);
                }

                setNavState({ 
                    plazas: plazas.sort((a,b) => a.name.localeCompare(b.name)), 
                    carteras: fetchedCarteras.sort((a,b) => a.name.localeCompare(b.name)), 
                    grupos: fetchedGrupos.sort((a,b) => a.name.localeCompare(b.name)),
                    activePlazaId,
                    activeCarteraId,
                });
            } catch (error) {
                console.error("Failed to fetch loan control nav", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNavData();
    }, [user, currentPlazaId, currentCarteraId, currentGrupoId]);
    
    if (isLoading) {
        return <div className="p-2 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Cargando...</div>
    }

    return (
        <SidebarGroup>
            <SidebarGroupLabel>CONTROL DE PRÉSTAMO</SidebarGroupLabel>
            <SidebarMenu>
                {navState.plazas.map(p => (
                    <Collapsible key={p.id} asChild defaultOpen={p.id === navState.activePlazaId}>
                         <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton asChild={false} tooltip={p.name} isActive={p.id === navState.activePlazaId} className="justify-between pr-1">
                                    <Link href={`/tools/loan-control/plaza/${p.id}`} className="flex-1 flex items-center gap-2">
                                        <Building/><span>{p.name}</span>
                                    </Link>
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {(p.id === navState.activePlazaId && navState.carteras.length > 0) ? navState.carteras.map(c => (
                                        <Collapsible key={c.id} asChild defaultOpen={c.id === navState.activeCarteraId}>
                                            <SidebarMenuSubItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuSubButton isActive={c.id === navState.activeCarteraId} className="justify-between pr-1">
                                                        <Link href={`/tools/loan-control/cartera/${c.id}`} className="flex-1 flex items-center gap-2">
                                                            <Folder/><span>{c.name}</span>
                                                        </Link>
                                                        <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
                                                    </SidebarMenuSubButton>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <ul className="pl-4 border-l ml-[7px] my-1 py-1 space-y-1">
                                                        {(c.id === navState.activeCarteraId && navState.grupos.length > 0) ? navState.grupos.map(g => (
                                                            <li key={g.id}>
                                                                <Link href={`/tools/loan-control/grupo/${g.id}`}>
                                                                    <SidebarMenuSubButton size="sm" asChild isActive={g.id === currentGrupoId}>
                                                                        <span><Users2/><span>{g.name}</span></span>
                                                                    </SidebarMenuSubButton>
                                                                </Link>
                                                            </li>
                                                        )) : (c.id === navState.activeCarteraId && <li className="px-2 py-1 text-xs text-muted-foreground">No hay grupos</li>)}
                                                    </ul>
                                                </CollapsibleContent>
                                            </SidebarMenuSubItem>
                                        </Collapsible>
                                    )) : (p.id === navState.activePlazaId && <div className="px-4 py-2 text-xs text-muted-foreground">No hay carteras</div>)}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}



function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const isCarteraVencidaPath = pathname.startsWith('/tools/overdue-portfolio');
  const isDailyControlPath = pathname.startsWith('/tools/daily-control');
  const isLoanControlPath = pathname.startsWith('/tools/loan-control');
  const isIncomeExpensesPath = pathname.startsWith('/tools/income-expenses');
  
  if (user?.isPlazaUser) {
      // Plaza users only see links to tools they have access to, and plazas within Cartera Vencida
      const userTools = allTools.filter(tool => user.accessibleTools?.includes(tool.id));
      
      const mainNavItems = userTools.map(tool => ({
        href: tool.href,
        label: tool.name,
        icon: tool.icon,
      }));

      return (
        <>
            {isCarteraVencidaPath && <PlazaNavLinks toolPrefix="tools/overdue-portfolio" />}
            <SidebarGroup>
                 <SidebarGroupLabel>HERRAMIENTAS</SidebarGroupLabel>
                <SidebarMenu>
                    {mainNavItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href!}>
                                <SidebarMenuButton asChild isActive={pathname.startsWith(item.href!)} tooltip={item.label}>
                                    <span>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        </>
      )
  }

  if (isCarteraVencidaPath) {
    const hasAccessToTool = user?.isSuperAdmin || user?.isToolAdmin || user?.accessibleTools?.includes('cartera-vencida');
    const items = hasAccessToTool ? carteraVencidaNavItems : [];
    
    return (
        <>
            {hasAccessToTool && <PlazaNavLinks toolPrefix="tools/overdue-portfolio" />}
            <SidebarGroup>
                <SidebarGroupLabel>GESTIÓN</SidebarGroupLabel>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarMenuItem key={item.href}>
                        <Link href={item.href!}>
                            <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                                <span>
                                    <item.icon />
                                    <span>{item.label}</span>
                                </span>
                            </SidebarMenuButton>
                        </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
       </>
    );
  }
  
  if (isIncomeExpensesPath) {
      return (
      <>
        <SidebarGroup>
          <SidebarGroupLabel>GESTIÓN</SidebarGroupLabel>
          <SidebarMenu>
            {incomeExpensesNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href!}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    <span>
                      <item.icon />
                      <span>{item.label}</span>
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>CONFIGURACIÓN</SidebarGroupLabel>
          <SidebarMenu>
            {incomeExpensesSettingsItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href!}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    <span>
                      <item.icon />
                      <span>{item.label}</span>
                    </span>
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
                <Link href={item.href!}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    <span>
                      <item.icon />
                      <span>{item.label}</span>
                    </span>
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
                <Link href={item.href!}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                    <span>
                      <item.icon />
                      <span>{item.label}</span>
                    </span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </>
    );
  }
  
    if (isLoanControlPath) {
        return <LoanControlNav />;
    }


  const getNavItems = () => {
    if (user?.isSuperAdmin) {
      return superAdminNavItems;
    }
    return adminNavItems;
  }

  const availableNavItems = getNavItems();
  
  const renderNavItems = (items: NavItem[]) => {
    return items.map((item, index) => {
        if (item.children && item.children.length > 0) {
            const isChildActive = item.children.some(child => child.href && pathname.startsWith(child.href));
            return (
                <Collapsible key={`${item.label}-${index}`} asChild defaultOpen={isChildActive}>
                    <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton tooltip={item.label} className="justify-between">
                                <div className="flex items-center gap-2">
                                    <item.icon />
                                    <span>{item.label}</span>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 data-[state=open]:rotate-180" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {item.children.map(child => (
                                    <SidebarMenuSubItem key={child.href}>
                                        <Link href={child.href!}>
                                            <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                                                <span>
                                                    <child.icon />
                                                    <span>{child.label}</span>
                                                </span>
                                            </SidebarMenuSubButton>
                                        </Link>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </SidebarMenuItem>
                </Collapsible>
            )
        }
        
        return (
            <SidebarMenuItem key={item.href}>
                <Link href={item.href!}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                        <span>
                            <item.icon />
                            <span>{item.label}</span>
                        </span>
                </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        )
    });
  }

  return (
    <SidebarMenu>
      {renderNavItems(availableNavItems)}
    </SidebarMenu>
  );
}

function ImpersonationBar() {
    const { impersonation, stopImpersonating } = useAuth();
    if (!impersonation) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center justify-center bg-yellow-400 px-4 text-sm font-semibold text-black shadow-lg">
            <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-1 text-center">
                <span>
                    Estás viendo como: <strong className="font-bold">{impersonation.username}</strong> ({impersonation.role})
                    {impersonation.prefix && <span className="ml-2 font-normal">| Empresa: <strong className="font-bold">{impersonation.prefix}</strong></span>}
                </span>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-auto px-2 py-1 hover:bg-yellow-500"
                    onClick={stopImpersonating}
                >
                    <Undo2 className="mr-2 h-4 w-4" />
                    Volver a mi panel
                </Button>
            </div>
        </div>
    )
}


export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout, impersonation } = useAuth();
  const pathname = usePathname();

  if (!user) {
    return <>{children}</>
  }
  
  const isCarteraVencidaPath = pathname.startsWith('/tools/overdue-portfolio');
  const isDailyControlPath = pathname.startsWith('/tools/daily-control');
  const isLoanControlPath = pathname.startsWith('/tools/loan-control');
  const isIncomeExpensesPath = pathname.startsWith('/tools/income-expenses');
  
  const getToolFromPath = () => {
    if (isCarteraVencidaPath) return allTools.find(tool => tool.id === 'cartera-vencida');
    if (isDailyControlPath) return allTools.find(tool => tool.id === 'daily-control');
    if (isLoanControlPath) return allTools.find(tool => tool.id === 'loan-control');
    if (isIncomeExpensesPath) return allTools.find(tool => tool.id === 'income-expenses');
    return null;
  }

  const currentTool = getToolFromPath();
  
  const getUserRoleLabel = () => {
    if (user.isSuperAdmin && !impersonation) return 'Financieras MX';
    if (user.isToolAdmin) return 'Admin de Herramienta';
    if (user.isPlazaUser) return user.name;
    return 'Admin';
  }

  const showBackButton = (isCarteraVencidaPath || isDailyControlPath || isLoanControlPath || isIncomeExpensesPath) && !user.isSuperAdmin && !user.isToolAdmin;

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 p-2">
            <Link href="/tools" className="flex items-center gap-3">
              <UserCog className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
                  {getUserRoleLabel()}
                </span>
                {currentTool && (
                  <span className="text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
                    {currentTool.name}
                  </span>
                )}
              </div>
            </Link>
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
                      <SidebarMenuButton asChild tooltip="Volver a Herramientas">
                        <span>
                            <ChevronLeft />
                            <span>Todas las Herramientas</span>
                        </span>
                      </SidebarMenuButton>
                   </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
           )}
        </SidebarContent>
      </Sidebar>
      <SidebarInset className={cn(impersonation && "pt-12")}>
        <ImpersonationBar />
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
