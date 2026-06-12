

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
  BookCheck,
  LayoutDashboard,
  Undo2,
  ChevronDown,
  Contact,
  AppWindow,
  Briefcase,
  Folder,
  Folders,
  Landmark,
  ShieldAlert,
  Swords,
  UserSquare2,
  LifeBuoy,
  ArrowRight,
  Home,
  Ticket,
  CalendarClock,
  Percent,
  History,
  Upload,
  HandCoins,
  DollarSign,
  Calendar,
  CalendarCheck,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Printer,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"


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
import { getCustomizedTools, type Tool, type Plaza, type LoanControlCartera, type LoanControlGrupo } from "@/lib/data";
import { getPlazas, getPlazaById } from "@/services/plaza-service";
import { getCarterasByPlaza, getGruposByCartera, getGrupoById, getCarteraById } from "@/services/loan-control-service";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { FileText, FileSpreadsheet, Download, Images } from "lucide-react";


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
        { href: "/settings/admins", label: "Gestionar Admins", icon: Users, superAdminOnly: true },
        { href: "/admin-users", label: "Usuarios de Admins", icon: UserSquare2, superAdminOnly: true },
        { href: "/plazas", label: "Gestionar Plazas", icon: Building, superAdminOnly: true },
    ]
  },
  { href: "/panel-viewer", label: "Cambiar de Panel", icon: Swords, superAdminOnly: true },
  { href: "/tools", label: "Herramientas", icon: Wrench, superAdminOnly: true },
  { 
    label: "Ajustes", 
    icon: Settings, 
    superAdminOnly: true,
    children: [
        { href: "/settings", label: "Aplicación", icon: AppWindow, superAdminOnly: true },
        { href: "/settings/company-profile", label: "Perfil de Empresa", icon: Briefcase, superAdminOnly: true },
        { href: "/settings/super-admins", label: "Super Admins", icon: UserCog, superAdminOnly: true },
        { href: "/settings/support-tickets", label: "Tickets de Soporte", icon: Ticket, superAdminOnly: true },
    ]
  },
];

const adminSettingsNavItems: NavItem[] = [
    { href: "/panel-viewer", label: "Cambiar de Panel", icon: Swords, adminOnly: true },
];

const carteraVencidaNavItems: NavItem[] = [
    { href: "/tools/overdue-portfolio", label: "Resumen General", icon: LayoutDashboard },
    { href: "/plazas", label: "Gestionar Plazas", icon: Building },
    { href: "/tools/overdue-portfolio/admins", label: "Gestionar Admins", icon: ShieldCheck },
    { href: "/tools/overdue-portfolio/history", label: "Historial", icon: History },
];

const carteraVencidaSettingsItems: NavItem[] = [
    { href: "/tools/overdue-portfolio/settings", label: "Importar / Exportar", icon: Upload },
    { href: "/tools/overdue-portfolio/danger-zone", label: "Zona de Peligro", icon: ShieldAlert },
];


const incomeExpensesNavItems: NavItem[] = [
    { href: "/tools/income-expenses", label: "Panel", icon: LayoutDashboard },
    { href: "/tools/income-expenses/sucursales", label: "Gestionar Sucursales", icon: Building },
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

const mensualesNavItems: NavItem[] = [
    { href: "/tools/mensuales", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tools/mensuales/oficinas", label: "Oficinas", icon: Building },
    { href: "/tools/mensuales/clientes", label: "Clientes", icon: Users },
    { href: "/tools/mensuales/interes", label: "Interés", icon: Percent },
];

const mensualesSettingsItems: NavItem[] = [
    { href: "/tools/mensuales/settings", label: "Importar / Exportar", icon: Upload },
    { href: "/tools/mensuales/settings/danger-zone", label: "Zona de Peligro", icon: ShieldAlert },
];

const registroOficinaNavItems: NavItem[] = [
    { href: "/tools/registro-oficina", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tools/registro-oficina/oficinas", label: "Gestionar Oficinas", icon: Building },
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
                        toolContext: 'overdue-portfolio', // Assuming, might need adjustment
                    })) || [];
                     setPlazas(userPlazas.sort((a,b) => a.name.localeCompare(b.name)) as Plaza[]);
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
    const { user } = useAuth();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchNavData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
                const fetchedPlazas = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll });
                setPlazas(fetchedPlazas);
            } catch (error) {
                console.error("Failed to fetch loan control nav plazas", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchNavData();
    }, [user]);

    if (isLoading) {
        return (
            <div className="p-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Cargando datos...</span>
            </div>
        );
    }

    const totalLoaned = plazas.reduce((acc, p) => acc + (p.totalLoanAmount || 0), 0);
    const totalDue = plazas.reduce((acc, p) => acc + (p.pendingDebt || 0), 0);

    const exportToPDF = () => {
        if (plazas.length === 0) return;

        // Separate active and inactive plazas
        const activePlazas = plazas.filter(p => (p.totalLoanAmount || 0) > 0 || (p.pendingDebt || 0) > 0);
        const inactivePlazas = plazas.filter(p => (p.totalLoanAmount || 0) === 0 && (p.pendingDebt || 0) === 0);

        // Calculate totals only for active plazas
        const pdfTotalLoaned = activePlazas.reduce((acc, p) => acc + (p.totalLoanAmount || 0), 0);
        const pdfTotalDue = activePlazas.reduce((acc, p) => acc + (p.pendingDebt || 0), 0);

        const doc = new jsPDF();

        // 1. Header Block (Indigo Theme)
        doc.setFillColor(30, 27, 75); // Deep Indigo (#1e1b4b)
        doc.rect(14, 15, 182, 22, 'F');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text("CONTROL DE PRÉSTAMOS - REPORTE EJECUTIVO", 20, 24);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(203, 213, 225); // Slate 300
        doc.text(`Emisión Global: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, 31);
        
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text(`Fecha: ${format(new Date(), 'dd/MM/yyyy')}`, 145, 27);

        // 2. KPI Cards
        const cardWidth = 58;
        const cardHeight = 22;
        const cardY = 43;

        // Card 1: Total Prestado (Green Theme)
        doc.setFillColor(240, 253, 244); // light green
        doc.rect(14, cardY, cardWidth, cardHeight, 'F');
        doc.setDrawColor(187, 247, 208); // border green
        doc.rect(14, cardY, cardWidth, cardHeight, 'S');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(22, 101, 52); // green-800
        doc.text("TOTAL PRESTADO (ACTIVAS)", 18, cardY + 6);
        doc.setFontSize(11);
        doc.text(`$${pdfTotalLoaned.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18, cardY + 14);

        // Card 2: Deuda Pendiente (Red Theme)
        doc.setFillColor(254, 242, 242); // light red
        doc.rect(14 + cardWidth + 4, cardY, cardWidth, cardHeight, 'F');
        doc.setDrawColor(254, 202, 202); // border red
        doc.rect(14 + cardWidth + 4, cardY, cardWidth, cardHeight, 'S');
        
        doc.setFontSize(7);
        doc.setTextColor(153, 27, 27); // red-800
        doc.text("DEUDA PENDIENTE (ACTIVAS)", 14 + cardWidth + 8, cardY + 6);
        doc.setFontSize(11);
        doc.text(`$${pdfTotalDue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14 + cardWidth + 8, cardY + 14);

        // Card 3: Plazas Activas (Indigo Theme)
        doc.setFillColor(238, 242, 255); // light indigo
        doc.rect(14 + (cardWidth * 2) + 8, cardY, cardWidth, cardHeight, 'F');
        doc.setDrawColor(199, 210, 254); // border indigo
        doc.rect(14 + (cardWidth * 2) + 8, cardY, cardWidth, cardHeight, 'S');
        
        doc.setFontSize(7);
        doc.setTextColor(55, 48, 163); // indigo-800
        doc.text("PLAZAS ACTIVAS / TOTAL", 14 + (cardWidth * 2) + 12, cardY + 6);
        doc.setFontSize(11);
        doc.text(`${activePlazas.length} de ${plazas.length}`, 14 + (cardWidth * 2) + 12, cardY + 14);

        // 3. Visual Chart: Comparative Bar Chart
        let nextY = 72;
        if (activePlazas.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text("DISTRIBUCIÓN DE CARTERA POR PLAZA (TOP 5)", 14, nextY);

            // Chart Legend
            doc.setFillColor(74, 222, 128); // green
            doc.rect(125, nextY - 3, 3, 3, 'F');
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.text("Prestado", 130, nextY - 0.5);

            doc.setFillColor(248, 113, 113); // red
            doc.rect(155, nextY - 3, 3, 3, 'F');
            doc.text("Pendiente", 160, nextY - 0.5);

            // Draw horizontal bars
            const sortedActive = [...activePlazas].sort((a, b) => (b.totalLoanAmount || 0) - (a.totalLoanAmount || 0));
            const topActive = sortedActive.slice(0, 5);
            const maxLoaned = Math.max(...topActive.map(p => p.totalLoanAmount || 0), 1);

            let chartY = nextY + 7;
            topActive.forEach((p) => {
                const name = p.name;
                const loaned = p.totalLoanAmount || 0;
                const due = p.pendingDebt || 0;
                const barWidthMax = 65; // mm max width

                const loanedWidth = (loaned / maxLoaned) * barWidthMax;
                const dueWidth = (due / maxLoaned) * barWidthMax;

                // Name
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(51, 65, 85);
                doc.text(name, 14, chartY);

                // Prestado Bar
                doc.setFillColor(240, 253, 244); // bg
                doc.rect(65, chartY - 2.5, barWidthMax, 3, 'F');
                doc.setFillColor(74, 222, 128); // bar green
                doc.rect(65, chartY - 2.5, loanedWidth, 3, 'F');

                // Pendiente Bar
                doc.setFillColor(254, 242, 242); // bg
                doc.rect(65, chartY + 1.5, barWidthMax, 3, 'F');
                doc.setFillColor(248, 113, 113); // bar red
                doc.rect(65, chartY + 1.5, dueWidth, 3, 'F');

                // Labels
                doc.setFont("helvetica", "normal");
                doc.setFontSize(6.5);
                doc.setTextColor(22, 101, 52);
                doc.text(`$${loaned.toLocaleString('es-MX', {maximumFractionDigits:0})}`, 65 + barWidthMax + 2, chartY - 0.5);
                doc.setTextColor(153, 27, 27);
                doc.text(`$${due.toLocaleString('es-MX', {maximumFractionDigits:0})}`, 65 + barWidthMax + 2, chartY + 3.5);

                chartY += 10;
            });
            nextY = chartY + 4;
        }

        // 4. Active Plazas Table
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text("DETALLE DE PLAZAS ACTIVAS", 14, nextY);

        autoTable(doc, {
            startY: nextY + 3,
            head: [['Plaza', 'Prefijo', 'Total Prestado', 'Deuda Pendiente']],
            body: activePlazas.map(p => [
                p.name,
                p.prefix || 'N/A',
                `$${(p.totalLoanAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `$${(p.pendingDebt || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ]),
            headStyles: {
                fillColor: [30, 27, 75],
                textColor: [255, 255, 255],
                fontSize: 8,
                fontStyle: 'bold',
            },
            bodyStyles: {
                fontSize: 7.5,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            margin: { left: 14, right: 14 },
        });

        nextY = (doc as any).lastAutoTable.finalY + 10;

        // 5. Inactive Plazas Table (separated, not in metrics)
        if (inactivePlazas.length > 0) {
            // Check if we need a new page for inactive plazas table
            if (nextY > 260) {
                doc.addPage();
                nextY = 20;
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // cool slate
            doc.text("PLAZAS SIN OPERACIÓN (SALDO EN $0)", 14, nextY);

            autoTable(doc, {
                startY: nextY + 3,
                head: [['Plaza', 'Prefijo', 'Estado']],
                body: inactivePlazas.map(p => [
                    p.name,
                    p.prefix || 'N/A',
                    'Sin actividad registrada'
                ]),
                headStyles: {
                    fillColor: [100, 116, 139],
                    textColor: [255, 255, 255],
                    fontSize: 8,
                    fontStyle: 'bold',
                },
                bodyStyles: {
                    fontSize: 7.5,
                    textColor: [100, 116, 139],
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: 14, right: 14 },
            });
        }

        const fileName = `Reporte_Ejecutivo_Control_Prestamo_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    };

    const exportToExcel = () => {
        if (plazas.length === 0) return;
        const dataToExport = plazas.map(p => ({
            'Plaza': p.name,
            'Prefijo': p.prefix,
            'Total Prestado': p.totalLoanAmount,
            'Deuda Pendiente': p.pendingDebt,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, [['Resumen Global de Plazas - Control de Préstamo']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Fecha de Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]], { origin: 'A2' });

        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A4' });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen de Plazas");
        const fileName = `Resumen_Global_Control_Prestamo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    return (
        <SidebarGroup>
            <SidebarGroupLabel>CONTROL DE PRÉSTAMO</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href="/tools/loan-control">
                        <SidebarMenuButton 
                            asChild 
                            isActive={pathname === "/tools/loan-control" || pathname.startsWith("/tools/loan-control/")} 
                            tooltip="Dashboard Principal"
                        >
                            <span>
                                <LayoutDashboard />
                                <span>Dashboard Principal</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
            
            {/* Panel de Reportes y Exportación Rápida */}
            <div className="mx-2 mt-4 space-y-3">
                {/* Métricas Globales */}
                <div className="p-2.5 rounded-lg border border-white/5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 glassmorphic space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Métricas Globales</p>
                    <div className="grid grid-cols-1 gap-1.5 text-xs">
                        <div className="flex justify-between items-center gap-1.5 p-1.5 rounded bg-emerald-555/10 dark:bg-emerald-500/5 border border-emerald-500/20">
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
                                PRESTADO
                            </span>
                            <span className="font-extrabold text-[10px] text-slate-800 dark:text-slate-200">
                                ${totalLoaned.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center gap-1.5 p-1.5 rounded bg-rose-555/10 dark:bg-rose-500/5 border border-rose-500/20">
                            <span className="text-[9px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-rose-500 shrink-0" />
                                PENDIENTE
                            </span>
                            <span className="font-extrabold text-[10px] text-rose-600 dark:text-rose-400">
                                ${totalDue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Panel de Exportación Rápida */}
                <div className="p-2.5 rounded-lg border border-white/5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 glassmorphic space-y-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Download className="h-2.5 w-2.5 text-indigo-500" />
                        REPORTES RÁPIDOS
                    </p>
                    
                    <div className="grid grid-cols-1 gap-1.5">
                        <button
                            onClick={exportToPDF}
                            disabled={plazas.length === 0}
                            className="w-full flex items-center gap-2 p-1.5 rounded text-left text-[10px] font-bold text-slate-700 dark:text-slate-350 bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 hover:text-rose-650 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all duration-300 group disabled:opacity-50"
                        >
                            <FileText className="h-3.5 w-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0 flex-1">
                                <div className="leading-tight">Descargar PDF</div>
                                <div className="text-[8px] font-medium text-muted-foreground truncate">Resumen global de plazas</div>
                            </div>
                        </button>
                        
                        <button
                            onClick={exportToExcel}
                            disabled={plazas.length === 0}
                            className="w-full flex items-center gap-2 p-1.5 rounded text-left text-[10px] font-bold text-slate-700 dark:text-slate-350 bg-white/60 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/60 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 hover:text-emerald-650 dark:hover:text-emerald-400 hover:border-emerald-500/30 transition-all duration-300 group disabled:opacity-50"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                            <div className="min-w-0 flex-1">
                                <div className="leading-tight">Descargar Excel</div>
                                <div className="text-[8px] font-medium text-muted-foreground truncate">Detalle global de plazas</div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </SidebarGroup>
    );
}



function NavLinks({ customTools }: { customTools: Tool[] }) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const isCarteraVencidaPath = pathname.startsWith('/tools/overdue-portfolio');
  const isDailyControlPath = pathname.startsWith('/tools/daily-control');
  const isLoanControlPath = pathname.startsWith('/tools/loan-control');
  const isIncomeExpensesPath = pathname.startsWith('/tools/income-expenses');
  const isFlujoPath = pathname.startsWith('/tools/flujo');
  const isMensualesPath = pathname.startsWith('/tools/mensuales');
  const isRegistroOficinaPath = pathname.startsWith('/tools/registro-oficina');
  const isVisorAppPath = pathname.startsWith('/tools/visor-app');
  const isConcentradoPath = pathname.startsWith('/tools/concentrado');
  const isControlVacacionesPath = pathname.startsWith('/tools/control-vacaciones');
  const isImprentaPath = pathname.startsWith('/tools/imprenta');
  
  if (user?.isPlazaUser) {
      // Plaza users only see links to tools they have access to, and plazas within Cartera Vencida
      const userTools = customTools.filter(tool => user.accessibleTools?.includes(tool.id));
      
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
            <SidebarGroup>
                <SidebarGroupLabel>CONFIGURACIÓN</SidebarGroupLabel>
                 <SidebarMenu>
                    {carteraVencidaSettingsItems.map((item) => (
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
    );
  }
  
  if (isIncomeExpensesPath) {
      const isToolAdminUser = user?.isToolAdmin;
      const mainNavItems = isToolAdminUser ? [incomeExpensesNavItems[0]] : incomeExpensesNavItems;

      // ToolAdmin can see categories if they have permission for any assigned sucursal
      const canManageCategories = user?.sucursalAccess?.some(sa => sa.permissions.includes('CAN_MANAGE_CATEGORIES'));
      const settingsNavItems = incomeExpensesSettingsItems.filter(item => {
        if (isToolAdminUser) {
            if (item.href?.includes('categories')) return canManageCategories;
            return false; // Hide other settings for tool admin
        }
        return true; // Show all settings for normal admin
      });


      return (
      <>
        <SidebarGroup>
          <SidebarGroupLabel>GESTIÓN</SidebarGroupLabel>
          <SidebarMenu>
            {mainNavItems.map((item) => (
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
        {settingsNavItems.length > 0 && (
             <SidebarGroup>
                <SidebarGroupLabel>CONFIGURACIÓN</SidebarGroupLabel>
                <SidebarMenu>
                    {settingsNavItems.map((item) => (
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
        )}
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

    if (isFlujoPath) {
        return (
            <SidebarGroup>
                <SidebarGroupLabel>FLUJO</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href="/tools/flujo">
                            <SidebarMenuButton asChild isActive={pathname === "/tools/flujo"} tooltip="Dashboard de Flujo">
                                <span>
                                    <LayoutDashboard />
                                    <span>Dashboard</span>
                                </span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        )
    }

    if (isMensualesPath) {
        return (
             <>
                <SidebarGroup>
                    <SidebarGroupLabel>GESTIÓN</SidebarGroupLabel>
                    <SidebarMenu>
                        {mensualesNavItems.map((item) => (
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
                <SidebarGroup>
                    <SidebarGroupLabel>CONFIGURACIÓN</SidebarGroupLabel>
                    <SidebarMenu>
                        {mensualesSettingsItems.map((item) => (
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

    if (isRegistroOficinaPath) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>REGISTRO OFICINA</SidebarGroupLabel>
            <SidebarMenu>
                {registroOficinaNavItems.map((item) => (
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
    );
    }
    
    if (isVisorAppPath) {
        return (
            <SidebarGroup>
                <SidebarGroupLabel>VISOR APP</SidebarGroupLabel>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <Link href="/tools/visor-app">
                            <SidebarMenuButton asChild isActive={pathname === '/tools/visor-app'} tooltip="Supervisores">
                                <span><Users /><span>Supervisores</span></span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/tools/visor-app/settings">
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/tools/visor-app/settings')} tooltip="Configuración">
                                <span><Settings /><span>Configuración</span></span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        );
    }

    if (isConcentradoPath) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel>CONCENTRADO</SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href="/tools/concentrado">
                        <SidebarMenuButton asChild isActive={pathname === "/tools/concentrado"} tooltip="Dashboard de Concentrado">
                            <span>
                                <LayoutDashboard />
                                <span>Dashboard</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <Link href="/tools/concentrado/cierre">
                        <SidebarMenuButton asChild isActive={pathname === "/tools/concentrado/cierre"} tooltip="Cierre Mensual">
                            <span>
                                <CalendarCheck />
                                <span>Cierre</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/tools/concentrado/resumen">
                        <SidebarMenuButton asChild isActive={pathname === "/tools/concentrado/resumen"} tooltip="Resumen Mensual">
                            <span>
                                <Calendar />
                                <span>Resumen</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <Link href="/tools/concentrado/oficinas">
                        <SidebarMenuButton asChild isActive={pathname === "/tools/concentrado/oficinas"} tooltip="Gestión de Oficinas">
                            <span>
                                <Building />
                                <span>Gestión de Oficinas</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/tools/concentrado/caja-chica">
                        <SidebarMenuButton asChild isActive={pathname === "/tools/concentrado/caja-chica"} tooltip="Ver Caja Chica">
                            <span>
                                <DollarSign />
                                <span>Ver Caja Chica</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/tools/concentrado/settings">
                        <SidebarMenuButton asChild isActive={pathname === "/tools/concentrado/settings"} tooltip="Ajustes y Zona de Peligro">
                            <span>
                                <Settings />
                                <span>Ajustes</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
    }
    
    if (isControlVacacionesPath) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-bold text-slate-450 dark:text-slate-400 tracking-widest uppercase px-3 py-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Control de Vacaciones
            </SidebarGroupLabel>
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href="/tools/control-vacaciones">
                        <SidebarMenuButton 
                            asChild 
                            isActive={pathname === "/tools/control-vacaciones"} 
                            tooltip="Dashboard de Vacaciones"
                            className={cn(
                                "transition-all duration-200 hover:translate-x-1",
                                pathname === "/tools/control-vacaciones" && "bg-gradient-to-r from-primary/10 to-transparent text-primary dark:text-indigo-300 font-semibold border-l-2 border-primary rounded-l-none"
                            )}
                        >
                            <span>
                                <LayoutDashboard className={pathname === "/tools/control-vacaciones" ? "text-primary" : ""} />
                                <span>Dashboard</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/tools/control-vacaciones/empleados">
                        <SidebarMenuButton 
                            asChild 
                            isActive={pathname.startsWith("/tools/control-vacaciones/empleados")} 
                            tooltip="Gestión de Empleados"
                            className={cn(
                                "transition-all duration-200 hover:translate-x-1",
                                pathname.startsWith("/tools/control-vacaciones/empleados") && "bg-gradient-to-r from-primary/10 to-transparent text-primary dark:text-indigo-300 font-semibold border-l-2 border-primary rounded-l-none"
                            )}
                        >
                            <span>
                                <Users className={pathname.startsWith("/tools/control-vacaciones/empleados") ? "text-primary" : ""} />
                                <span>Empleados</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <Link href="/tools/control-vacaciones/settings">
                        <SidebarMenuButton 
                            asChild 
                            isActive={pathname.startsWith("/tools/control-vacaciones/settings")} 
                            tooltip="Ajustes de Vacaciones"
                            className={cn(
                                "transition-all duration-200 hover:translate-x-1",
                                pathname.startsWith("/tools/control-vacaciones/settings") && "bg-gradient-to-r from-primary/10 to-transparent text-primary dark:text-indigo-300 font-semibold border-l-2 border-primary rounded-l-none"
                            )}
                        >
                            <span>
                                <Settings className={pathname.startsWith("/tools/control-vacaciones/settings") ? "text-primary" : ""} />
                                <span>Ajustes</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/tools/control-vacaciones/tarjetas">
                        <SidebarMenuButton 
                            asChild 
                            isActive={pathname.startsWith("/tools/control-vacaciones/tarjetas")} 
                            tooltip="Tarjetas Generadas"
                            className={cn(
                                "transition-all duration-200 hover:translate-x-1",
                                pathname.startsWith("/tools/control-vacaciones/tarjetas") && "bg-gradient-to-r from-primary/10 to-transparent text-primary dark:text-indigo-300 font-semibold border-l-2 border-primary rounded-l-none"
                            )}
                        >
                            <span>
                                <Images className={pathname.startsWith("/tools/control-vacaciones/tarjetas") ? "text-primary" : ""} />
                                <span>Tarjetas Generadas</span>
                            </span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
    }


  const renderAdminNav = () => {
    const accessibleUserTools = customTools.filter(tool => user?.accessibleTools?.includes(tool.id));
    
    // Main tools view as a grid of cards
    if (pathname === '/tools') {
      return (
        <div className="p-4 space-y-4">
          <SidebarGroupLabel>HERRAMIENTAS</SidebarGroupLabel>
          <div className="grid grid-cols-2 gap-3">
            {accessibleUserTools.map((tool) => (
              <Link href={tool.href} key={tool.id} className="group">
                <Card 
                  className="h-full flex flex-col items-center justify-center text-center p-3 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg hover:border-primary"
                >
                  <CardHeader className="p-2">
                    <div 
                      className="p-3 rounded-lg w-fit transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${tool.color}1A`}}
                    >
                      <tool.icon className="h-6 w-6" style={{ color: tool.color }}/>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-xs font-semibold leading-tight">{tool.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <SidebarSeparator />
          <SidebarGroupLabel>AJUSTES</SidebarGroupLabel>
           <SidebarMenu>
              <SidebarMenuItem>
                <Link href="/settings/users">
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/users')} tooltip="Gestionar Usuarios">
                        <span><Users /><span>Gestionar Usuarios</span></span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/settings/company-profile">
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/company-profile')} tooltip="Perfil de Empresa">
                         <span><Briefcase /><span>Perfil de Empresa</span></span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <Link href="/settings/compensations">
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/compensations')} tooltip="Gestionar Compensaciones">
                         <span><HandCoins /><span>Gestionar Compensaciones</span></span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <Link href="/settings/payroll-history">
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/payroll-history')} tooltip="Historial de Nómina">
                         <span><History /><span>Historial de Nómina</span></span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          </SidebarMenu>
        </div>
      );
    }

    // Default list view for sub-pages
    return (
        <>
            <SidebarGroup>
                <SidebarGroupLabel>HERRAMIENTAS</SidebarGroupLabel>
                <SidebarMenu>
                    {accessibleUserTools.map((item) => (
                        <SidebarMenuItem key={item.id}>
                            <Link href={item.href}>
                                <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} tooltip={item.name}>
                                    <span>
                                        <item.icon />
                                        <span>{item.name}</span>
                                    </span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
            <SidebarSeparator />
            <SidebarGroup>
                <SidebarGroupLabel>AJUSTES</SidebarGroupLabel>
                <SidebarMenu>
                      <SidebarMenuItem>
                        <Link href="/settings/users">
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/users')} tooltip="Gestionar Usuarios">
                                <span>
                                    <Users />
                                    <span>Gestionar Usuarios</span>
                                </span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/settings/company-profile">
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/company-profile')} tooltip="Perfil de Empresa">
                                <span>
                                    <Briefcase />
                                    <span>Perfil de Empresa</span>
                                </span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/settings/compensations">
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/compensations')} tooltip="Gestionar Compensaciones">
                                 <span><HandCoins /><span>Gestionar Compensaciones</span></span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/settings/payroll-history">
                            <SidebarMenuButton asChild isActive={pathname.startsWith('/settings/payroll-history')} tooltip="Historial de Nómina">
                                 <span><History /><span>Historial de Nómina</span></span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>
        </>
    )
  }

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

  if (user?.isSuperAdmin) {
    return (
        <SidebarMenu>
            {renderNavItems(superAdminNavItems)}
        </SidebarMenu>
    );
  }
  
  return renderAdminNav();

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
  const [customTools, setCustomTools] = React.useState<Tool[]>([]);

  React.useEffect(() => {
    const updateTools = () => setCustomTools(getCustomizedTools());
    window.addEventListener('storage', updateTools);
    updateTools(); // Initial call to set names
    return () => window.removeEventListener('storage', updateTools);
  }, []);

  if (!user) {
    return <>{children}</>
  }
  
  const isCarteraVencidaPath = pathname.startsWith('/tools/overdue-portfolio');
  const isDailyControlPath = pathname.startsWith('/tools/daily-control');
  const isLoanControlPath = pathname.startsWith('/tools/loan-control');
  const isIncomeExpensesPath = pathname.startsWith('/tools/income-expenses');
  const isFlujoPath = pathname.startsWith('/tools/flujo');
  const isMensualesPath = pathname.startsWith('/tools/mensuales');
  const isRegistroOficinaPath = pathname.startsWith('/tools/registro-oficina');
  const isVisorAppPath = pathname.startsWith('/tools/visor-app');
  const isConcentradoPath = pathname.startsWith('/tools/concentrado');
  const isControlVacacionesPath = pathname.startsWith('/tools/control-vacaciones');
  const isImprentaPath = pathname.startsWith('/tools/imprenta');
  
  const getToolFromPath = () => {
    if (isCarteraVencidaPath) return customTools.find(tool => tool.id === 'cartera-vencida');
    if (isDailyControlPath) return customTools.find(tool => tool.id === 'daily-control');
    if (isLoanControlPath) return customTools.find(tool => tool.id === 'loan-control');
    if (isIncomeExpensesPath) return customTools.find(tool => tool.id === 'income-expenses');
    if (isFlujoPath) return customTools.find(tool => tool.id === 'flujo');
    if (isMensualesPath) return customTools.find(tool => tool.id === 'mensuales');
    if (isRegistroOficinaPath) return customTools.find(tool => tool.id === 'registro-oficina');
    if (isVisorAppPath) return customTools.find(tool => tool.id === 'visor-app');
    if (isConcentradoPath) return customTools.find(tool => tool.id === 'concentrado');
    if (isControlVacacionesPath) return customTools.find(tool => tool.id === 'control-vacaciones');
    if (isImprentaPath) return customTools.find(tool => tool.id === 'imprenta');
    return null;
  }

  const currentTool = getToolFromPath();
  
  const getUserRoleLabel = () => {
    if (user.isSuperAdmin && !impersonation) return 'Financieras MX';
    if (user.isToolAdmin) return 'Admin de Ferramenta';
    if (user.isPlazaUser) return 'Usuario de Plaza';
    return 'Admin';
  }

  const getUsernameDisplay = () => {
    if (!user) return "";
    if (user.prefix && !user.username.startsWith(user.prefix)) {
        return `${user.prefix}.${user.username}`;
    }
    return user.username;
  }

  const showBackButton = (pathname !== '/tools') && (isCarteraVencidaPath || isDailyControlPath || isLoanControlPath || isIncomeExpensesPath || isFlujoPath || isMensualesPath || isRegistroOficinaPath || isVisorAppPath || isConcentradoPath || isControlVacacionesPath || isImprentaPath) && !user.isSuperAdmin;
  
  const isGlobalAdmin = !user.isSuperAdmin && !user.isToolAdmin && !user.isPlazaUser;


  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3 p-2">
            <Link href="/" className="flex items-center gap-3">
              <UserCog className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">
                  {getUsernameDisplay()}
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
           <div className="flex-1 flex flex-col">
              <NavLinks customTools={customTools} />
           </div>
           
           {!user.isSuperAdmin && (
             <>
                <SidebarSeparator />
                <SidebarMenu>
                <SidebarMenuItem>
                    <Link href="/support">
                    <SidebarMenuButton asChild tooltip="Soporte" isActive={pathname === '/support'}>
                        <span>
                            <LifeBuoy />
                            <span>Soporte</span>
                        </span>
                    </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
                </SidebarMenu>
             </>
           )}

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
      <SidebarInset className={cn(impersonation && "pt-12", "bg-slate-50/50 dark:bg-slate-950/20")}>
        <ImpersonationBar />
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-4 lg:h-[60px] lg:px-6 transition-all duration-300">
          <SidebarTrigger />
           <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform">
                <Link href="/tools">
                    <Home className="mr-2 h-4 w-4" />
                    Inicio
                </Link>
            </Button>
          <div className="flex-1" />
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="flex items-center gap-2 rounded-md h-10 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block">{user.name}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <p>Mi Cuenta</p>
                <p className="text-xs text-muted-foreground font-normal">{getUserRoleLabel()}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isGlobalAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/users">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Gestionar Usuarios</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/company-profile">
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>Perfil de Empresa</span>
                    </Link>
                  </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                    <Link href="/settings/compensations">
                      <HandCoins className="mr-2 h-4 w-4" />
                      <span>Gestionar Compensaciones</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings/payroll-history">
                        <History className="mr-2 h-4 w-4" />
                        <span>Historial de Nómina</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
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
