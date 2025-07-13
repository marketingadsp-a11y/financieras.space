
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
  ChevronLeft
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
import { allTools, type Tool } from "@/lib/data";

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
  { href: "/tools", label: "Herramientas", icon: Wrench, superAdminOnly: true },
  { href: "/settings", label: "Configuración", icon: Settings, superAdminOnly: true },
];

const carteraVencidaNavItems: NavItem[] = [
    { href: "/tools/overdue-portfolio", label: "Resumen General", icon: Building },
    { href: "/tools/overdue-portfolio/plazas", label: "Gestionar Plazas", icon: Building },
    { href: "/tools/overdue-portfolio/admins", label: "Gestionar Admins", icon: ShieldCheck },
    { href: "/tools/overdue-portfolio/users", label: "Gestionar Usuarios", icon: Users2 },
    { href: "/tools/overdue-portfolio/settings", label: "Ajustes", icon: Settings },
];

function NavLinks() {
  const pathname = usePathname();
  const { user } = useAuth();

  const isCarteraVencidaPath = pathname.startsWith('/tools/overdue-portfolio');

  if (isCarteraVencidaPath) {
    return (
       <SidebarGroup>
            <SidebarGroupLabel>GESTIÓN</SidebarGroupLabel>
            <SidebarMenu>
                {carteraVencidaNavItems.map((item) => (
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
    );
  }


  const getNavItems = () => {
    if (user?.isSuperAdmin) {
      return superAdminNavItems;
    }
    // For regular admins, show their accessible tools
    return allTools
      .filter(tool => user?.accessibleTools?.includes(tool.id))
      .map(tool => ({
        href: tool.href,
        label: tool.name,
        icon: Wrench, // Using a generic icon for all tools
        superAdminOnly: false,
      }));
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
  const carteraVencidaTool = allTools.find(tool => tool.id === 'cartera-vencida');


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <UserCog className="h-6 w-6 text-primary" />
             <div className="flex flex-col">
              <span className="font-semibold group-data-[collapsible=icon]:hidden">
                {user.isSuperAdmin ? 'Super Admin' : 'Admin'}
              </span>
              {isCarteraVencidaPath && carteraVencidaTool && (
                <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  {carteraVencidaTool.name}
                </span>
              )}
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
           <NavLinks />
           { isCarteraVencidaPath && (
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
