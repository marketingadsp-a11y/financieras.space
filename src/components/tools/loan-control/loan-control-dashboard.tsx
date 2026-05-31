"use client";

import * as React from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/auth-context";
import type { Plaza, LoanControlPermission } from "@/lib/data";
import { getPlazas, updatePlaza } from "@/services/plaza-service";
import { clearDataByPrefix } from "@/services/loan-control-service";
import { Loader2, Building, ArrowRight, Upload, FileUp, DollarSign, Target, TrendingUp, TrendingDown, CalendarIcon, FilterX, MoreHorizontal, Trash2, Search, FileSpreadsheet, FileText, Edit, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { processAndImportLoanData } from "@/ai/flows/full-loan-data-parser-flow";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { PlazaEditDialog } from "./plaza-edit-dialog";
import { RecallDialog } from "./recall-dialog";


const PlazaCard = ({ plaza, onEdit, canEdit }: { plaza: Plaza, onEdit: (plaza: Plaza) => void, canEdit: boolean }) => {
    return (
        <Card className="premium-card group flex flex-col overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-indigo-500 opacity-80" />
            <CardHeader className="p-3 pb-1.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                            <Building className="h-4 w-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-xs font-bold leading-tight tracking-tight text-slate-800 dark:text-slate-100 truncate">{plaza.name}</CardTitle>
                            <CardDescription className="text-[10px] text-muted-foreground truncate">Prefijo: {plaza.prefix}</CardDescription>
                        </div>
                    </div>
                    {canEdit && (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg opacity-50 hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glassmorphic">
                                <DropdownMenuItem onSelect={() => onEdit(plaza)} className="cursor-pointer text-xs">
                                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Editar Nombre
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 px-3 pb-3 pt-0">
                <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-500 tracking-wider flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500"/> PRESTADO</span>
                        <p className="text-xs font-extrabold tracking-tight mt-0.5">${(plaza.totalLoanAmount || 0).toLocaleString('es-MX')}</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-900/40 p-1.5 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-500 tracking-wider flex items-center gap-1"><TrendingDown className="h-3 w-3 text-rose-500"/> PENDIENTE</span>
                        <p className="text-xs font-extrabold tracking-tight text-rose-600 dark:text-rose-455 mt-0.5">${(plaza.pendingDebt || 0).toLocaleString('es-MX')}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-1.5 border-t bg-slate-50/30 dark:bg-slate-900/10 px-3">
                <Button asChild className="w-full justify-between hover:bg-primary/5 hover:text-primary transition-all duration-300 rounded-lg h-7 text-[10px]" variant="ghost" size="sm">
                    <Link href={`/tools/loan-control/plaza/${plaza.id}`}>
                        <span className="font-bold">Administrar Plaza</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
};

const StatCard = ({ title, value, icon: Icon, colorClass }: { title: string; value: number | undefined; icon: React.ElementType; colorClass: string }) => (
    <Card className="premium-card overflow-hidden relative p-3">
      <div className={cn("absolute top-0 left-0 w-1 h-full", colorClass)} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="text-lg font-black tracking-tight text-slate-850 dark:text-slate-150 mt-0.5">
              ${(value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground opacity-70" />
        </div>
      </div>
    </Card>
);


export function LoanControlDashboard() {
    const { user, hasPermission } = useAuth();
    const { toast } = useToast();
    const [plazas, setPlazas] = React.useState<Plaza[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isImportModalOpen, setImportModalOpen] = React.useState(false);
    const [isRecallModalOpen, setRecallModalOpen] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [importMode, setImportMode] = React.useState<'add' | 'replace'>('add');
    const [isImporting, setIsImporting] = React.useState(false);
    const [startDate, setStartDate] = React.useState<Date | undefined>();
    const [endDate, setEndDate] = React.useState<Date | undefined>();
    const [searchTerm, setSearchTerm] = React.useState("");
    const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
    const [editingPlaza, setEditingPlaza] = React.useState<Plaza | null>(null);

    const [summary, setSummary] = React.useState({ 
        totalDebt: 0, 
        totalClients: 0, 
        recoveredClients: 0, 
        recoveryRate: 0, 
        totalLoaned: 0 
    });


    const fetchPlazasForUser = React.useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const shouldFetchAll = user.isSuperAdmin || user.isToolAdmin;
            const plazasFromDb = await getPlazas({ prefix: user.prefix, fetchAll: shouldFetchAll, startDate, endDate, toolContext: 'loan-control' });
            const sortedPlazas = [...plazasFromDb].sort((a, b) => a.name.localeCompare(b.name, 'es'));
            setPlazas(sortedPlazas);

            // Update summary stats based on current filters
            const totalLoaned = plazasFromDb.reduce((acc, p) => acc + (p.totalLoanAmount || 0), 0);
            const totalDebt = plazasFromDb.reduce((acc, p) => acc + (p.pendingDebt || 0), 0);
            setSummary(prev => ({ ...prev, totalLoaned, totalDebt }));

        } catch (error) {
            console.error("Failed to fetch plazas", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las plazas.' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast, startDate, endDate]);

    React.useEffect(() => {
        fetchPlazasForUser();
    }, [fetchPlazasForUser]);
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!selectedFile) {
            toast({ variant: "destructive", title: "Error", description: "Por favor, selecciona un archivo de Excel." });
            return;
        }
        if (!user?.prefix) {
            toast({ variant: "destructive", title: "Error", description: "No tienes un prefijo asignado para importar datos." });
            return;
        }
        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileContent = e.target?.result as string;
                const base64Content = fileContent.split(',')[1];

                const result = await processAndImportLoanData({
                    fileContentBase64: base64Content,
                    importMode,
                    prefix: user.prefix!,
                });

                if (result.success) {
                    toast({ title: "Éxito", description: result.message });
                    await fetchPlazasForUser();
                    setImportModalOpen(false);
                } else {
                    toast({ variant: "destructive", title: "Error de Importación", description: result.message });
                }
                 setIsImporting(false);
            };
            reader.onerror = () => {
                toast({ variant: "destructive", title: "Error de Archivo", description: "No se pudo leer el archivo seleccionado." });
                setIsImporting(false);
            }
            reader.readAsDataURL(selectedFile);

        } catch (error) {
            toast({ variant: "destructive", title: "Error de Importación", description: "Ocurrió un error inesperado al iniciar la importación." });
            setIsImporting(false);
        }
    };
    
    const handleDeleteAllData = async () => {
        if (!user?.prefix) return;
        try {
            await clearDataByPrefix(user.prefix);
            toast({
                title: "Éxito",
                description: "Todos los datos de Control de Préstamo han sido eliminados.",
            });
            await fetchPlazasForUser();
            setDeleteConfirmationText('');
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron eliminar los datos.",
            });
        }
    };

    const handleUpdatePlaza = async (id: string, newName: string) => {
        try {
            await updatePlaza(id, { name: newName });
            toast({ title: "Éxito", description: "Nombre de la plaza actualizado."});
            setEditingPlaza(null);
            fetchPlazasForUser(); // Refresh data
            return true;
        } catch (error) {
             toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la plaza."});
             return false;
        }
    };

    const filteredPlazas = React.useMemo(() => {
        return plazas.filter(plaza => 
            plaza.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [plazas, searchTerm]);

    const filteredSummary = React.useMemo(() => {
        return filteredPlazas.reduce((acc, plaza) => {
            acc.totalLoaned += plaza.totalLoanAmount || 0;
            acc.totalDue += plaza.pendingDebt || 0;
            return acc;
        }, { totalLoaned: 0, totalDue: 0 });
    }, [filteredPlazas]);
    
    const clearFilters = () => {
        setStartDate(undefined);
        setEndDate(undefined);
        setSearchTerm("");
    }
    
    const getDateRangeString = () => {
        if (startDate && endDate) return `Del ${format(startDate, 'dd/MM/yyyy')} al ${format(endDate, 'dd/MM/yyyy')}`;
        if (startDate) return `Desde ${format(startDate, 'dd/MM/yyyy')}`;
        if (endDate) return `Hasta ${format(endDate, 'dd/MM/yyyy')}`;
        return 'Todas las fechas';
    }

    const exportToPDF = () => {
        if (filteredPlazas.length === 0) return;

        // Separate active and inactive plazas
        const activePlazas = filteredPlazas.filter(p => (p.totalLoanAmount || 0) > 0 || (p.pendingDebt || 0) > 0);
        const inactivePlazas = filteredPlazas.filter(p => (p.totalLoanAmount || 0) === 0 && (p.pendingDebt || 0) === 0);

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
        doc.text(`Rango de Fechas: ${getDateRangeString()}`, 20, 31);
        
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
        doc.text(`${activePlazas.length} de ${filteredPlazas.length}`, 14 + (cardWidth * 2) + 12, cardY + 14);

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
        if (filteredPlazas.length === 0) return;
        const dataToExport = filteredPlazas.map(p => ({
            'Plaza': p.name,
            'Prefijo': p.prefix,
            'Total Prestado': p.totalLoanAmount,
            'Deuda Pendiente': p.pendingDebt,
        }));
        
        const worksheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(worksheet, [['Resumen de Plazas - Control de Préstamo']], { origin: 'A1' });
        XLSX.utils.sheet_add_aoa(worksheet, [[`Rango de Fechas: ${getDateRangeString()}`]], { origin: 'A2' });

        XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A4' });

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen de Plazas");
        const fileName = `Resumen_Plazas_Control_Prestamo_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const canEditPlazaNames = hasPermission('loan-control', 'CAN_EDIT_PLAZA_NAMES');
    const canDeleteAllData = hasPermission('loan-control', 'CAN_DELETE_ALL_DATA');
    const isFortunaAdmin = user?.prefix === 'fortuna' && user?.username === 'admin';

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Cargando plazas...</span>
            </div>
        );
    }
    
    const expectedConfirmationText = "ELIMINAR TODO";
  
    return (
        <div className="space-y-4">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gradient">Control de Préstamos</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Gestiona y organiza clientes en carteras, grupos y plazas de forma ágil y visual.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                     {isFortunaAdmin && (
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setRecallModalOpen(true)}
                            className="h-8 text-xs border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-all duration-200"
                        >
                            <RefreshCcw className="mr-1.5 h-3.5 w-3.5 animate-spin-hover" /> Recall
                        </Button>
                     )}
                     <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-8 text-xs bg-gradient-to-r from-primary to-indigo-650 hover:from-primary/95 hover:to-indigo-650/95 text-white shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:translate-y-[-1px] transition-all duration-300">
                                <Upload className="mr-1.5 h-3.5 w-3.5" /> Importar
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xl glassmorphic border-white/20 dark:border-slate-800/40">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                    Importación Masiva
                                </DialogTitle>
                                <DialogDescriptionComponent className="text-xs text-muted-foreground mt-2">
                                  Selecciona un archivo de Excel (`.xlsx`, `.xls`) para una importación completa.
                                  Las columnas deben tener encabezados como: Plaza, Cartera, Grupo, Nombre, Prestamo, etc.
                                </DialogDescriptionComponent>
                            </DialogHeader>
                            <div className="grid gap-5 py-4">
                                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/30 p-3.5 rounded-xl border border-slate-150/40 dark:border-slate-800/40">
                                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-355 tracking-wide">MODO DE IMPORTACIÓN</Label>
                                  <RadioGroup defaultValue="add" value={importMode} onValueChange={(value) => setImportMode(value as any)} className="flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                                      <RadioGroupItem value="add" id="r1" className="text-primary border-slate-300 dark:border-slate-700" />
                                      <Label htmlFor="r1" className="text-xs font-medium cursor-pointer">Añadir a existentes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-950 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800 flex-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                                      <RadioGroupItem value="replace" id="r2" className="text-rose-500 border-slate-300 dark:border-slate-700" />
                                      <Label htmlFor="r2" className="text-xs font-medium cursor-pointer text-rose-650 dark:text-rose-450">Reemplazar datos</Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="excel-file" className="text-xs font-bold text-slate-700 dark:text-slate-355 tracking-wide">ARCHIVO DE EXCEL</Label>
                                    <Input 
                                        id="excel-file"
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileChange}
                                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:ring-1 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setImportModalOpen(false)} className="border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900">Cancelar</Button>
                                <Button 
                                    onClick={handleImport} 
                                    disabled={isImporting || !selectedFile}
                                    className="bg-gradient-to-r from-primary to-indigo-650 text-white"
                                >
                                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4"/>}
                                    {isImporting ? 'Importando...' : 'Importar Archivo'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToExcel} 
                        disabled={filteredPlazas.length === 0}
                        className="h-8 text-xs border-slate-200 dark:border-slate-850 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                        <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={exportToPDF} 
                        disabled={filteredPlazas.length === 0}
                        className="h-8 text-xs border-slate-200 dark:border-slate-855 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
                    >
                        <FileText className="mr-1.5 h-3.5 w-3.5 text-rose-600 dark:text-rose-455" /> PDF
                    </Button>
                    {canDeleteAllData && (
                         <AlertDialog>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="glassmorphic">
                                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground tracking-wider">MÁS OPCIONES</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer text-xs" onSelect={e => e.preventDefault()}>
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    Eliminar Datos
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <AlertDialogContent className="glassmorphic border-white/20 dark:border-slate-800/40">
                                <AlertDialogHeader>
                                    <AlertDialogTitleComponent className="text-lg font-bold text-slate-800 dark:text-slate-100">¿Estás absolutamente seguro?</AlertDialogTitleComponent>
                                    <AlertDialogDescription className="text-sm text-muted-foreground">
                                        Esta acción es irreversible y eliminará permanentemente <strong>TODAS</strong> las plazas, carteras, grupos y clientes de Control de Préstamo para el prefijo <strong>{user?.prefix}</strong>.
                                        Para confirmar, escribe <strong className="text-foreground">{expectedConfirmationText}</strong>.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Input
                                value={deleteConfirmationText}
                                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                placeholder={expectedConfirmationText}
                                className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-rose-500 focus-visible:ring-1"
                                autoFocus
                                />
                                <AlertDialogFooterComponent>
                                <AlertDialogCancel onClick={() => setDeleteConfirmationText('')} className="border-slate-200 dark:border-slate-800">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleDeleteAllData}
                                    disabled={deleteConfirmationText !== expectedConfirmationText}
                                    className="bg-destructive hover:bg-destructive/90 text-white"
                                >
                                    Sí, eliminar todo
                                </AlertDialogAction>
                                </AlertDialogFooterComponent>
                            </AlertDialogContent>
                            </AlertDialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <StatCard title="Total Prestado (Filtrado)" value={filteredSummary.totalLoaned} icon={TrendingUp} colorClass="bg-gradient-to-b from-indigo-500 to-indigo-650" />
                <StatCard title="Total Pendiente (Filtrado)" value={filteredSummary.totalDue} icon={TrendingDown} colorClass="bg-gradient-to-b from-rose-500 to-rose-600" />
            </div>

            <Card className="premium-card bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-100 dark:border-slate-800/80 p-3">
                <div className="flex flex-col lg:flex-row gap-2 items-center">
                    <div className="relative flex-grow w-full glowing-border rounded-lg">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-550" />
                        <Input
                            placeholder="Buscar por nombre de plaza..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-8 text-xs w-full bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:ring-1 focus-visible:ring-offset-0"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date-start"
                                variant={"outline"}
                                className={cn("w-full sm:w-[130px] h-8 justify-start text-left font-medium bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-[11px]", !startDate && "text-muted-foreground")}
                                >
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-slate-455 dark:text-slate-500" />
                                {startDate ? format(startDate, "dd/MM/yyyy") : <span>Fecha inicio</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 glassmorphic border-slate-100 dark:border-slate-855" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                id="date-end"
                                variant={"outline"}
                                className={cn("w-full sm:w-[130px] h-8 justify-start text-left font-medium bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-[11px]", !endDate && "text-muted-foreground")}
                                >
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-slate-455 dark:text-slate-500" />
                                {endDate ? format(endDate, "dd/MM/yyyy") : <span>Fecha fin</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 glassmorphic border-slate-100 dark:border-slate-855" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Button 
                            variant="ghost" 
                            onClick={clearFilters}
                            className="h-8 text-xs text-slate-500 hover:text-rose-500 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 px-2.5 transition-all duration-200 shrink-0"
                        >
                            <FilterX className="mr-1.5 h-3.5 w-3.5" />
                            Limpiar
                        </Button>
                    </div>
                </div>
            </Card>


            {filteredPlazas.length > 0 ? (
                 <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {filteredPlazas.map(plaza => (
                        <PlazaCard key={plaza.id} plaza={plaza} onEdit={setEditingPlaza} canEdit={canEditPlazaNames}/>
                    ))}
                </div>
            ) : (
                <Card className="premium-card border-dashed bg-slate-50/20 dark:bg-slate-900/10">
                    <CardContent className="pt-8 pb-8">
                        <p className="text-center text-sm text-muted-foreground">
                            {plazas.length > 0 ? "No se encontraron plazas que coincidan con los filtros de búsqueda." : "No hay plazas disponibles en esta cuenta. Importa datos desde un archivo de Excel para comenzar."}
                        </p>
                    </CardContent>
                </Card>
            )}

            <PlazaEditDialog
                plaza={editingPlaza}
                isOpen={!!editingPlaza}
                onClose={() => setEditingPlaza(null)}
                onSave={handleUpdatePlaza}
            />

            {isFortunaAdmin && (
                <RecallDialog
                    isOpen={isRecallModalOpen}
                    onClose={() => setRecallModalOpen(false)}
                    plazas={plazas}
                    onSuccess={fetchPlazasForUser}
                />
            )}
        </div>
    );
}
